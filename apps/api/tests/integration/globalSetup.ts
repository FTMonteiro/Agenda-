import { execSync } from "node:child_process";
import { TEST_DATABASE_URL } from "../../vitest.shared";
import { assertLocalTestDatabase } from "./dbGuard";

// Aplica as migrações à base de teste local antes de qualquer teste. O URL é passado
// explicitamente, e o .env real nunca é lido (DOTENV_CONFIG_PATH aponta para nada).
export default function setup(): void {
  assertLocalTestDatabase(TEST_DATABASE_URL);
  execSync("npx prisma migrate deploy", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DOTENV_CONFIG_PATH: ".env.test-nao-existe" },
  });
}
