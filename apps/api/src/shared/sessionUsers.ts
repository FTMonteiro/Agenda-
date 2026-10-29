import { createHash } from "node:crypto";
import type { Role } from "@slotix/types";
import { prisma } from "../config/database";

/*
 * What a valid access token is checked against on every request: the account must still
 * exist and not be deleted, and the token's session (sid) must not have been ended. The role is read from the database
 * rather than trusted from the token (a token outlives a role change).
 *
 * Each answer is cached for a few seconds so a dashboard page firing ten requests costs
 * one lookup. Changes made by this process (logout, password change, account deleted,
 * promoted to owner) drop the entries at once; another instance may lag by at most CACHE_MS.
 */
const CACHE_MS = 15_000;
const MAX_ENTRIES = 10_000;

interface SessionUser {
  id: string;
  role: Role;
}

interface Entry<T> {
  value: T;
  expiresAt: number;
}

function cached<T>(cache: Map<string, Entry<T>>, key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return Promise.resolve(hit.value);
  return load().then((value) => {
    if (cache.size > MAX_ENTRIES) cache.clear();
    cache.set(key, { value, expiresAt: Date.now() + CACHE_MS });
    return value;
  });
}

const users = new Map<string, Entry<SessionUser | null>>();
const sessions = new Map<string, Entry<boolean>>();
const storedRefreshTokens = new Map<string, Entry<boolean>>();

export function findSessionUser(userId: string): Promise<SessionUser | null> {
  return cached(users, userId, async () => {
    const row = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, deletedAt: true } });
    return row && !row.deletedAt ? { id: row.id, role: row.role } : null;
  });
}

// A session is its refresh_tokens row (id = sid); it is live until that row is revoked.
// Rotation updates the row in place, so it stays live across refreshes.
export function isSessionActive(sessionId: string): Promise<boolean> {
  return cached(sessions, sessionId, async () => (await prisma.refreshToken.findFirst({ where: { id: sessionId, revokedAt: null }, select: { id: true } })) !== null);
}

// Tokens issued before typ/aud existed can't tell an access token from a refresh token by
// their claims; if the API's two JWT secrets were ever the same, an old refresh token would
// pass as an access token. Any token stored as a refresh token is refused as one.
export function isStoredRefreshToken(token: string): Promise<boolean> {
  const hash = createHash("sha256").update(token).digest("hex");
  return cached(storedRefreshTokens, hash, async () => (await prisma.refreshToken.findFirst({ where: { tokenHash: hash }, select: { id: true } })) !== null);
}

export function forgetSessionUser(...userIds: string[]): void {
  for (const id of userIds) users.delete(id);
}

export function forgetSession(...sessionIds: string[]): void {
  for (const id of sessionIds) sessions.delete(id);
}

// After revoking every session of a user (password change, "terminar todas as sessões"):
// their sessions' cached "live" answers can't be found by user, so the whole cache goes.
export function forgetAllSessions(): void {
  sessions.clear();
}
