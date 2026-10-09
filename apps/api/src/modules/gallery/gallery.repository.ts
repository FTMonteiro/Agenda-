import { prisma } from "../../config/database";

export const galleryRepository = {
  create(data: { businessId: string; url: string; path: string; position: number; caption?: string }) {
    return prisma.galleryImage.create({ data });
  },

  findByBusiness(businessId: string) {
    return prisma.galleryImage.findMany({ where: { businessId }, orderBy: { position: "asc" } });
  },

  findById(id: string) {
    return prisma.galleryImage.findUnique({ where: { id } });
  },

  countByBusiness(businessId: string) {
    return prisma.galleryImage.count({ where: { businessId } });
  },

  delete(id: string) {
    return prisma.galleryImage.delete({ where: { id } });
  },

  reorder(orderedIds: string[]) {
    return prisma.$transaction(orderedIds.map((id, position) => prisma.galleryImage.update({ where: { id }, data: { position } })));
  },
};
