import { createHash, createPublicKey, randomBytes, type JsonWebKey } from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import ms from "../../shared/utils/ms";
import type { LoginInput, RegisterInput } from "@slotix/validation";
import { matchBusinessCategory, type AuthTokensDTO, type LoginResponse, type UserDTO } from "@slotix/types";
import { env } from "../../config/env";
import { AppError, AuthenticationError, ConflictError, ValidationError } from "../../shared/errors";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../shared/utils/jwt";
import { authRepository } from "./auth.repository";
import type { AppleAuthInput, GoogleAuthInput, GoogleMobileExchangeInput, GoogleMobileStartInput } from "./auth.schema";

const GOOGLE_CALLBACK_PATH = "/api/auth/google/callback";

function googleCredentials(): { clientId: string; clientSecret: string } {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new AppError("GOOGLE_NOT_CONFIGURED", "O login com Google não está configurado no servidor.", 503);
  }
  return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
}

// The code Google hands out is only useful to whoever it is redirected to, so the redirect
// must be the dashboard's own callback — never an address the caller made up. Outside
// development the origin has to be one the API already trusts (WEB_URL / CORS_ORIGINS).
function assertTrustedRedirect(redirectUri: string): void {
  const url = new URL(redirectUri);
  const trusted = [env.WEB_URL, ...(env.CORS_ORIGINS?.split(",") ?? [])]
    .map((origin) => origin?.trim().replace(/\/$/, ""))
    .filter(Boolean);

  const originAllowed = env.NODE_ENV === "development" || trusted.includes(url.origin);
  if (!originAllowed || url.pathname !== GOOGLE_CALLBACK_PATH || url.search || url.hash) {
    throw new ValidationError("redirectUri não é um endereço de retorno autorizado.", "GOOGLE_REDIRECT_NOT_ALLOWED");
  }
}

const GOOGLE_MOBILE_CALLBACK_PATH = "/api/v1/auth/google/mobile/callback";
const APPLE_MOBILE_CALLBACK_PATH = "/api/v1/auth/apple/mobile/callback";
const MOBILE_STATE_AUDIENCE = "google-mobile-state";
const APPLE_STATE_AUDIENCE = "apple-mobile-state";
const MOBILE_HANDOFF_AUDIENCE = "google-mobile-handoff";

// What the app's browser flows carry through the provider and back, signed by this API.
interface MobileState {
  mode: "login" | "register";
  returnUrl: string;
  redirectUri: string;
  challenge: string;
}

// The deep link back into the app, carrying either a handoff or an error code.
function appReturnUrl(returnUrl: string, params: Record<string, string>): string {
  const url = new URL(returnUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

// Short-lived and useless without the verifier the app kept (see googleMobileExchange).
function signHandoff(userId: string, challenge: string): string {
  return jwt.sign({ sub: userId, challenge }, env.JWT_ACCESS_SECRET, { audience: MOBILE_HANDOFF_AUDIENCE, expiresIn: "2m" });
}

// The session is handed to whatever this link opens, so it must be the app itself: its own
// scheme, or Expo Go's while developing.
function assertAppReturnUrl(returnUrl: string): void {
  const schemes = [env.MOBILE_APP_SCHEME ?? "slotix", ...(env.NODE_ENV === "development" ? ["exp"] : [])];
  if (!schemes.some((scheme) => returnUrl.startsWith(`${scheme}://`))) {
    throw new ValidationError("returnUrl não é um endereço da aplicação.", "GOOGLE_RETURN_URL_NOT_ALLOWED");
  }
}

/*
 * Google and Apple both vouch for an email address; the account is the one with that
 * email. "login" never creates anything — an address that isn't registered is refused, so
 * nobody ends up with an account they didn't ask for. "register" creates the account: a
 * customer, or (from the dashboard, which sends the business) an owner with their space.
 */
async function signInByVerifiedEmail(
  profile: { email: string; name: string; picture?: string },
  mode: "login" | "register",
  business?: { company: string; category: string },
) {
  if (mode === "login") {
    const user = await authRepository.findUserByEmail(profile.email);
    if (!user) throw new AuthenticationError("Esta conta ainda não está registada. Crie uma conta primeiro.", "SOCIAL_NOT_REGISTERED");
    // An account without a photo takes the Google one; a photo the person chose stays.
    if (!user.avatarUrl && profile.picture) return authRepository.setAvatarUrl(user.id, profile.picture);
    return user;
  }

  const existing = await authRepository.findAnyByEmail(profile.email);
  if (existing) throw new ConflictError("Este email já está registado.", "EMAIL_ALREADY_REGISTERED");

  // No password was chosen: a random one nobody knows keeps email+password login closed
  // for this account until a password is set some other way.
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
  const account = { name: profile.name, email: profile.email, passwordHash, avatarUrl: profile.picture };

  return business ? authRepository.createOwnerWithBusiness({ ...account, ...business }) : authRepository.createUser(account);
}

// Apple's signing keys change rarely; fetched once an hour at most.
let appleKeys: { fetchedAt: number; keys: (JsonWebKey & { kid?: string })[] } | null = null;

async function appleSigningKey(kid: string) {
  if (!appleKeys || Date.now() - appleKeys.fetchedAt > 60 * 60_000 || !appleKeys.keys.some((key) => key.kid === kid)) {
    const response = await fetch("https://appleid.apple.com/auth/keys");
    if (!response.ok) throw new Error(`Apple respondeu ${response.status} ao pedido das chaves.`);
    appleKeys = { fetchedAt: Date.now(), keys: ((await response.json()) as { keys: (JsonWebKey & { kid?: string })[] }).keys };
  }

  const key = appleKeys.keys.find((candidate) => candidate.kid === kid);
  return key ? createPublicKey({ key, format: "jwk" }) : null;
}

// Checks that the token really was issued by Apple, for this app, and returns its email.
// `audiences` is who the token must have been issued for; `nonce`, when given, ties it to
// one sign-in this API started (the browser flow).
async function verifyAppleIdentityToken(identityToken: string, audiences: string[], nonce?: string): Promise<string> {
  const failed = new AuthenticationError("Não foi possível validar a conta Apple.", "APPLE_TOKEN_INVALID");

  const kid = jwt.decode(identityToken, { complete: true })?.header.kid;
  if (!kid) throw failed;

  const key = await appleSigningKey(kid).catch((error) => {
    console.error("Apple: não foi possível obter as chaves.", error);
    return null;
  });
  if (!key) throw failed;

  let claims: { email?: string; email_verified?: boolean | string; nonce?: string };
  try {
    claims = jwt.verify(identityToken, key, {
      algorithms: ["RS256"],
      issuer: "https://appleid.apple.com",
      audience: audiences as [string, ...string[]],
    }) as typeof claims;
  } catch {
    throw failed;
  }
  if (nonce && claims.nonce !== nonce) throw failed;

  if (!claims.email || String(claims.email_verified) !== "true") {
    throw new AuthenticationError("A Apple não confirmou o email desta conta.", "APPLE_EMAIL_NOT_VERIFIED");
  }
  return claims.email.trim().toLowerCase();
}

interface GoogleProfile {
  email: string;
  name: string;
  picture?: string;
}

// Trades the one-time code for the account's profile. Any failure on Google's side is
// reported as the same error: the caller can only ask the user to try again.
async function fetchGoogleProfile(code: string, redirectUri: string): Promise<GoogleProfile> {
  const { clientId, clientSecret } = googleCredentials();
  const failed = new AuthenticationError("Não foi possível validar a conta Google.", "GOOGLE_EXCHANGE_FAILED");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  }).catch(() => null);

  if (!tokenResponse?.ok) {
    // Google's reason (invalid_client, redirect_uri_mismatch, invalid_grant…) is what tells
    // a wrong secret from a wrong redirect URI, so it goes to the server log.
    console.error("Google OAuth: troca do código falhou:", tokenResponse ? await tokenResponse.text() : "sem resposta");
    throw failed;
  }

  const tokens = (await tokenResponse.json()) as { access_token?: string };
  if (!tokens.access_token) throw failed;

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  }).catch(() => null);
  if (!profileResponse?.ok) throw failed;

  const profile = (await profileResponse.json()) as { email?: string; email_verified?: boolean; name?: string; picture?: string };
  if (!profile.email) throw failed;

  // The account is matched by email, so an address Google hasn't confirmed proves nothing.
  if (profile.email_verified !== true) {
    throw new AuthenticationError("O Google não confirmou o email desta conta.", "GOOGLE_EMAIL_NOT_VERIFIED");
  }

  const email = profile.email.trim().toLowerCase();
  return { email, name: profile.name?.trim() || email.split("@")[0], picture: profile.picture };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toUserDTO(user: {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserDTO["role"];
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: Date | null;
  createdAt: Date;
}): UserDTO {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
    latitude: user.latitude,
    longitude: user.longitude,
    locationUpdatedAt: user.locationUpdatedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function issueTokens(user: { id: string; role: UserDTO["role"] }): Promise<AuthTokensDTO> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, role: user.role });

  await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRES_IN)),
  });

  return { accessToken, refreshToken };
}

export const authService = {
  async register(input: RegisterInput): Promise<LoginResponse> {
    const existing = await authRepository.findAnyByEmail(input.email);
    if (existing) {
      throw new ConflictError("Este email já está registado.", "EMAIL_ALREADY_REGISTERED");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await authRepository.createUser({
      name: input.name,
      email: input.email,
      passwordHash,
      phone: input.phone,
    });

    const tokens = await issueTokens(user);
    return { ...tokens, user: toUserDTO(user) };
  },

  async login(input: LoginInput): Promise<LoginResponse> {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user) {
      throw new AuthenticationError();
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new AuthenticationError();
    }

    const tokens = await issueTokens(user);
    return { ...tokens, user: toUserDTO(user) };
  },

  // The address the dashboard sends the browser to, to pick a Google account.
  googleAuthorizationUrl(redirectUri: string, state: string): string {
    const { clientId } = googleCredentials();
    assertTrustedRedirect(redirectUri);

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      prompt: "select_account",
      state,
    }).toString();
    return url.toString();
  },

  async googleSignIn(input: GoogleAuthInput): Promise<LoginResponse> {
    assertTrustedRedirect(input.redirectUri);

    // Checked before the code is spent: a code can only be exchanged once.
    const category = input.mode === "register" ? matchBusinessCategory(input.category) : null;
    if (input.mode === "register") {
      if (!input.company) throw new ValidationError("Indique o nome do espaço.", "COMPANY_REQUIRED");
      if (!category) throw new ValidationError("Escolha o tipo do seu espaço.", "CATEGORY_REQUIRED");
    }

    const profile = await fetchGoogleProfile(input.code, input.redirectUri);
    const business = input.mode === "register" ? { company: input.company!, category: category! } : undefined;
    const user = await signInByVerifiedEmail(profile, input.mode, business);

    const tokens = await issueTokens(user);
    return { ...tokens, user: toUserDTO(user) };
  },

  // App, step 1: the address to open in the phone's browser, and a secret only this
  // install knows, needed again in step 3.
  googleMobileStart(input: GoogleMobileStartInput, apiBaseUrl: string): { url: string; verifier: string } {
    const { clientId } = googleCredentials();
    assertAppReturnUrl(input.returnUrl);

    const redirectUri = `${apiBaseUrl}${GOOGLE_MOBILE_CALLBACK_PATH}`;
    const verifier = randomBytes(32).toString("hex");
    const state = jwt.sign(
      { mode: input.mode, returnUrl: input.returnUrl, redirectUri, challenge: hashToken(verifier) },
      env.JWT_ACCESS_SECRET,
      { audience: MOBILE_STATE_AUDIENCE, expiresIn: "10m" },
    );

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      prompt: "select_account",
      state,
    }).toString();
    return { url: url.toString(), verifier };
  },

  // App, step 2: Google sends the phone's browser here. Returns the deep link to send it
  // on to — back into the app, carrying either a short-lived handoff or an error code — or
  // null when the request didn't come from a flow this API started.
  async googleMobileCallback(query: { code?: string; state?: string; error?: string }): Promise<string | null> {
    let state: MobileState;
    try {
      state = jwt.verify(query.state ?? "", env.JWT_ACCESS_SECRET, { audience: MOBILE_STATE_AUDIENCE }) as MobileState;
    } catch {
      return null;
    }

    const back = (params: Record<string, string>) => appReturnUrl(state.returnUrl, params);

    if (query.error || !query.code) return back({ error: "GOOGLE_CANCELLED" });

    try {
      const profile = await fetchGoogleProfile(query.code, state.redirectUri);
      const user = await signInByVerifiedEmail(profile, state.mode);
      return back({ handoff: signHandoff(user.id, state.challenge) });
    } catch (error) {
      if (!(error instanceof AppError)) console.error("Google OAuth (app): falhou.", error);
      return back({ error: error instanceof AppError ? error.code : "GOOGLE_EXCHANGE_FAILED" });
    }
  },

  // App, step 3: the handoff from the deep link becomes a session — only for the install
  // that started the flow, which is the only one holding the verifier.
  async googleMobileExchange(input: GoogleMobileExchangeInput): Promise<LoginResponse> {
    const invalid = new AuthenticationError("A sessão expirou. Tente novamente.", "GOOGLE_HANDOFF_INVALID");

    let handoff: { sub: string; challenge: string };
    try {
      handoff = jwt.verify(input.handoff, env.JWT_ACCESS_SECRET, { audience: MOBILE_HANDOFF_AUDIENCE }) as typeof handoff;
    } catch {
      throw invalid;
    }
    if (handoff.challenge !== hashToken(input.verifier)) throw invalid;

    const user = await authRepository.findUserById(handoff.sub);
    if (!user) throw invalid;

    const tokens = await issueTokens(user);
    return { ...tokens, user: toUserDTO(user) };
  },

  // Apple without an iPhone (Android): the same three steps as Google's app flow, through
  // Apple's web page. Apple answers with a signed identity token posted straight to the
  // callback, so no client secret is involved — the token's nonce ties it to this request.
  appleMobileStart(input: GoogleMobileStartInput, apiBaseUrl: string): { url: string; verifier: string } {
    if (!env.APPLE_SERVICE_ID) {
      throw new AppError("APPLE_NOT_CONFIGURED", "O login com Apple não está configurado no servidor.", 503);
    }
    assertAppReturnUrl(input.returnUrl);

    const redirectUri = `${apiBaseUrl}${APPLE_MOBILE_CALLBACK_PATH}`;
    const verifier = randomBytes(32).toString("hex");
    const challenge = hashToken(verifier);
    const state = jwt.sign({ mode: input.mode, returnUrl: input.returnUrl, redirectUri, challenge } satisfies MobileState, env.JWT_ACCESS_SECRET, {
      audience: APPLE_STATE_AUDIENCE,
      expiresIn: "10m",
    });

    const url = new URL("https://appleid.apple.com/auth/authorize");
    url.search = new URLSearchParams({
      client_id: env.APPLE_SERVICE_ID,
      redirect_uri: redirectUri,
      response_type: "code id_token",
      // Asking for the name and email obliges Apple to answer with a form POST.
      response_mode: "form_post",
      scope: "name email",
      nonce: challenge,
      state,
    }).toString();
    return { url: url.toString(), verifier };
  },

  async appleMobileCallback(form: { id_token?: string; state?: string; error?: string; user?: string }): Promise<string | null> {
    let state: MobileState;
    try {
      state = jwt.verify(form.state ?? "", env.JWT_ACCESS_SECRET, { audience: APPLE_STATE_AUDIENCE }) as MobileState;
    } catch {
      return null;
    }

    const back = (params: Record<string, string>) => appReturnUrl(state.returnUrl, params);
    if (form.error || !form.id_token) return back({ error: "APPLE_CANCELLED" });

    try {
      const email = await verifyAppleIdentityToken(form.id_token, [env.APPLE_SERVICE_ID ?? ""], state.challenge);

      // Apple sends the person's name only the first time, as JSON in the `user` field.
      let name = "";
      try {
        const parsed = JSON.parse(form.user ?? "{}") as { name?: { firstName?: string; lastName?: string } };
        name = [parsed.name?.firstName, parsed.name?.lastName].filter(Boolean).join(" ").trim().slice(0, 120);
      } catch {
        // no name: falls back to the email's first part
      }

      const user = await signInByVerifiedEmail({ email, name: name || email.split("@")[0] }, state.mode);
      return back({ handoff: signHandoff(user.id, state.challenge) });
    } catch (error) {
      if (!(error instanceof AppError)) console.error("Apple (app, browser): falhou.", error);
      return back({ error: error instanceof AppError ? error.code : "APPLE_TOKEN_INVALID" });
    }
  },

  async appleSignIn(input: AppleAuthInput): Promise<LoginResponse> {
    // In development the app usually runs inside Expo Go, whose tokens are issued to it.
    const audiences = [
      ...env.APPLE_CLIENT_IDS.split(",").map((id) => id.trim()).filter(Boolean),
      ...(env.NODE_ENV === "development" ? ["host.exp.Exponent"] : []),
    ];
    const email = await verifyAppleIdentityToken(input.identityToken, audiences);
    const user = await signInByVerifiedEmail({ email, name: input.name || email.split("@")[0] }, input.mode);

    const tokens = await issueTokens(user);
    return { ...tokens, user: toUserDTO(user) };
  },

  async refresh(refreshToken: string): Promise<AuthTokensDTO> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AuthenticationError("Refresh token inválido ou expirado.");
    }

    const stored = await authRepository.findActiveRefreshToken(hashToken(refreshToken));
    if (!stored) {
      throw new AuthenticationError("Refresh token inválido, expirado ou revogado.");
    }

    const user = await authRepository.findUserById(payload.sub);
    if (!user) {
      throw new AuthenticationError();
    }

    await authRepository.revokeRefreshToken(stored.id);
    return issueTokens(user);
  },

  async logout(userId: string): Promise<void> {
    await authRepository.revokeAllUserRefreshTokens(userId);
  },
};
