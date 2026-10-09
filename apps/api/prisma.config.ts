import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // Plain process.env instead of prisma/config's `env()` helper: that helper throws
  // immediately when the variable is unset, but `prisma generate` (unlike `migrate`/`db
  // pull`) never needs a live DATABASE_URL — it only reads schema.prisma. Some build
  // environments run `npm install` (and our postinstall generate) before injecting
  // runtime secrets, so this must not hard-fail when the variable is absent at that point.
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
