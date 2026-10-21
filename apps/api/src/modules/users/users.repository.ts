import { prisma } from "../../config/database";

export const usersRepository = {
  // How many people use the app as customers — the ones who can favorite a business.
  countCustomers() {
    return prisma.user.count({ where: { role: "CUSTOMER", deletedAt: null } });
  },

  findById(id: string) {
    return prisma.user.findFirst({ where: { id, deletedAt: null } });
  },

  update(id: string, data: { name?: string; phone?: string; avatarUrl?: string | null }) {
    return prisma.user.update({ where: { id }, data });
  },

  updateLocation(id: string, latitude: number, longitude: number) {
    return prisma.user.update({ where: { id }, data: { latitude, longitude, locationUpdatedAt: new Date() } });
  },

  updatePasswordHash(id: string, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash } });
  },

  // Deleting an account for good. An owner takes their spaces with them (and with the
  // spaces everything in them), and the accounts of the employees who worked there. The
  // user rows themselves stay, emptied of anything personal and with the email freed so
  // it can be registered again: appointments/reviews made as a client still point at them.
  async deleteAccount(id: string) {
    const businesses = await prisma.business.findMany({ where: { ownerId: id }, select: { id: true } });
    const businessIds = businesses.map((business) => business.id);
    const employees = await prisma.professional.findMany({ where: { businessId: { in: businessIds } }, select: { userId: true } });
    const userIds = [id, ...employees.map((employee) => employee.userId).filter((userId) => userId !== id)];
    const now = new Date();

    await prisma.$transaction([
      // Appointments first: they restrict the deletion of the services and professionals
      // that the business deletion cascades to.
      prisma.appointment.deleteMany({ where: { businessId: { in: businessIds } } }),
      prisma.business.deleteMany({ where: { id: { in: businessIds } } }),
      prisma.refreshToken.updateMany({ where: { userId: { in: userIds }, revokedAt: null }, data: { revokedAt: now } }),
      prisma.pushToken.deleteMany({ where: { userId: { in: userIds } } }),
      ...userIds.map((userId) =>
        prisma.user.update({
          where: { id: userId },
          data: {
            email: `eliminada-${userId}@contas.invalid`,
            name: "Conta eliminada",
            phone: null,
            avatarUrl: null,
            latitude: null,
            longitude: null,
            locationUpdatedAt: null,
            deletedAt: now,
          },
        }),
      ),
    ]);
  },

  revokeAllRefreshTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
