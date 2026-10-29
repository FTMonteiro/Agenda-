import { describe, expect, it } from "vitest";
import { parseEnv } from "../src/config/env";

const required = { DATABASE_URL: "postgresql://u:p@127.0.0.1:5432/x_test", JWT_ACCESS_SECRET: "a", JWT_REFRESH_SECRET: "b" };

describe("R-03: validação das variáveis de ambiente", () => {
  it("variáveis opcionais vazias contam como não definidas (como no .env.example)", () => {
    const result = parseEnv({ ...required, ENABLE_API_DOCS: "", JWT_OAUTH_SECRET: "", TRUST_PROXY: "", INTERNAL_PROXY_SECRET: " ", WEB_URL: "", APP_TIMEZONE: "" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.ENABLE_API_DOCS).toBeUndefined();
    expect(result.data.JWT_OAUTH_SECRET).toBeUndefined();
    expect(result.data.TRUST_PROXY).toBeUndefined();
    expect(result.data.INTERNAL_PROXY_SECRET).toBeUndefined();
    expect(result.data.APP_TIMEZONE).toBe("Africa/Luanda");
  });

  it("variáveis obrigatórias em falta ou vazias continuam a impedir o arranque", () => {
    for (const missing of ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const) {
      const empty = parseEnv({ ...required, [missing]: "" });
      expect(empty.success).toBe(false);
      if (!empty.success) expect(empty.error.flatten().fieldErrors[missing]?.[0]).toContain("obrigatória");
      const rest: Record<string, string> = { ...required };
      delete rest[missing];
      expect(parseEnv(rest).success).toBe(false);
    }
  });

  it("valores definidos mas inválidos continuam a ser recusados", () => {
    expect(parseEnv({ ...required, TRUST_PROXY: "true" }).success).toBe(false);
    expect(parseEnv({ ...required, ENABLE_API_DOCS: "sim" }).success).toBe(false);
    expect(parseEnv({ ...required, JWT_OAUTH_SECRET: "curto" }).success).toBe(false);
    expect(parseEnv({ ...required, INTERNAL_PROXY_SECRET: "curto" }).success).toBe(false);
    expect(parseEnv({ ...required, NODE_ENV: "staging" }).success).toBe(false);
  });

  it("valores válidos são aceites", () => {
    const result = parseEnv({ ...required, TRUST_PROXY: "1", ENABLE_API_DOCS: "true", JWT_OAUTH_SECRET: "x".repeat(32), INTERNAL_PROXY_SECRET: "y".repeat(32) });
    expect(result.success && result.data.TRUST_PROXY).toBe(1);
  });
});
