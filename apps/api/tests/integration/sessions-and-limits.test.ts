import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimits } from "../../src/shared/middleware/rateLimit";
import { realtimeHub } from "../../src/modules/realtime/realtime.hub";
import { forgetSessionUser } from "../../src/shared/sessionUsers";
import { app, auth, createUser, PASSWORD, prisma, resetDatabase } from "./helpers";

beforeEach(async () => {
  await resetDatabase();
  resetRateLimits();
});

async function login(email: string, password = PASSWORD) {
  return request(app).post("/api/v1/auth/login").send({ email, password });
}

describe("A-02: limites de pedidos", () => {
  it("bloqueia tentativas repetidas de login na mesma conta, sem afetar outras", async () => {
    const victim = await createUser("CUSTOMER");
    const other = await createUser("CUSTOMER");
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) statuses.push((await login(victim.user.email, "errada-123")).status);
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);

    // Mesmo com a password certa, a conta atacada fica em espera até a janela passar.
    expect((await login(victim.user.email)).status).toBe(429);
    expect((await login(other.user.email)).status).toBe(200);
  });

  it("o limite por conta não se contorna com maiúsculas no email", async () => {
    const victim = await createUser("CUSTOMER");
    for (let i = 0; i < 10; i++) await login(victim.user.email, "errada-123");
    expect((await login(victim.user.email.toUpperCase(), "errada-123")).status).toBe(429);
  });

  it("limita registos repetidos do mesmo email", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      statuses.push((await request(app).post("/api/v1/auth/register").send({ name: "Teste", email: "flood@example.test", password: "Password123!" })).status);
    }
    expect(statuses[0]).toBe(201);
    expect(statuses.at(-1)).toBe(429);
  });

  it("limita tentativas de adivinhar a password atual na mudança de password", async () => {
    const user = await createUser("OWNER");
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      statuses.push((await request(app).post("/api/v1/users/me/password").set(auth(user.token)).send({ currentPassword: "errada-123", newPassword: "NovaPass123!" })).status);
    }
    expect(statuses.at(-1)).toBe(429);
  });
});

describe("B-01/B-02: emails", () => {
  it("o login aceita o email com maiúsculas e contas antigas guardadas com maiúsculas", async () => {
    const legacy = await createUser("CUSTOMER", { email: "Ana.Silva@Example.test" });
    expect((await login("ana.silva@example.test")).status).toBe(200);
    expect((await login("  ANA.SILVA@example.test ")).status).toBe(200);
    expect(legacy.user.email).toBe("Ana.Silva@Example.test");
  });

  it("não deixa registar o mesmo email com outra capitalização", async () => {
    await createUser("CUSTOMER", { email: "ana@example.test" });
    const response = await request(app).post("/api/v1/auth/register").send({ name: "Ana", email: "ANA@example.test", password: "Password123!" });
    expect(response.status).toBe(409);
  });

  it("email inexistente e password errada dão a mesma resposta", async () => {
    await createUser("CUSTOMER", { email: "existe@example.test" });
    const unknown = await login("nao-existe@example.test", "errada-123");
    const wrong = await login("existe@example.test", "errada-123");
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it("recusa passwords com mais de 128 caracteres", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({ name: "Ana", email: "longa@example.test", password: "a".repeat(129) });
    expect(response.status).toBe(400);
  });
});

describe("M-03: sessões", () => {
  it("mudar a password revoga os refresh tokens antigos e devolve uma sessão nova", async () => {
    const user = await createUser("OWNER");
    const first = await login(user.user.email);
    const oldRefresh = first.body.data.refreshToken;

    const change = await request(app).post("/api/v1/users/me/password").set(auth(first.body.data.accessToken)).send({ currentPassword: PASSWORD, newPassword: "NovaPass123!" });
    expect(change.status).toBe(200);
    expect(change.body.data.accessToken).toBeTruthy();
    expect(change.body.data.refreshToken).toBeTruthy();

    expect((await request(app).post("/api/v1/auth/refresh").send({ refreshToken: oldRefresh })).status).toBe(401);
    expect((await request(app).post("/api/v1/auth/refresh").send({ refreshToken: change.body.data.refreshToken })).status).toBe(200);
  });

  it("o access token de uma conta eliminada deixa de funcionar de imediato", async () => {
    const user = await createUser("CUSTOMER");
    expect((await request(app).delete("/api/v1/users/me").set(auth(user.token))).status).toBe(200);
    expect((await request(app).get("/api/v1/users/me").set(auth(user.token))).status).toBe(401);
    expect((await request(app).get("/api/v1/notifications").set(auth(user.token))).status).toBe(401);
  });

  it("o papel vem da base de dados, não de um token antigo", async () => {
    const user = await createUser("OWNER");
    await prisma.user.update({ where: { id: user.user.id }, data: { role: "CUSTOMER" } });
    forgetSessionUser(user.user.id);
    const response = await request(app).post("/api/v1/services").set(auth(user.token)).send({});
    expect(response.status).toBe(403);
  });

  it("reutilizar um refresh token já rodado há algum tempo revoga todas as sessões", async () => {
    const user = await createUser("CUSTOMER");
    const first = (await login(user.user.email)).body.data.refreshToken;
    const second = (await request(app).post("/api/v1/auth/refresh").send({ refreshToken: first })).body.data.refreshToken;
    expect(second).toBeTruthy();

    // A sessão foi rodada há 5 minutos (a validade da linha é renovada a cada rotação):
    // voltar a usar o token anterior é sinal de roubo.
    await prisma.refreshToken.updateMany({ where: { userId: user.user.id }, data: { expiresAt: new Date(Date.now() + 7 * 86_400_000 - 5 * 60_000) } });
    expect((await request(app).post("/api/v1/auth/refresh").send({ refreshToken: first })).status).toBe(401);
    expect((await request(app).post("/api/v1/auth/refresh").send({ refreshToken: second })).status).toBe(401);
  });

  it("dois refresh simultâneos com o mesmo token não terminam a sessão (pedidos paralelos do painel)", async () => {
    const user = await createUser("CUSTOMER");
    const token = (await login(user.user.email)).body.data.refreshToken;
    const results = await Promise.all([1, 2].map(() => request(app).post("/api/v1/auth/refresh").send({ refreshToken: token })));
    expect(results.some((r) => r.status === 200)).toBe(true);
    const fresh = results.find((r) => r.status === 200)!.body.data.refreshToken;
    expect((await request(app).post("/api/v1/auth/refresh").send({ refreshToken: fresh })).status).toBe(200);
  });
});

describe("M-04: cabeçalhos e configuração", () => {
  it("a API envia cabeçalhos de segurança e não se identifica", async () => {
    const response = await request(app).get("/health");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("CORS só responde à origem do painel configurada", async () => {
    const allowed = await request(app).get("/health").set("Origin", "http://localhost:3001");
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:3001");
    const denied = await request(app).get("/health").set("Origin", "https://atacante.example");
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("R-17: preflight com Authorization (versão web da app) só para origens configuradas", async () => {
    const preflight = (origin: string) =>
      request(app).options("/api/v1/users/me").set("Origin", origin).set("Access-Control-Request-Method", "GET").set("Access-Control-Request-Headers", "authorization,content-type");
    const allowed = await preflight("http://localhost:3001");
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:3001");
    expect(allowed.headers["access-control-allow-headers"]).toMatch(/authorization/i);
    const denied = await preflight("https://atacante.example");
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("JSON mal formado dá 400 e não revela detalhes internos", async () => {
    const response = await request(app).post("/api/v1/auth/login").set("Content-Type", "application/json").send("{nao json");
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).not.toMatch(/SyntaxError|at .*\.js/);
  });
});

describe("B-09: ligações SSE", () => {
  it("recusa ligações a mais do mesmo utilizador", async () => {
    const user = await createUser("CUSTOMER");
    const removers = Array.from({ length: 10 }, () => realtimeHub.add(user.user.id, { write: () => true } as never));
    const response = await request(app).get("/api/v1/events").set(auth(user.token));
    expect(response.status).toBe(429);
    removers.forEach((remove) => remove());
  });
});
