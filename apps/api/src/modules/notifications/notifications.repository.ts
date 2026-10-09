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
