import { internalProxyHeaders } from "./internal-proxy";

// Session pieces shared by lib/api-proxy.ts (route handlers) and proxy.ts (runs before
// every page). Nothing here touches next/headers, so both can import it.

const API_URL = process.env.NEXT_API_URL ?? "http://localhost:3000/api/v1";
export const SESSION_COOKIE = "slotix_session";

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

export function parseSession(raw: string | undefined): SessionTokens | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SessionTokens;
    return parsed.accessToken ? parsed : null;
  } catch {
    return null;
  }
}

// Reads the access token's payload without verifying it — only to know whether it is
// about to expire and which role it carries. The API still verifies every call.
export function accessTokenClaims(token: string): { exp?: number; role?: string } | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return null;
  }
}

// A margin, so a page opened just before expiry doesn't have its requests expire midway.
export function accessTokenExpiresSoon(token: string, marginSeconds = 60): boolean {
  const exp = accessTokenClaims(token)?.exp;
  if (!exp) return true;
  return exp * 1000 - Date.now() < marginSeconds * 1000;
}

// The API rotates refresh tokens (the old one is revoked on use), and a dashboard page
// fires several requests at once with the same cookie — so concurrent refreshes of the
// same token must share one call, or all but the first would fail and log the user out.
// Kept on globalThis: each route handler and proxy.ts is its own bundle, so a plain
// module-level Map would not be shared between them.
// What a refresh attempt ended in. Only "invalid" — the API refused the refresh token
// itself (401) — means the session is over. "unavailable" (rate limited, API error or
// unreachable) says nothing about the session: it must be kept and tried again later,
// or one busy moment would sign out every dashboard user at once.
export type RefreshResult = SessionTokens | "invalid" | "unavailable";

const globalForRefresh = globalThis as typeof globalThis & {
  __slotixPendingRefreshes?: Map<string, Promise<RefreshResult>>;
};
const pendingRefreshes = (globalForRefresh.__slotixPendingRefreshes ??= new Map());

export function refreshSession(session: SessionTokens, clientIp?: string): Promise<RefreshResult> {
  const existing = pendingRefreshes.get(session.refreshToken);
  if (existing) return existing;

  const pending = (async (): Promise<RefreshResult> => {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...internalProxyHeaders(clientIp) },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
      cache: "no-store",
    });
    const json = await response.json().catch(() => null);
    if (response.ok && json?.success) {
      return { accessToken: json.data.accessToken, refreshToken: json.data.refreshToken } as SessionTokens;
    }
    return response.status === 401 || response.status === 400 ? "invalid" : "unavailable";
  })().catch((): RefreshResult => "unavailable");

  pendingRefreshes.set(session.refreshToken, pending);
  // A success is kept for a while after it settles: requests already in flight still carry
  // the old cookie. A failure is dropped at once, so the next request tries again.
  void pending.then((result) => {
    if (typeof result === "string") pendingRefreshes.delete(session.refreshToken);
    else setTimeout(() => pendingRefreshes.delete(session.refreshToken), 60_000);
  });

  return pending;
}
