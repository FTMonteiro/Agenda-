import { prisma } from "../../config/database";
import { businessInclude } from "../businesses/businesses.repository";
import { requireId } from "../../shared/utils/requireId";

export const favoritesRepository = {
  findByUserAndBusiness(userId: string, businessId: string) {
    return prisma.favorite.findUnique({ where: { userId_businessId: { userId, businessId } } });
  },

  create(userId: string, businessId: string) {
    return prisma.favorite.create({ data: { userId, businessId }, include: { business: { include: businessInclude } } });
  },

  findByUser(userId: string) {
    return prisma.favorite.findMany({
      where: { userId: requireId(userId, "userId") },
      include: { business: { include: businessInclude } },
      orderBy: { createdAt: "desc" },
    });
  },

  delete(id: string) {
    return prisma.favorite.delete({ where: { id } });
  },
};
