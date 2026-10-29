import { describe, expect, it } from "vitest";
import { apiDocsEnabled, corsOrigins } from "../src/app/app";
import { signAccessToken, signTemporaryToken, verifyAccessToken, verifyTemporaryToken } from "../src/shared/utils/jwt";

const ID = "6f1c2b8e-0d4a-4c6e-9b1a-2f3d4e5f6a7b";

describe("corsOrigins", () => {
  it("em produção sem origens configuradas não aceita nenhuma (antes aceitava qualquer uma)", () => {
    expect(corsOrigins({ NODE_ENV: "production", WEB_URL: undefined, CORS_ORIGINS: undefined })).toEqual([]);
  });

  it("aceita só as origens configuradas, sem barra final", () => {
    expect(corsOrigins({ NODE_ENV: "production", WEB_URL: "https://painel.example/", CORS_ORIGINS: " https://app.example ,," })).toEqual([
      "https://painel.example",
      "https://app.example",
    ]);
  });

  it("em desenvolvimento aceita qualquer origem", () => {
    expect(corsOrigins({ NODE_ENV: "development", WEB_URL: undefined, CORS_ORIGINS: undefined })).toBe(true);
  });
});

describe("apiDocsEnabled", () => {
  it("o Swagger está desligado em produção, a menos que seja pedido", () => {
    expect(apiDocsEnabled({ NODE_ENV: "production", ENABLE_API_DOCS: undefined })).toBe(false);
    expect(apiDocsEnabled({ NODE_ENV: "production", ENABLE_API_DOCS: "true" })).toBe(true);
    expect(apiDocsEnabled({ NODE_ENV: "development", ENABLE_API_DOCS: undefined })).toBe(true);
  });
});

describe("tokens", () => {
  it("um token temporário OAuth não é aceite como access token, nem o contrário", () => {
    const temporary = signTemporaryToken({ sub: ID, role: "OWNER" }, "google-mobile-handoff", "2m");
    expect(() => verifyAccessToken(temporary)).toThrow();
    const access = signAccessToken({ sub: ID, role: "OWNER", sid: ID });
    expect(() => verifyTemporaryToken(access, "google-mobile-handoff")).toThrow();
  });

  it("um token temporário só serve para a sua finalidade", () => {
    const state = signTemporaryToken({ challenge: "x" }, "google-mobile-state", "10m");
    expect(() => verifyTemporaryToken(state, "google-mobile-handoff")).toThrow();
    expect(verifyTemporaryToken<{ challenge: string }>(state, "google-mobile-state").challenge).toBe("x");
  });

  it("dois access tokens emitidos no mesmo instante são diferentes", () => {
    expect(signAccessToken({ sub: ID, role: "OWNER", sid: ID })).not.toBe(signAccessToken({ sub: ID, role: "OWNER", sid: ID }));
  });
});

describe("tokens sem sessão", () => {
  it("um token do formato atual sem sid é recusado (não poderia ser revogado)", async () => {
    const jwt = (await import("jsonwebtoken")).default;
    const noSid = jwt.sign({ sub: ID, role: "OWNER", typ: "access" }, process.env.JWT_ACCESS_SECRET!, {
      algorithm: "HS256",
      audience: "agenda-plus:access",
      issuer: "agenda-plus-api",
      expiresIn: "15m",
    });
    expect(() => verifyAccessToken(noSid)).toThrow();
    expect(verifyAccessToken(signAccessToken({ sub: ID, role: "OWNER", sid: ID })).sid).toBe(ID);
  });
});
