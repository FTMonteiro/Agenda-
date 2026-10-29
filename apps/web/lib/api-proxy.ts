import { cookies, headers } from "next/headers";

import { assertSafeApiPath } from "./api-path";
import { clientIpFrom, internalProxyHeaders } from "./internal-proxy";

import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  parseSession,
  refreshSession,
  type SessionTokens,
} from "./session";

const API_URL = process.env.NEXT_API_URL ?? "http://localhost:3000/api/v1";
export { SESSION_COOKIE, type SessionTokens };

// One httpOnly cookie holding both tokens as JSON — the dashboard's own pages never see
// or handle raw tokens, they just keep sending credentials: "include" like they always did
// against the old Next.js API routes this replaces.
export async function readSession(): Promise<SessionTokens | null> {
  const store = await cookies();
  return parseSession(store.get(SESSION_COOKIE)?.value);
}

export async function writeSession(tokens: SessionTokens): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, JSON.stringify(tokens), SESSION_COOKIE_OPTIONS);
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// Calls the real API (apps/api) with the session's access token attached, if any.
// Never throws on a non-2xx response — callers decide what to do with the status.
// An expired access token (15 minutes) is renewed once with the refresh token and the
// call retried, so the dashboard session lasts as long as the refresh token does.
export async function apiProxyFetch(path: string, init: RequestInit = {}): Promise<Response> {
  assertSafeApiPath(path);
  const session = await readSession();
  const clientIp = clientIpFrom(await headers());

  const send = (tokens: SessionTokens | null) =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body && typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
        ...(tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
        ...init.headers,
        ...internalProxyHeaders(clientIp),
      },
      cache: "no-store",
    });

  const response = await send(session);
  if (response.status !== 401 || !session) return response;

  const renewed = await refreshSession(session, clientIp);
  if (renewed === "invalid") return response;
  if (renewed === "unavailable") {
    // Not a signed-out user: the refresh couldn't be done right now. A 503 keeps the
    // dashboard from treating it as "session expired" and sending the user to the login.
    return Response.json(
      { success: false, error: { code: "SESSION_REFRESH_UNAVAILABLE", message: "Serviço temporariamente indisponível. Tente novamente." } },
      { status: 503 },
    );
  }

  await writeSession(renewed);
  return send(renewed);
}

// Forwards an incoming Next.js route request to the API almost verbatim (method, JSON
// body, query string) and relays the response back unchanged — the shape every *.route.ts
// file under app/api/** (besides the auth ones, which handle the session cookie
// themselves) is built from.
export async function proxyToApi(request: Request, apiPath: string): Promise<Response> {
  const url = new URL(request.url);
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.text() : undefined;

  const response = await apiProxyFetch(`${apiPath}${url.search}`, {
    method: request.method,
    body,
  });

  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
  });
}
