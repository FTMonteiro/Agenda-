import { defineConfig } from "vitest/config";
import { testEnv } from "./vitest.shared";

// Testes unitários: sem base de dados. Os de integração têm a sua própria configuração
// (vitest.integration.config.ts) porque precisam de um PostgreSQL de teste.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/integration/**", "node_modules/**"],
    env: testEnv,
  },
});
