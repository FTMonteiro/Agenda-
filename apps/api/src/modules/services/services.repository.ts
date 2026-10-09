import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";

export const servicesRepository = {
  create(data: {
    businessId: string;
    name: string;
    description?: string;
    price: Prisma.Decimal | number;
    duration: number;
    category?: string;
    imageUrl?: string;
  }) {
    return prisma.service.create({ data });
  },

  findByBusiness(businessId: string) {
    return prisma.service.findMany({ where: { businessId }, orderBy: { createdAt: "desc" } });
  },

  findById(id: string) {
    return prisma.service.findUnique({ where: { id } });
  },

  update(
    id: string,
    data: {
      name?: string;
      description?: string;
      price?: Prisma.Decimal | number;
      duration?: number;
      category?: string;
      imageUrl?: string;
      active?: boolean;
    },
  ) {
    return prisma.service.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.service.delete({ where: { id } });
  },
};
