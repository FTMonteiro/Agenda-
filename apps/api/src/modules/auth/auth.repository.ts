import { prisma } from "../../config/database";
import type { Role } from "@slotix/types";

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findFirst({ where: { email, deletedAt: null } });
  },

  // Includes soft-deleted accounts: the `email` column stays unique regardless of
  // deletedAt, so registration must check against this, not the login lookup above.
  findAnyByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findUserById(id: string) {
    return prisma.user.findFirst({ where: { id, deletedAt: null } });
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

  createRefreshToken(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    return prisma.refreshToken.create({ data });
  },

  findActiveRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  },

  revokeRefreshToken(id: string) {
    return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  },

  revokeAllUserRefreshTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
