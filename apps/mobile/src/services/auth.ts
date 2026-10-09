import * as AppleAuthentication from "expo-apple-authentication";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import type { LoginRequest, LoginResponse, RegisterRequest } from "@slotix/types";
import { ApiRequestError, apiFetch, setAccessToken } from "./api-client";

export async function login(input: LoginRequest): Promise<LoginResponse> {
  const result = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  await setAccessToken(result.accessToken);
  return result;
}

export async function register(input: RegisterRequest): Promise<LoginResponse> {
  const result = await apiFetch<LoginResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  await setAccessToken(result.accessToken);
  return result;
}

// "login" só entra numa conta que já existe; "register" cria-a. O servidor recusa o resto.
export type SocialMode = "login" | "register";

// O browser do sistema não existe na versão web da app.
export const googleSignInAvailable = Platform.OS !== "web";
export const appleSignInAvailable = Platform.OS !== "web";

/*
 * Entrar ou criar conta pela página da Google ou da Apple, aberta no browser do sistema.
 * No fim, a API devolve o browser à app com um código que só esta instalação consegue
 * trocar por uma sessão. Devolve null se a pessoa fechar o browser sem escolher uma conta.
 */
async function browserSignIn(provider: "google" | "apple", mode: SocialMode): Promise<LoginResponse | null> {
  // O ecrã (auth)/social.tsx recebe esta ligação quando o Android a entrega à navegação.
  const returnUrl = Linking.createURL("social");

  const { url, verifier } = await apiFetch<{ url: string; verifier: string }>(`/auth/${provider}/mobile/start`, {
    method: "POST",
    body: JSON.stringify({ mode, returnUrl }),
  });

  const outcome = await WebBrowser.openAuthSessionAsync(url, returnUrl);
  if (outcome.type !== "success") return null;

  const params = Linking.parse(outcome.url).queryParams ?? {};
  const error = typeof params.error === "string" ? params.error : null;
  if (error === "GOOGLE_CANCELLED" || error === "APPLE_CANCELLED") return null;
  if (error) throw new ApiRequestError(error, error, 400);

  const handoff = typeof params.handoff === "string" ? params.handoff : null;
  if (!handoff) throw new ApiRequestError("GOOGLE_EXCHANGE_FAILED", "GOOGLE_EXCHANGE_FAILED", 400);

  const result = await apiFetch<LoginResponse>(`/auth/${provider}/mobile/exchange`, {
    method: "POST",
    body: JSON.stringify({ handoff, verifier }),
  });
  await setAccessToken(result.accessToken);
  return result;
}

export function signInWithGoogle(mode: SocialMode): Promise<LoginResponse | null> {
  return browserSignIn("google", mode);
}

/**
 * Entrar ou criar conta com a Apple. No iPhone/iPad usa o ecrã do próprio sistema (Face ID);
 * no Android, onde isso não existe, a página da Apple no browser. Devolve null se a pessoa
 * cancelar.
 */
export async function signInWithApple(mode: SocialMode): Promise<LoginResponse | null> {
  const native = Platform.OS === "ios" && (await AppleAuthentication.isAvailableAsync().catch(() => false));
  if (!native) return browserSignIn("apple", mode);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (error) {
    if ((error as { code?: string }).code === "ERR_REQUEST_CANCELED") return null;
    throw error;
  }

  if (!credential.identityToken) throw new ApiRequestError("APPLE_TOKEN_INVALID", "APPLE_TOKEN_INVALID", 400);

  // A Apple só diz o nome da primeira vez que a pessoa autoriza a app.
  const name = credential.fullName ? AppleAuthentication.formatFullName(credential.fullName).trim() : "";

  const result = await apiFetch<LoginResponse>("/auth/apple", {
    method: "POST",
    body: JSON.stringify({ identityToken: credential.identityToken, mode, ...(name ? { name } : {}) }),
  });
  await setAccessToken(result.accessToken);
  return result;
}
