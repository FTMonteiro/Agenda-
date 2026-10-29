import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { internalProxySignature } from "../../src/shared/internalProxy";
import { resetRateLimits } from "../../src/shared/middleware/rateLimit";
// The web dashboard's real code: what it sends is what the API must accept.
import { clientIpFrom, internalProxyHeaders } from "../../../web/lib/internal-proxy";
import { refreshSession } from "../../../web/lib/session";
import { app } from "./helpers";

// R-04: per-IP limits must count each dashboard user separately (through the signed
// internal proxy), must never trust a client-supplied X-Forwarded-For, and a refresh that
// fails for reasons unrelated to the session must not end it.

beforeEach(() => resetRateLimits());
afterEach(() => vi.unstubAllGlobals());

const OAUTH_LIMIT = 100;
const googleUrl = (headers: Record<string, string> = {}) =>
  request(app)
    .get("/api/v1/auth/google/url")
    .query({ redirectUri: "http://localhost:3001/api/auth/google/callback", state: "s".repeat(32) })
    .set(headers);

async function exhaust(headers: () => Record<string, string>) {
  for (let i = 0; i < OAUTH_LIMIT; i++) expect((await googleUrl(headers())).status).toBe(200);
}

describe("proxy interno web → API", () => {
  it("cada utilizador do painel tem o seu próprio limite por IP", async () => {
    await exhaust(() => internalProxyHeaders("203.0.113.10"));
    expect((await googleUrl(internalProxyHeaders("203.0.113.10"))).status).toBe(429);
    // Outro utilizador, através do mesmo servidor do painel, não é afetado.
    expect((await googleUrl(internalProxyHeaders("203.0.113.20"))).status).toBe(200);
  });

  it("um X-Forwarded-For enviado pelo cliente é ignorado: conta o endereço real", async () => {
    let n = 0;
    await exhaust(() => ({ "X-Forwarded-For": `198.51.100.${n++}`, "X-Real-IP": `198.51.100.${n}` }));
    expect((await googleUrl({ "X-Forwarded-For": "198.51.100.250" })).status).toBe(429);
  });

  it("assinatura forjada, de outro segredo ou expirada não é aceite", async () => {
    await exhaust(() => ({}));
    const ts = Math.floor(Date.now() / 1000).toString();
    const forged = { "x-agenda-proxy-ts": ts, "x-agenda-client-ip": "203.0.113.30", "x-agenda-proxy-sig": internalProxySignature("outro-segredo-qualquer-com-32-caracteres", ts, "203.0.113.30") };
    const stale = Math.floor(Date.now() / 1000 - 3600).toString();
    const expired = { "x-agenda-proxy-ts": stale, "x-agenda-client-ip": "203.0.113.31", "x-agenda-proxy-sig": internalProxySignature(process.env.INTERNAL_PROXY_SECRET!, stale, "203.0.113.31") };
    const tampered = { ...internalProxyHeaders("203.0.113.32"), "x-agenda-client-ip": "203.0.113.33" };
    for (const headers of [forged, expired, tampered]) expect((await googleUrl(headers)).status).toBe(429);
    // A assinatura válida continua a funcionar para um IP novo.
    expect((await googleUrl(internalProxyHeaders("203.0.113.34"))).status).toBe(200);
  });

  it("pedido assinado sem IP do utilizador não conta para o limite do servidor do painel", async () => {
    for (let i = 0; i < OAUTH_LIMIT + 5; i++) expect((await googleUrl(internalProxyHeaders())).status).toBe(200);
  });

  it("a web só aceita um IP válido do cabeçalho de confiança, e usa a última entrada da lista", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": "203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientIpFrom(new Headers({ "x-real-ip": "1.1.1.1, 203.0.113.8" }))).toBe("203.0.113.8");
    expect(clientIpFrom(new Headers({ "x-real-ip": "não-é-ip" }))).toBeUndefined();
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "203.0.113.9" }))).toBeUndefined();
  });
});

describe("refresh", () => {
  it("o limite é por token: muitos utilizadores a renovar pelo mesmo servidor não se bloqueiam", async () => {
    for (let i = 0; i < 60; i++) {
      const response = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: `token-invalido-${i}` });
      expect(response.status).toBe(401);
    }
  });

  it("o mesmo token repetido muitas vezes é limitado", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) statuses.push((await request(app).post("/api/v1/auth/refresh").send({ refreshToken: "sempre-o-mesmo" })).status);
    expect(statuses.slice(0, 30).every((s) => s === 401)).toBe(true);
    expect(statuses[30]).toBe(429);
  });

  it("na web, só um token recusado termina a sessão; 429, erro ou falha de rede não", async () => {
    const session = { accessToken: "a", refreshToken: "r" };
    const answer = (status: number, body: unknown) => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));

    answer(429, { success: false, error: { code: "RATE_LIMITED" } });
    expect(await refreshSession({ ...session, refreshToken: "r1" })).toBe("unavailable");
    answer(503, { success: false });
    expect(await refreshSession({ ...session, refreshToken: "r2" })).toBe("unavailable");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    expect(await refreshSession({ ...session, refreshToken: "r3" })).toBe("unavailable");
    answer(401, { success: false, error: { code: "AUTHENTICATION_ERROR" } });
    expect(await refreshSession({ ...session, refreshToken: "r4" })).toBe("invalid");
    answer(200, { success: true, data: { accessToken: "novo-a", refreshToken: "novo-r" } });
    expect(await refreshSession({ ...session, refreshToken: "r5" })).toEqual({ accessToken: "novo-a", refreshToken: "novo-r" });
  });

  it("o refresh feito pela web leva a assinatura interna com o IP do utilizador", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ success: false }), { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    await refreshSession({ accessToken: "a", refreshToken: "r6" }, "203.0.113.40");
    const headers = fetchMock.mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers["x-agenda-client-ip"]).toBe("203.0.113.40");
    expect(headers["x-agenda-proxy-sig"]).toBe(internalProxySignature(process.env.INTERNAL_PROXY_SECRET!, headers["x-agenda-proxy-ts"], "203.0.113.40"));
  });
});
