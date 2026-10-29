import { generateKeyPairSync } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authRepository, emailLookupQuery } from "../../src/modules/auth/auth.repository";
import { resetRateLimits } from "../../src/shared/middleware/rateLimit";
import { app, createUser, PASSWORD, prisma, resetDatabase } from "./helpers";

// R-01/R-02: an email is matched as the exact (normalised) address — `_` and `%` are just
// characters, never wildcards, in every lookup: password login, registration, invites and
// Google/Apple sign-in.

beforeEach(async () => {
  await resetDatabase();
  resetRateLimits();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const login = (email: string, password = PASSWORD) => request(app).post("/api/v1/auth/login").send({ email, password });

// Google simulated: the code exchange answers with a verified profile for `email`.
function stubGoogle(email: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.startsWith("https://oauth2.googleapis.com/token")) return new Response(JSON.stringify({ access_token: "fake" }), { status: 200 });
      if (url.startsWith("https://www.googleapis.com/oauth2/v3/userinfo")) return new Response(JSON.stringify({ email, email_verified: true, name: "Teste" }), { status: 200 });
      throw new Error(`pedido inesperado: ${url}`);
    }),
  );
}

const googleLogin = () =>
  request(app).post("/api/v1/auth/google").send({ code: "abc", redirectUri: "http://localhost:3001/api/auth/google/callback", mode: "login" });

// Apple simulated: a key pair of our own, published as Apple's signing keys.
const apple = (() => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const kid = "test-apple-key";
  return {
    stub() {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
          if (url === "https://appleid.apple.com/auth/keys") return new Response(JSON.stringify({ keys: [{ ...publicKey.export({ format: "jwk" }), kid, alg: "RS256", use: "sig" }] }), { status: 200 });
          throw new Error(`pedido inesperado: ${url}`);
        }),
      );
    },
    token(email: string) {
      return jwt.sign({ email, email_verified: "true" }, privateKey, {
        algorithm: "RS256",
        keyid: kid,
        issuer: "https://appleid.apple.com",
        audience: "com.nevrix.slotix",
        expiresIn: "5m",
      });
    },
  };
})();

describe("a consulta por email não usa curingas", () => {
  it("o SQL final compara por igualdade com parâmetro, sem LIKE/ILIKE", () => {
    for (const includeDeleted of [false, true]) {
      const query = emailLookupQuery("  Ana_Silva%@Example.test", { includeDeleted });
      expect(query.sql).toMatch(/WHERE lower\("email"\) = lower\(\?\)/);
      expect(query.sql).not.toMatch(/like/i);
      expect(query.sql).not.toContain("Ana_Silva");
      // O endereço segue como parâmetro, já normalizado, com _ e % tal como estão.
      expect(query.values).toEqual(["ana_silva%@example.test"]);
    }
  });

  it("_ e % não encontram outras contas", async () => {
    await createUser("CUSTOMER", { email: "ana.silva@example.test" });
    expect(await authRepository.findUserByEmail("ana_silva@example.test")).toBeNull();
    expect(await authRepository.findUserByEmail("ana_silv_@example.test")).toBeNull();
    expect(await authRepository.findUserByEmail("%@example.test")).toBeNull();
    expect(await authRepository.findUserByEmail("ana%@example.test")).toBeNull();
    expect(await authRepository.isEmailTaken("ana_silva@example.test")).toBe(false);
    expect(await authRepository.isEmailTaken("%")).toBe(false);
  });
});

describe("login por password", () => {
  it("um email com _ não entra na conta de um endereço semelhante", async () => {
    await createUser("CUSTOMER", { email: "ana.silva@example.test" });
    expect((await login("ana_silva@example.test")).status).toBe(401);
  });

  it("endereços semelhantes entram cada um na sua conta, mesmo que o outro seja mais antigo", async () => {
    const older = await createUser("CUSTOMER", { email: "anaxsilva@example.test" });
    const mine = await createUser("CUSTOMER", { email: "ana_silva@example.test" });
    const response = await login("ana_silva@example.test");
    expect(response.status).toBe(200);
    expect(response.body.data.user.id).toBe(mine.user.id);
    expect(response.body.data.user.id).not.toBe(older.user.id);
  });

  it("maiúsculas e espaços não importam, incluindo em contas antigas guardadas com maiúsculas", async () => {
    const legacy = await createUser("CUSTOMER", { email: "Ana.Silva@Example.test" });
    for (const variant of ["ana.silva@example.test", " ANA.SILVA@EXAMPLE.TEST "]) {
      const response = await login(variant);
      expect(response.status).toBe(200);
      expect(response.body.data.user.id).toBe(legacy.user.id);
    }
  });

  it("contas antigas que só diferem nas maiúsculas: entra a guardada exatamente assim; sem nenhuma exata, ninguém", async () => {
    const exact = await createUser("CUSTOMER", { email: "dup@example.test" });
    await createUser("CUSTOMER", { email: "DUP@example.test" });
    const response = await login("Dup@Example.test");
    expect(response.status).toBe(200);
    expect(response.body.data.user.id).toBe(exact.user.id);

    await createUser("CUSTOMER", { email: "Amb@example.test" });
    await createUser("CUSTOMER", { email: "AMB@example.test" });
    expect((await login("amb@example.test")).status).toBe(401);
  });

  it("o limite por conta usa o endereço canónico e as variantes com _ não o contornam", async () => {
    await createUser("CUSTOMER", { email: "admin@example.test" });
    for (let i = 0; i < 10; i++) await login("admin@example.test", "errada-123");
    expect((await login("ADMIN@example.test ", "errada-123")).status).toBe(429);

    // As variantes são outras contas (inexistentes): não dão acesso nem tentativas extra à vítima.
    for (const variant of ["_dmin@example.test", "a_min@example.test", "adm_n@example.test"]) {
      expect((await login(variant)).status).toBe(401);
    }
  });

  it("um email com % é recusado pela validação", async () => {
    expect((await login("a%b@example.test")).status).toBe(400);
  });
});

describe("registo e convites", () => {
  it("recusa o mesmo endereço noutra capitalização, também contra contas antigas", async () => {
    await createUser("CUSTOMER", { email: "Ana@Example.test" });
    const response = await request(app).post("/api/v1/auth/register").send({ name: "Ana", email: "ana@example.test", password: "Password123!" });
    expect(response.status).toBe(409);
  });

  it("um endereço com _ semelhante a outro existente é um registo novo, guardado normalizado", async () => {
    await createUser("CUSTOMER", { email: "ana.silva@example.test" });
    const response = await request(app).post("/api/v1/auth/register").send({ name: "Ana", email: "  Ana_Silva@Example.test", password: "Password123!" });
    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe("ana_silva@example.test");
  });

  it("registos simultâneos do mesmo email: só um entra", async () => {
    const send = (email: string) => request(app).post("/api/v1/auth/register").send({ name: "Ana", email, password: "Password123!" });
    const statuses = (await Promise.all([send("same@example.test"), send("SAME@example.test")])).map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409]);
  });

  it("o convite de funcionário aplica as mesmas regras", async () => {
    const owner = await createUser("OWNER");
    const business = await prisma.business.create({ data: { ownerId: owner.user.id, name: "Espaço" } });
    await createUser("CUSTOMER", { email: "ana.silva@example.test" });
    const invite = (email: string) =>
      request(app).post("/api/v1/professionals/invite").set("Authorization", `Bearer ${owner.token}`).send({ businessId: business.id, name: "Ana", email });

    expect((await invite("ANA.SILVA@example.test")).status).toBe(409);
    const created = await invite("ana_silva@example.test");
    expect(created.status).toBe(201);
    expect(await prisma.user.count({ where: { email: "ana_silva@example.test", role: "EMPLOYEE" } })).toBe(1);
  });
});

describe("login Google e Apple", () => {
  it("Google: um endereço verificado com _ não abre a conta de outra pessoa", async () => {
    await createUser("OWNER", { email: "ana.silva@outlook.test" });
    stubGoogle("ana_silva@outlook.test");
    const response = await googleLogin();
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("SOCIAL_NOT_REGISTERED");
  });

  it("Google: o próprio endereço entra, incluindo numa conta antiga guardada com maiúsculas", async () => {
    const legacy = await createUser("OWNER", { email: "Ana.Silva@Outlook.test" });
    stubGoogle("ana.silva@outlook.test");
    const response = await googleLogin();
    expect(response.status).toBe(200);
    expect(response.body.data.user.id).toBe(legacy.user.id);
  });

  it("Google: contas antigas ambíguas (só diferem nas maiúsculas, nenhuma exata) não abrem nenhuma", async () => {
    await createUser("OWNER", { email: "Amb@outlook.test" });
    await createUser("OWNER", { email: "AMB@outlook.test" });
    stubGoogle("amb@outlook.test");
    expect((await googleLogin()).status).toBe(401);
  });

  it("Apple: um endereço verificado com _ não abre a conta de outra pessoa; o próprio entra", async () => {
    const victim = await createUser("CUSTOMER", { email: "ana.silva@icloud.test" });
    apple.stub();

    const attack = await request(app).post("/api/v1/auth/apple").send({ identityToken: apple.token("ana_silva@icloud.test"), mode: "login" });
    expect(attack.status).toBe(401);
    expect(attack.body.error.code).toBe("SOCIAL_NOT_REGISTERED");

    const own = await request(app).post("/api/v1/auth/apple").send({ identityToken: apple.token("ANA.SILVA@icloud.test"), mode: "login" });
    expect(own.status).toBe(200);
    expect(own.body.data.user.id).toBe(victim.user.id);
  });
});
