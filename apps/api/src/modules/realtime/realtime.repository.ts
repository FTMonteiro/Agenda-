import { prisma } from "../../config/database";

export const realtimeRepository = {
  async findBusinessStaffUserIds(businessId: string): Promise<string[]> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true, professionals: { select: { userId: true } } },
    });
    if (!business) return [];
    return [business.ownerId, ...business.professionals.map((p) => p.userId)];
  },
};
