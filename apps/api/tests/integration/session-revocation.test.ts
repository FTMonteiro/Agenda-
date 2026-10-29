import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimits } from "../../src/shared/middleware/rateLimit";
import { app, auth, createBusinessFixture, createUser, PASSWORD, prisma, resetDatabase } from "./helpers";

// R-05: sessions can be ended server-side — one (logout) or all (password change, account
// deleted, "terminar todas as sessões") — and that reaches access tokens too, which is all
// the mobile app keeps. R-08 and R-14 ride along: they concern the same tokens.

beforeEach(async () => {
  await resetDatabase();
  resetRateLimits();
});

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

// Sessions rotate in place: the row's expiry is reset on each refresh, so "rotated N minutes
// ago" is simulated by pulling that expiry back by N minutes (refresh lifetime is 7d here).
async function rotatedMinutesAgo(userId: string, minutes: number) {
  await prisma.refreshToken.updateMany({ where: { userId }, data: { expiresAt: new Date(Date.now() + 7 * 86_400_000 - minutes * 60_000) } });
}
const me = (token: string) => request(app).get("/api/v1/users/me").set(auth(token));
const refresh = (refreshToken: string) => request(app).post("/api/v1/auth/refresh").send({ refreshToken });

async function signIn(email: string, password = PASSWORD) {
  const response = await request(app).post("/api/v1/auth/login").send({ email, password });
  expect(response.status).toBe(200);
  return response.body.data as { accessToken: string; refreshToken: string };
}

// A token as the code before this branch signed it: no typ/aud/iss, no sid.
const legacyToken = (sub: string, role: string, secret: string, extra: object = {}) => jwt.sign({ sub, role, ...extra }, secret, { expiresIn: "7d" });

describe("logout: só a sessão atual", () => {
  it("termina o access e o refresh token desta sessão; a outra continua", async () => {
    const user = await createUser("OWNER");
    const web = await signIn(user.user.email);
    const phone = await signIn(user.user.email);

    expect((await request(app).post("/api/v1/auth/logout").set(auth(web.accessToken))).status).toBe(200);

    expect((await me(web.accessToken)).status).toBe(401);
    expect((await refresh(web.refreshToken)).status).toBe(401);
    expect((await me(phone.accessToken)).status).toBe(200);
    expect((await refresh(phone.refreshToken)).status).toBe(200);
  });

  it("depois de rodar o refresh, a sessão continua a mesma: o logout termina-a toda", async () => {
    const user = await createUser("CUSTOMER");
    const first = await signIn(user.user.email);
    const rotated = (await refresh(first.refreshToken)).body.data;

    // O access token anterior à rotação continua válido (pedidos em paralelo do painel).
    expect((await me(first.accessToken)).status).toBe(200);
    expect((await request(app).post("/api/v1/auth/logout").set(auth(rotated.accessToken))).status).toBe(200);
    expect((await me(first.accessToken)).status).toBe(401);
    expect((await me(rotated.accessToken)).status).toBe(401);
    expect((await refresh(rotated.refreshToken)).status).toBe(401);
  });

  it("uma sessão anterior aos sids termina com o refresh token enviado, e só essa", async () => {
    const user = await createUser("OWNER");
    const legacyRefresh = legacyToken(user.user.id, "OWNER", process.env.JWT_REFRESH_SECRET!);
    await prisma.refreshToken.create({ data: { userId: user.user.id, tokenHash: sha256(legacyRefresh), expiresAt: new Date(Date.now() + 86_400_000) } });
    const other = await signIn(user.user.email);
    const legacyAccess = legacyToken(user.user.id, "OWNER", process.env.JWT_ACCESS_SECRET!);

    const response = await request(app).post("/api/v1/auth/logout").set(auth(legacyAccess)).send({ refreshToken: legacyRefresh });
    expect(response.status).toBe(200);
    expect((await refresh(legacyRefresh)).status).toBe(401);
    expect((await refresh(other.refreshToken)).status).toBe(200);
  });
});

describe("terminar todas as sessões", () => {
  it("logout-all termina todos os dispositivos, incluindo tokens só de acesso (app mobile)", async () => {
    const user = await createUser("CUSTOMER");
    const web = await signIn(user.user.email);
    const phone = await signIn(user.user.email);

    expect((await request(app).post("/api/v1/auth/logout-all").set(auth(web.accessToken))).status).toBe(200);

    for (const token of [web.accessToken, phone.accessToken]) expect((await me(token)).status).toBe(401);
    for (const token of [web.refreshToken, phone.refreshToken]) expect((await refresh(token)).status).toBe(401);

    const again = await signIn(user.user.email);
    expect((await me(again.accessToken)).status).toBe(200);
  });

  it("mudar a password termina as outras sessões e mantém a do pedido", async () => {
    const user = await createUser("OWNER");
    const web = await signIn(user.user.email);
    const phone = await signIn(user.user.email);
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const change = await request(app).post("/api/v1/users/me/password").set(auth(web.accessToken)).send({ currentPassword: PASSWORD, newPassword: "NovaPass123!" });
    expect(change.status).toBe(200);

    expect((await me(phone.accessToken)).status).toBe(401);
    expect((await me(web.accessToken)).status).toBe(401);
    expect((await me(change.body.data.accessToken)).status).toBe(200);
    expect((await refresh(change.body.data.refreshToken)).status).toBe(200);
  });

  it("a reposição da password de um funcionário pelo dono termina as sessões do funcionário", async () => {
    const fx = await createBusinessFixture("A");
    const employeeSession = await signIn(fx.employee.user.email);
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const reset = await request(app).post(`/api/v1/professionals/${fx.professional.id}/reset-password`).set(auth(fx.owner.token));
    expect(reset.status).toBe(200);
    expect((await me(employeeSession.accessToken)).status).toBe(401);
    expect((await me(fx.employee.token)).status).toBe(401);
  });

  it("só o próprio pode terminar as suas sessões", async () => {
    expect((await request(app).post("/api/v1/auth/logout-all")).status).toBe(401);
    const a = await createUser("CUSTOMER");
    const b = await createUser("CUSTOMER");
    const bSession = await signIn(b.user.email);
    expect((await request(app).post("/api/v1/auth/logout-all").set(auth(a.token))).status).toBe(200);
    expect((await me(bSession.accessToken)).status).toBe(200);
  });
});

describe("compatibilidade com tokens anteriores", () => {
  it("um access token antigo (sem sid) continua válido até expirar, mesmo depois de terminar as sessões", async () => {
    // Limitação conhecida, sem alterar o schema: um token emitido antes deste deploy não
    // pertence a nenhuma sessão, por isso só expira sozinho (JWT_ACCESS_EXPIRES_IN).
    const user = await createUser("OWNER");
    const legacy = legacyToken(user.user.id, "OWNER", process.env.JWT_ACCESS_SECRET!);
    expect((await me(legacy)).status).toBe(200);
    expect((await request(app).post("/api/v1/auth/logout-all").set(auth(legacy))).status).toBe(200);
    expect((await me(legacy)).status).toBe(200);
  });

  it("um refresh token antigo renova e passa a ter sessão", async () => {
    const user = await createUser("OWNER");
    const legacyRefresh = legacyToken(user.user.id, "OWNER", process.env.JWT_REFRESH_SECRET!);
    await prisma.refreshToken.create({ data: { userId: user.user.id, tokenHash: sha256(legacyRefresh), expiresAt: new Date(Date.now() + 86_400_000) } });

    const renewed = await refresh(legacyRefresh);
    expect(renewed.status).toBe(200);
    expect(jwt.decode(renewed.body.data.accessToken)).toMatchObject({ sid: expect.any(String) });
    expect((await me(renewed.body.data.accessToken)).status).toBe(200);
  });

  it("R-14: um refresh token antigo nunca é aceite como access token, mesmo com segredos iguais", async () => {
    const user = await createUser("OWNER");
    // Simula segredos iguais: o refresh antigo foi assinado com o segredo de acesso.
    const sameSecretRefresh = legacyToken(user.user.id, "OWNER", process.env.JWT_ACCESS_SECRET!, { jti: "refresh-antigo" });
    await prisma.refreshToken.create({ data: { userId: user.user.id, tokenHash: sha256(sameSecretRefresh), expiresAt: new Date(Date.now() + 86_400_000) } });
    expect((await me(sameSecretRefresh)).status).toBe(401);
  });
});

describe("R-08: hashes de refresh duplicados (tokens anteriores ao jti)", () => {
  it("um gémeo revogado há muito não faz um token ativo parecer reutilizado", async () => {
    const user = await createUser("CUSTOMER");
    const legacyRefresh = legacyToken(user.user.id, "CUSTOMER", process.env.JWT_REFRESH_SECRET!);
    const other = await signIn(user.user.email);
    await prisma.refreshToken.createMany({
      data: [
        { userId: user.user.id, tokenHash: sha256(legacyRefresh), expiresAt: new Date(Date.now() + 86_400_000), revokedAt: new Date(Date.now() - 3_600_000), createdAt: new Date(Date.now() - 7_200_000) },
        { userId: user.user.id, tokenHash: sha256(legacyRefresh), expiresAt: new Date(Date.now() + 86_400_000), createdAt: new Date(Date.now() - 7_200_000) },
      ],
    });

    expect((await refresh(legacyRefresh)).status).toBe(200);
    // Nenhuma revogação geral foi disparada.
    expect((await me(other.accessToken)).status).toBe(200);
    expect((await refresh(other.refreshToken)).status).toBe(200);
  });

  it("um token realmente reutilizado depois de rodado termina todas as sessões, incluindo os access tokens", async () => {
    const user = await createUser("CUSTOMER");
    const first = await signIn(user.user.email);
    const phone = await signIn(user.user.email);
    expect((await refresh(first.refreshToken)).status).toBe(200);
    await rotatedMinutesAgo(user.user.id, 5);

    expect((await refresh(first.refreshToken)).status).toBe(401);
    expect((await me(phone.accessToken)).status).toBe(401);
  });

  it("um token rodado há segundos (pedidos paralelos do painel) é recusado sem terminar as outras sessões", async () => {
    const user = await createUser("CUSTOMER");
    const first = await signIn(user.user.email);
    const phone = await signIn(user.user.email);
    expect((await refresh(first.refreshToken)).status).toBe(200);

    expect((await refresh(first.refreshToken)).status).toBe(401);
    expect((await me(phone.accessToken)).status).toBe(200);
  });
});
