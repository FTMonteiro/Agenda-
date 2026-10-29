import { createHmac, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import type { Role } from "@slotix/types";

// What a token is signed with: every token this API issues belongs to a session.
export interface AccessTokenPayload {
  sub: string;
  role: Role;
  // The session (refresh_tokens row id) the token belongs to.
  sid: string;
}

export interface VerifiedToken extends Omit<AccessTokenPayload, "sid"> {
  // Absent only in tokens issued before sessions existed (legacy).
  sid?: string;
  // Issue time in seconds.
  iat: number;
  // Issued before typ/aud/iss existed (see verifyUserToken).
  legacy: boolean;
}

/*
 * Every token this API signs says what it is for (`typ` + `aud`) and who issued it
 * (`iss`), and each family is checked for exactly that. Before this, the mobile OAuth
 * `state` and `handoff` tokens were signed with the access-token secret and nothing told
 * them apart, so a `state` anyone could request was accepted as an access token with no
 * user id — and Prisma ignores `undefined` filters, which exposed everyone's data.
 */
const ISSUER = "agenda-plus-api";
const ACCESS_AUDIENCE = "agenda-plus:access";
const REFRESH_AUDIENCE = "agenda-plus:refresh";
const ALGORITHM = "HS256";

const ROLES: readonly Role[] = ["CUSTOMER", "OWNER", "EMPLOYEE", "ADMIN"];
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Claims = jwt.JwtPayload & { role?: unknown; typ?: unknown; sid?: unknown };

function toPayload(claims: Claims, legacy: boolean): VerifiedToken {
  // nosemgrep: ajinabraham.njsscan.dos.regex_dos.regex_dos -- ID_PATTERN é ancorada e de comprimento fixo (UUID): sem retrocesso.
  if (typeof claims.sub !== "string" || !ID_PATTERN.test(claims.sub)) throw new Error("token sem sub válido");
  if (typeof claims.role !== "string" || !ROLES.includes(claims.role as Role)) throw new Error("token sem papel válido");
  if (typeof claims.exp !== "number") throw new Error("token sem expiração");
  if (typeof claims.iat !== "number") throw new Error("token sem data de emissão");
  // nosemgrep: ajinabraham.njsscan.dos.regex_dos.regex_dos -- ID_PATTERN é ancorada e de comprimento fixo (UUID): sem retrocesso.
  if (claims.sid !== undefined && (typeof claims.sid !== "string" || !ID_PATTERN.test(claims.sid))) throw new Error("token com sessão inválida");
  return { sub: claims.sub, role: claims.role as Role, sid: claims.sid as string | undefined, iat: claims.iat, legacy };
}

function verifyUserToken(token: string, secret: string, typ: "access" | "refresh", audience: string): VerifiedToken {
  const claims = jwt.verify(token, secret, { algorithms: [ALGORITHM] }) as Claims;

  // Tokens issued before typ/aud/iss existed carry none of the three. They're still
  // accepted until they expire on their own (at most JWT_ACCESS_EXPIRES_IN / _REFRESH_), so
  // deploying this signs nobody out; anything carrying an audience (the OAuth tokens did)
  // or a different typ is refused. This branch can go once those lifetimes have passed.
  const legacy = claims.typ === undefined && claims.aud === undefined && claims.iss === undefined;
  if (!legacy && (claims.typ !== typ || claims.aud !== audience || claims.iss !== ISSUER)) {
    throw new Error("token com finalidade errada");
  }
  const payload = toPayload(claims, legacy);
  // A current-format token without a session could never be revoked: refused.
  if (!legacy && !payload.sid) throw new Error("token sem sessão");
  return payload;
}

function signUserToken(payload: AccessTokenPayload, secret: string, typ: "access" | "refresh", audience: string, expiresIn: string): string {
  // jwtid: two tokens for the same user issued within the same second would otherwise be
  // byte-identical — the same refresh-token hash stored twice, and one session's rotation
  // or revocation hitting the other's.
  return jwt.sign({ sub: payload.sub, role: payload.role, typ, sid: payload.sid }, secret, {
    algorithm: ALGORITHM,
    jwtid: randomUUID(),
    audience,
    issuer: ISSUER,
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return signUserToken(payload, env.JWT_ACCESS_SECRET, "access", ACCESS_AUDIENCE, env.JWT_ACCESS_EXPIRES_IN);
}

export function verifyAccessToken(token: string): VerifiedToken {
  return verifyUserToken(token, env.JWT_ACCESS_SECRET, "access", ACCESS_AUDIENCE);
}

export function signRefreshToken(payload: AccessTokenPayload): string {
  return signUserToken(payload, env.JWT_REFRESH_SECRET, "refresh", REFRESH_AUDIENCE, env.JWT_REFRESH_EXPIRES_IN);
}

export function verifyRefreshToken(token: string): VerifiedToken {
  return verifyUserToken(token, env.JWT_REFRESH_SECRET, "refresh", REFRESH_AUDIENCE);
}

// The short-lived tokens of the OAuth browser flows (state, handoff) use a key of their
// own: JWT_OAUTH_SECRET when set, otherwise one derived from the access secret, which is a
// different key — so even a bug in the claim checks can't turn one into an access token.
function temporaryTokenKey(): string {
  return env.JWT_OAUTH_SECRET ?? createHmac("sha256", env.JWT_ACCESS_SECRET).update("agenda-plus/oauth-temporary-tokens/v1").digest("hex");
}

export function signTemporaryToken(payload: object, audience: string, expiresIn: string): string {
  return jwt.sign({ ...payload, typ: "oauth" }, temporaryTokenKey(), {
    algorithm: ALGORITHM,
    audience,
    issuer: ISSUER,
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function verifyTemporaryToken<T>(token: string, audience: string): T {
  const claims = jwt.verify(token, temporaryTokenKey(), { algorithms: [ALGORITHM], audience, issuer: ISSUER }) as Claims;
  if (claims.typ !== "oauth") throw new Error("token com finalidade errada");
  return claims as T;
}
