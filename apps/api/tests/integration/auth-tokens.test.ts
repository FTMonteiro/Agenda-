import jwt from "jsonwebtoken";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signRefreshToken } from "../../src/shared/utils/jwt";
import { app, auth, createAppointment, createBusinessFixture, createPayment, prisma, resetDatabase, type BusinessFixture } from "./helpers";

// Rotas que devolvem "os dados do utilizador autenticado": se o id do utilizador chegasse
// vazio ao Prisma, o filtro seria ignorado e devolveriam os dados de toda a gente.
const USER_SCOPED_ROUTES = ["/api/v1/payments", "/api/v1/appointments", "/api/v1/notifications", "/api/v1/favorites", "/api/v1/users/me", "/api/v1/auth/me", "/api/v1/businesses/mine"];

async function mobileState(path: "/api/v1/auth/google/mobile/start") {
  const response = await request(app).post(path).send({ mode: "login", returnUrl: "slotix://auth" });
  expect(response.status).toBe(200);
  return new URL(response.body.data.url).searchParams.get("state")!;
}

describe("C-01: só access tokens verdadeiros autenticam pedidos", () => {
  let a: BusinessFixture;

  beforeEach(async () => {
    await resetDatabase();
    a = await createBusinessFixture("A");
    const appointment = await createAppointment(a, { status: "CONFIRMED" });
    await createPayment(a, appointment.id);
    await prisma.notification.create({ data: { userId: a.owner.user.id, type: "INFO", title: "Privado", message: "Só para o dono A" } });
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each(USER_SCOPED_ROUTES)("anónimo em %s → 401", async (route) => {
    const response = await request(app).get(route);
    expect(response.status).toBe(401);
  });

  it.each(USER_SCOPED_ROUTES)("token inválido em %s → 401", async (route) => {
    const response = await request(app).get(route).set(auth("isto.nao.e-um-token"));
    expect(response.status).toBe(401);
  });

  it.each(USER_SCOPED_ROUTES)("o state temporário do OAuth móvel não autentica %s", async (route) => {
    const state = await mobileState("/api/v1/auth/google/mobile/start");
    const response = await request(app).get(route).set(auth(state));
    expect(response.status).toBe(401);
    expect(JSON.stringify(response.body)).not.toContain(a.owner.user.email);
    expect(JSON.stringify(response.body)).not.toContain("Só para o dono A");
  });

  it("o state temporário não consegue alterar dados de outras pessoas (read-all)", async () => {
    const state = await mobileState("/api/v1/auth/google/mobile/start");
    const response = await request(app).patch("/api/v1/notifications/read-all").set(auth(state));
    expect(response.status).toBe(401);
    const unread = await prisma.notification.count({ where: { read: false } });
    expect(unread).toBe(1);
  });

  it("o handoff do OAuth móvel não autentica pedidos, mas continua a servir para a troca", async () => {
    // Google simulado: troca do código e perfil com email verificado do dono A.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("https://oauth2.googleapis.com/token")) return new Response(JSON.stringify({ access_token: "fake" }), { status: 200 });
        if (url.startsWith("https://www.googleapis.com/oauth2/v3/userinfo")) {
          return new Response(JSON.stringify({ email: a.owner.user.email, email_verified: true, name: "Dono A" }), { status: 200 });
        }
        throw new Error(`pedido inesperado: ${url}`);
      }),
    );

    const start = await request(app).post("/api/v1/auth/google/mobile/start").send({ mode: "login", returnUrl: "slotix://auth" });
    const state = new URL(start.body.data.url).searchParams.get("state")!;
    const callback = await request(app).get("/api/v1/auth/google/mobile/callback").query({ code: "abc", state });
    expect(callback.status).toBe(302);
    const handoff = new URL(callback.headers.location).searchParams.get("handoff")!;
    expect(handoff).toBeTruthy();

    const misuse = await request(app).get("/api/v1/users/me").set(auth(handoff));
    expect(misuse.status).toBe(401);

    const exchange = await request(app).post("/api/v1/auth/google/mobile/exchange").send({ handoff, verifier: start.body.data.verifier });
    expect(exchange.status).toBe(200);
    expect(exchange.body.data.user.id).toBe(a.owner.user.id);
  });

  it("um refresh token não serve como access token", async () => {
    const refresh = signRefreshToken({ sub: a.owner.user.id, role: "OWNER", sid: "6f1c2b8e-0d4a-4c6e-9b1a-2f3d4e5f6a7b" });
    const response = await request(app).get("/api/v1/users/me").set(auth(refresh));
    expect(response.status).toBe(401);
  });

  it("rejeita tokens sem assinatura (alg none), expirados ou assinados com outro segredo", async () => {
    const none = jwt.sign({ sub: a.owner.user.id, role: "OWNER" }, "", { algorithm: "none" });
    const expired = jwt.sign({ sub: a.owner.user.id, role: "OWNER", exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_ACCESS_SECRET!);
    const forged = jwt.sign({ sub: a.owner.user.id, role: "OWNER" }, "outro-segredo");
    for (const token of [none, expired, forged]) {
      const response = await request(app).get("/api/v1/users/me").set(auth(token));
      expect(response.status).toBe(401);
    }
  });

  it("rejeita tokens assinados com o segredo certo mas sem sub ou com papel desconhecido", async () => {
    const secret = process.env.JWT_ACCESS_SECRET!;
    const noSub = jwt.sign({ role: "OWNER" }, secret);
    const badRole = jwt.sign({ sub: a.owner.user.id, role: "SUPERUSER" }, secret);
    const withAudience = jwt.sign({ sub: a.owner.user.id, role: "OWNER" }, secret, { audience: "google-mobile-handoff" });
    for (const token of [noSub, badRole, withAudience]) {
      const response = await request(app).get("/api/v1/users/me").set(auth(token));
      expect(response.status).toBe(401);
    }
  });

  it("um access token emitido antes desta correção (sem typ/aud) continua válido até expirar", async () => {
    const legacy = jwt.sign({ sub: a.owner.user.id, role: "OWNER" }, process.env.JWT_ACCESS_SECRET!, { expiresIn: "15m" });
    const response = await request(app).get("/api/v1/users/me").set(auth(legacy));
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(a.owner.user.id);
  });

  it("utilizador autenticado só vê os seus próprios dados", async () => {
    const response = await request(app).get("/api/v1/payments").set(auth(a.customer.token));
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].userId).toBe(a.customer.user.id);

    const other = await createBusinessFixture("B");
    const forOther = await request(app).get("/api/v1/payments").set(auth(other.customer.token));
    expect(forOther.status).toBe(200);
    expect(forOther.body.data).toHaveLength(0);
  });
});
