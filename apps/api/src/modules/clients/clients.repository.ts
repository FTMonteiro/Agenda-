import { prisma } from "../../config/database";

export const clientsRepository = {
  // clientId: { not: null } excludes walk-in appointments — those are counted separately
  // via findCompletedAppointmentsForWalkIn, never mixed into this User-derived list.
  async findCompletedAppointmentsByBusiness(businessId: string) {
    return prisma.appointment.findMany({
      where: { businessId, status: "COMPLETED", clientId: { not: null } },
      include: { client: true },
      orderBy: { scheduledAt: "desc" },
    });
  },

  // Every booking a registered user ever made at the business, whatever its status: a
  // customer belongs to the business's client list from the moment they book, not only
  // once a visit has been completed.
  async findAppointmentsWithClientByBusiness(businessId: string) {
    return prisma.appointment.findMany({
      where: { businessId, clientId: { not: null } },
      include: { client: true },
      orderBy: { scheduledAt: "desc" },
    });
  },

  async findCompletedAppointmentsForClient(businessId: string, clientId: string) {
    return prisma.appointment.findMany({
      where: { businessId, clientId, status: "COMPLETED" },
      include: { client: true },
      orderBy: { scheduledAt: "desc" },
    });
  },

  async findCompletedAppointmentsForWalkIn(businessId: string, walkInClientId: string) {
    return prisma.appointment.findMany({
      where: { businessId, walkInClientId, status: "COMPLETED" },
      orderBy: { scheduledAt: "desc" },
    });
  },

  countAppointmentsForWalkIn(walkInClientId: string) {
    return prisma.appointment.count({ where: { walkInClientId } });
  },

  createWalkIn(data: { businessId: string; name: string; phone: string; email?: string }) {
    return prisma.walkInClient.create({ data });
  },

  findWalkInsByBusiness(businessId: string) {
    return prisma.walkInClient.findMany({ where: { businessId }, orderBy: { name: "asc" } });
  },

  findWalkInById(id: string) {
    return prisma.walkInClient.findUnique({ where: { id } });
  },

  updateWalkIn(id: string, data: { name?: string; phone?: string; email?: string | null; active?: boolean }) {
    return prisma.walkInClient.update({ where: { id }, data });
  },

  deleteWalkIn(id: string) {
    return prisma.walkInClient.delete({ where: { id } });
  },
};
