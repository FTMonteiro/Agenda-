import { prisma } from "../../config/database";

export const reviewsRepository = {
  findByAppointment(appointmentId: string) {
    return prisma.review.findUnique({ where: { appointmentId } });
  },

  create(data: { businessId: string; clientId: string; appointmentId: string; rating: number; comment?: string }) {
    return prisma.review.create({ data, include: { client: true } });
  },

  findByBusiness(businessId: string) {
    return prisma.review.findMany({
      where: { businessId },
      include: { client: true },
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: string) {
    return prisma.review.findUnique({ where: { id }, include: { client: true } });
  },
};
