import net from "node:net";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "./env";

// Node gives each address of a dual-stack host only 250ms to connect before moving on,
// and fails with ETIMEDOUT once it runs out of addresses. The TCP handshake to Neon
// (us-east-2) already takes ~200ms from here, so any latency spike broke new connections.
net.setDefaultAutoSelectFamilyAttemptTimeout(2000);

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
