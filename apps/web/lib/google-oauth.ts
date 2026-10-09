import type { NextRequest } from "next/server";

// What the dashboard remembers between sending the browser to Google and getting it back:
// the anti-forgery state, and what the user was doing (signing in, or creating a space).
export const GOOGLE_OAUTH_COOKIE = "slotix_google_oauth";

export interface GoogleOAuthPending {
  state: string;
  mode: "login" | "register";
  company?: string;
  category?: string;
}

// Must be identical in both steps and match a redirect URI authorised in Google Cloud.
// NEXT_PUBLIC_APP_URL pins it in production; locally it follows the address in use.
export function googleRedirectUri(request: NextRequest): string {
  const origin = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, "");
  return `${origin}/api/auth/google/callback`;
}

// Called without the session's token on purpose: apiProxyFetch retries a 401 after
// refreshing a stale session, and Google's one-time code can't be sent twice.
export function googleApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";
  return fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    cache: "no-store",
  });
}

// The login page only explains these; anything else there is shown as the generic failure.
const LOGIN_ERRORS = new Set(["google", "google_config", "google_cancelled", "google_not_registered"]);

// The page each flow started on, with the error code its own effect knows how to show.
export function googleErrorUrl(request: NextRequest, mode: "login" | "register", error: string): URL {
  if (mode === "register") return new URL(`/cadastro?error=${error}`, request.nextUrl.origin);
  return new URL(`/login?error=${LOGIN_ERRORS.has(error) ? error : "google"}`, request.nextUrl.origin);
}
