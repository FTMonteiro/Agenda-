import { prisma } from "../../config/database";

export const notificationsRepository = {
  create(data: { userId: string; type: string; title: string; message: string }) {
    return prisma.notification.create({ data });
  },

  exists(userId: string, type: string, message: string) {
    return prisma.notification.findFirst({ where: { userId, type, message }, select: { id: true } }).then(Boolean);
  },

  // Agendamentos de clientes com conta que ainda não foram concluídos nem cancelados, com
  // o que é preciso para escrever o aviso (ver appointmentReminders.ts).
  findAppointmentsAwaitingReminders(from: Date, to: Date) {
    return prisma.appointment.findMany({
      where: {
        clientId: { not: null },
        status: { in: ["PENDING", "CONFIRMED"] },
        scheduledAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        clientId: true,
        scheduledAt: true,
        durationMinutes: true,
        business: { select: { name: true } },
        service: { select: { name: true } },
      },
    });
  },

  // Still open (nobody completed, cancelled or marked it) and booked before `before`.
  findOpenAppointmentsBefore(before: Date) {
    return prisma.appointment.findMany({
      where: { status: { in: ["PENDING", "CONFIRMED"] }, scheduledAt: { lt: before } },
      select: {
        id: true,
        clientId: true,
        scheduledAt: true,
        business: { select: { name: true } },
        service: { select: { name: true } },
      },
    });
  },

  // Only if it is still open: staff may have completed or cancelled it meanwhile.
  async markNoShow(id: string): Promise<boolean> {
    const { count } = await prisma.appointment.updateMany({
      where: { id, status: { in: ["PENDING", "CONFIRMED"] } },
      data: { status: "NO_SHOW" },
    });
    return count > 0;
  },

  // Who to tell about an appointment on the business side, and what to tell them.
  findAppointmentForNotice(id: string) {
    return prisma.appointment.findUnique({
      where: { id },
      select: {
        scheduledAt: true,
        client: { select: { name: true } },
        service: { select: { name: true } },
        professional: { select: { userId: true } },
        business: { select: { name: true, ownerId: true } },
      },
    });
  },

  savePushToken(userId: string, token: string) {
    return prisma.pushToken.upsert({ where: { token }, create: { userId, token }, update: { userId } });
  },

  deletePushToken(userId: string, token: string) {
    return prisma.pushToken.deleteMany({ where: { userId, token } });
  },

  deletePushTokens(tokens: string[]) {
    return prisma.pushToken.deleteMany({ where: { token: { in: tokens } } });
  },

  findPushTokens(userId: string) {
    return prisma.pushToken.findMany({ where: { userId }, select: { token: true } }).then((rows) => rows.map((row) => row.token));
  },

  findByUser(userId: string) {
    return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  },

  findById(id: string) {
    return prisma.notification.findUnique({ where: { id } });
  },

  markRead(id: string) {
    return prisma.notification.update({ where: { id }, data: { read: true } });
  },

  markAllRead(userId: string) {
    return prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  },
};
