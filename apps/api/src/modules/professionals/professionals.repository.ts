import { prisma } from "../../config/database";

const includeForDTO = {
  user: true,
  appointments: { select: { review: { select: { rating: true } } } },
} as const;

export const professionalsRepository = {
  create(data: { businessId: string; userId: string; bio?: string; specialty?: string; imageUrl?: string }) {
    return prisma.professional.create({ data, include: includeForDTO });
  },

  // Invite flow: the User doesn't exist yet (that's the whole point — the owner is
  // inviting someone who has never signed up), so both rows are created together.
  async createWithNewUser(data: {
    businessId: string;
    name: string;
    email: string;
    passwordHash: string;
    phone?: string;
    specialty?: string;
    imageUrl?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: data.name, email: data.email, passwordHash: data.passwordHash, phone: data.phone, role: "EMPLOYEE" },
      });
      const professional = await tx.professional.create({
        data: { businessId: data.businessId, userId: user.id, specialty: data.specialty, imageUrl: data.imageUrl },
        include: includeForDTO,
      });
      return professional;
    });
  },

  findByBusiness(businessId: string) {
    return prisma.professional.findMany({ where: { businessId }, include: includeForDTO, orderBy: { createdAt: "desc" } });
  },

  findById(id: string) {
    return prisma.professional.findUnique({ where: { id }, include: includeForDTO });
  },

  findByUserId(userId: string) {
    return prisma.professional.findUnique({ where: { userId } });
  },

  update(id: string, data: { bio?: string; specialty?: string; imageUrl?: string; active?: boolean }) {
    return prisma.professional.update({ where: { id }, data, include: includeForDTO });
  },

  delete(id: string) {
    return prisma.professional.delete({ where: { id } });
  },

  createBlock(data: { professionalId: string; startAt: Date; endAt: Date; reason?: string }) {
    return prisma.professionalBlock.create({ data });
  },

  findBlocksByProfessional(professionalId: string) {
    return prisma.professionalBlock.findMany({ where: { professionalId }, orderBy: { startAt: "asc" } });
  },

  findBlocksInRange(professionalId: string, rangeStart: Date, rangeEnd: Date) {
    return prisma.professionalBlock.findMany({
      where: { professionalId, startAt: { lt: rangeEnd }, endAt: { gt: rangeStart } },
    });
  },

  findBlockById(id: string) {
    return prisma.professionalBlock.findUnique({ where: { id } });
  },

  deleteBlock(id: string) {
    return prisma.professionalBlock.delete({ where: { id } });
  },
};
