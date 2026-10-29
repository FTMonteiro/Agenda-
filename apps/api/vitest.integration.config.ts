import { defineConfig } from "vitest/config";
import { testEnv } from "./vitest.shared";

// Testes de integração contra um PostgreSQL local e descartável (ver tests/integration/
// globalSetup.ts, que recusa qualquer host que não seja local antes de tocar na base).
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    env: testEnv,
    globalSetup: ["tests/integration/globalSetup.ts"],
    // Uma única base partilhada, limpa entre testes: os ficheiros correm em série.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
