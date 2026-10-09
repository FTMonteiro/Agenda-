import { prisma } from "../../config/database";

export const usersRepository = {
  // How many people use the app as customers — the ones who can favorite a business.
  countCustomers() {
    return prisma.user.count({ where: { role: "CUSTOMER", deletedAt: null } });
  },

  findById(id: string) {
    return prisma.user.findFirst({ where: { id, deletedAt: null } });
  },

  update(id: string, data: { name?: string; phone?: string; avatarUrl?: string }) {
    return prisma.user.update({ where: { id }, data });
  },

  updateLocation(id: string, latitude: number, longitude: number) {
    return prisma.user.update({ where: { id }, data: { latitude, longitude, locationUpdatedAt: new Date() } });
  },

  updatePasswordHash(id: string, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash } });
  },

  softDelete(id: string) {
    return prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  revokeAllRefreshTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
