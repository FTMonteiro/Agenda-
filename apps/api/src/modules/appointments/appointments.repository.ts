import { prisma } from "../../config/database";
import type { AppointmentStatus, Prisma } from "@prisma/client";
import { requireId } from "../../shared/utils/requireId";

const ACTIVE_STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED"];

type Db = Prisma.TransactionClient;

export const appointmentsRepository = {
  // Runs `fn` in a transaction holding a per-professional lock, so two bookings for the
  // same professional (e.g. one from the app and one at the counter) can't both pass the
  // availability check and then both insert. The lock is released on commit/rollback.
  withProfessionalLock<T>(professionalId: string, fn: (db: Db) => Promise<T>) {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${professionalId}))`;
      return fn(tx);
    });
  },

  create(
    data: {
      businessId: string;
      clientId?: string;
      walkInClientId?: string;
      serviceId: string;
      professionalId: string;
      scheduledAt: Date;
      durationMinutes: number;
      price: Prisma.Decimal | number;
      notes?: string;
    },
    db: Db = prisma,
  ) {
    return db.appointment.create({ data });
  },

  findById(id: string) {
    return prisma.appointment.findUnique({ where: { id } });
  },

  // Updates only while the appointment is still in one of `from` — checked by the database
  // in the same statement, so a concurrent change (a cancel racing a payment) can't be
  // overwritten. Returns null when the status had already moved on.
  async updateIfStatus(id: string, from: AppointmentStatus[], data: Prisma.AppointmentUpdateManyMutationInput, db: Db = prisma) {
    const { count } = await db.appointment.updateMany({ where: { id, status: { in: from } }, data });
    return count === 1 ? db.appointment.findUniqueOrThrow({ where: { id } }) : null;
  },

  findByClient(clientId: string) {
    return prisma.appointment.findMany({ where: { clientId: requireId(clientId, "clientId") }, orderBy: { scheduledAt: "desc" } });
  },

  findByWalkInClient(walkInClientId: string) {
    return prisma.appointment.findMany({ where: { walkInClientId }, orderBy: { scheduledAt: "desc" } });
  },

  findByBusiness(businessId: string) {
    return prisma.appointment.findMany({ where: { businessId }, orderBy: { scheduledAt: "desc" } });
  },

  // Returns active-status appointments for the professional that could possibly overlap the
  // [windowStart, windowEnd] range. Exact interval overlap is computed by the service layer,
  // since each candidate's own duration can't be added to `scheduledAt` inside a Prisma filter.
  findActiveInWindow(professionalId: string, windowStart: Date, windowEnd: Date, excludeId?: string, db: Db = prisma) {
    return db.appointment.findMany({
      where: {
        professionalId,
        status: { in: ACTIVE_STATUSES },
        id: excludeId ? { not: excludeId } : undefined,
        scheduledAt: { gte: windowStart, lt: windowEnd },
      },
    });
  },

  update(id: string, data: Partial<{ scheduledAt: Date; durationMinutes: number; status: AppointmentStatus }>, db: Db = prisma) {
    return db.appointment.update({ where: { id }, data });
  },
};
