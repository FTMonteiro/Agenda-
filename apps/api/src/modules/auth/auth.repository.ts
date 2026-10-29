import { prisma } from "../../config/database";
import { Prisma } from "@prisma/client";
import type { Role } from "@slotix/types";
import { normalizeEmail } from "../../shared/utils/email";
import { requireId } from "../../shared/utils/requireId";

// The exact statement every email lookup runs (exported so tests can check its SQL).
export function emailLookupQuery(email: string, options: { includeDeleted: boolean }): Prisma.Sql {
  const normalized = normalizeEmail(email);
  const deleted = options.includeDeleted ? Prisma.empty : Prisma.sql`AND "deletedAt" IS NULL`;
  return Prisma.sql`SELECT "id", "email" FROM "users" WHERE lower("email") = lower(${normalized}) ${deleted} ORDER BY "createdAt" ASC LIMIT 10`;
}

async function findByEmail(email: string, options: { includeDeleted: boolean }): Promise<{ id: string | null; count: number; ambiguous: boolean }> {
  const normalized = normalizeEmail(email);
  const rows = await prisma.$queryRaw<{ id: string; email: string }[]>(emailLookupQuery(email, options));

  const exact = rows.find((row) => row.email === normalized);
  if (exact) return { id: exact.id, count: rows.length, ambiguous: false };
  if (rows.length === 1) return { id: rows[0].id, count: 1, ambiguous: false };
  if (rows.length > 1) console.warn(`[auth] ${rows.length} contas diferem só nas maiúsculas do email; pesquisa recusada.`);
  return { id: null, count: rows.length, ambiguous: rows.length > 1 };
}

export const authRepository = {
  /*
   * Looking an account up by email. The address is compared for EQUALITY only —
   * `lower("email") = lower($1)`, a bound parameter — never with LIKE/ILIKE, where `_`
   * and `%` are wildcards (Prisma's `mode: "insensitive"` compiles to ILIKE, which let a
   * Google address like `ana_silva@…` open the account of `ana.silva@…`).
   *
   * lower() on both sides keeps finding accounts registered before addresses were stored
   * lowercased. If such old rows differ only in case, the one stored exactly as asked wins;
   * when none is exact and several match, the lookup is ambiguous and nothing is returned.
   */
  async findUserByEmail(email: string) {
    const match = await findByEmail(email, { includeDeleted: false });
    return match.ambiguous || !match.id ? null : prisma.user.findUnique({ where: { id: match.id } });
  },

  // Whether any account — deleted ones included, their row keeps the address unique — uses
  // this address in any capitalisation. Registration and invites refuse it if so.
  async isEmailTaken(email: string): Promise<boolean> {
    const match = await findByEmail(email, { includeDeleted: true });
    return match.count > 0;
  },

  findUserById(id: string) {
    return prisma.user.findFirst({ where: { id: requireId(id, "userId"), deletedAt: null } });
  },

  createUser(data: { name: string; email: string; passwordHash: string; phone?: string; role?: Role }) {
    return prisma.user.create({ data });
  },

  // A Google sign-up from the dashboard: the owner and their first business are created
  // together, so a failure never leaves an account that can't open the dashboard.
  createOwnerWithBusiness(data: { name: string; email: string; passwordHash: string; avatarUrl?: string; company: string; category: string }) {
    const { company, category, ...user } = data;
    return prisma.user.create({
      data: { ...user, role: "OWNER", ownedBusinesses: { create: { name: company, category } } },
    });
  },

  setAvatarUrl(id: string, avatarUrl: string) {
    return prisma.user.update({ where: { id }, data: { avatarUrl } });
  },

  /*
   * A session is one refresh_tokens row: its id is the session id (`sid`) every token of
   * the session carries, and a refresh rotates the row in place (new hash, new expiry)
   * instead of adding rows. Ending a session revokes its row, which also ends its access
   * tokens — no extra column needed, so this runs on the existing schema.
   */
  createSession(data: { id: string; userId: string; tokenHash: string; expiresAt: Date }) {
    return prisma.refreshToken.create({ data });
  },

  findSession(id: string) {
    return prisma.refreshToken.findUnique({ where: { id } });
  },

  // Only if the row still holds the token being rotated: of two concurrent refreshes with
  // the same token, one wins and the other finds nothing to update.
  async rotateSession(id: string, currentHash: string, next: { tokenHash: string; expiresAt: Date }): Promise<boolean> {
    const { count } = await prisma.refreshToken.updateMany({ where: { id, tokenHash: currentHash, revokedAt: null }, data: next });
    return count === 1;
  },

  // Revoked or not: a revoked token presented again is how reuse (theft) is detected. An
  // unrevoked row comes first — tokens issued before jti existed could share a hash, and an
  // old revoked twin must not make a live token look reused.
  findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findFirst({ where: { tokenHash }, orderBy: [{ revokedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }] });
  },

  findActiveRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  },

  revokeRefreshToken(id: string) {
    return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  },

  // Logout: only the session the request was made with (by its sid, or, for sessions
  // started before sids existed, by the refresh token the client hands back).
  revokeSession(userId: string, sessionId: string) {
    return prisma.refreshToken.updateMany({ where: { id: sessionId, userId: requireId(userId, "userId"), revokedAt: null }, data: { revokedAt: new Date() } });
  },

  revokeRefreshTokenByHash(userId: string, tokenHash: string) {
    return prisma.refreshToken.updateMany({ where: { userId: requireId(userId, "userId"), tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
  },

  // Every session of the account; their access tokens end with them (see isSessionActive).
  endAllSessions(userId: string) {
    return prisma.refreshToken.updateMany({ where: { userId: requireId(userId, "userId"), revokedAt: null }, data: { revokedAt: new Date() } });
  },

  revokeAllUserRefreshTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId: requireId(userId, "userId"), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
