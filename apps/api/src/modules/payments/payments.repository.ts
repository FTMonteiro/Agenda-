import { prisma } from "../../config/database";
import type { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { requireId } from "../../shared/utils/requireId";

class StaleAppointmentError extends Error {}

// Locks the appointment row until the transaction ends and returns its status (null when
// it doesn't exist). A cancel updates that same row, so the two can't interleave: whichever
// comes second sees the other's result.
async function lockAppointmentStatus(tx: Prisma.TransactionClient, appointmentId: string): Promise<string | null> {
  const rows = await tx.$queryRaw<{ status: string }[]>`SELECT "status"::text AS "status" FROM "appointments" WHERE "id" = ${appointmentId} FOR UPDATE`;
  return rows[0]?.status ?? null;
}

export const paymentsRepository = {
  // Staff receiving a payment in person: the payment is created already PAID and the
  // appointment moves straight to COMPLETED, atomically — there's no PENDING step for
  // this path (unlike the customer self-pay flow in `create`).
  receivePayment(data: {
    appointmentId: string;
    userId?: string;
    walkInClientId?: string;
    businessId: string;
    amount: Prisma.Decimal | number;
    currency: string;
    method: PaymentMethod;
  }) {
    // The appointment is completed first, and only if it is still CONFIRMED: that row lock
    // makes a concurrent cancel, or a second payment, wait and then find nothing to update.
    // null = the appointment had moved on; the transaction is rolled back with nothing written.
    return prisma
      .$transaction(async (tx) => {
        const { count } = await tx.appointment.updateMany({ where: { id: data.appointmentId, status: "CONFIRMED" }, data: { status: "COMPLETED" } });
        if (count !== 1) throw new StaleAppointmentError();
        return tx.payment.create({ data: { ...data, status: "PAID", paidAt: new Date() } });
      })
      .catch((error: unknown) => {
        if (error instanceof StaleAppointmentError) return null;
        throw error;
      });
  },

  findById(id: string) {
    return prisma.payment.findUnique({ where: { id } });
  },

  // The customer paying through the app: only while the appointment isn't cancelled, judged
  // under the row lock. null = it was cancelled (or vanished) in the meantime.
  createIfAppointmentPayable(data: {
    appointmentId: string;
    userId?: string;
    businessId: string;
    amount: Prisma.Decimal | number;
    currency: string;
    method: PaymentMethod;
  }) {
    return prisma
      .$transaction(async (tx) => {
        const status = await lockAppointmentStatus(tx, data.appointmentId);
        if (!status || status === "CANCELLED") throw new StaleAppointmentError();
        return tx.payment.create({ data });
      })
      .catch((error: unknown) => {
        if (error instanceof StaleAppointmentError) return null;
        throw error;
      });
  },

  // The business confirming a pending payment: the payment must still be PENDING and its
  // appointment not cancelled — both decided inside one transaction holding the row lock.
  markPaidIfAppointmentActive(paymentId: string, appointmentId: string) {
    return prisma.$transaction(async (tx) => {
      const status = await lockAppointmentStatus(tx, appointmentId);
      if (!status || status === "CANCELLED") return { outcome: "appointment_cancelled" as const };
      const { count } = await tx.payment.updateMany({ where: { id: paymentId, status: "PENDING" }, data: { status: "PAID", paidAt: new Date() } });
      if (count !== 1) return { outcome: "not_pending" as const };
      return { outcome: "paid" as const, payment: await tx.payment.findUniqueOrThrow({ where: { id: paymentId } }) };
    });
  },

  findByAppointmentId(appointmentId: string) {
    return prisma.payment.findUnique({ where: { appointmentId } });
  },

  findByUser(userId: string) {
    return prisma.payment.findMany({ where: { userId: requireId(userId, "userId") }, orderBy: { createdAt: "desc" } });
  },

  findByBusiness(businessId: string) {
    return prisma.payment.findMany({ where: { businessId }, orderBy: { createdAt: "desc" } });
  },

  // Revenue is recognized by paidAt (when the money actually moved), not createdAt —
  // matches the old dashboard's financial report exactly.
  findPaidByBusinessInRange(businessId: string, start: Date, end: Date) {
    return prisma.payment.findMany({
      where: { businessId, status: "PAID", paidAt: { gte: start, lt: end } },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        walkInClient: { select: { name: true } },
        appointment: {
          select: {
            id: true,
            scheduledAt: true,
            service: { select: { id: true, name: true } },
            professional: { select: { id: true, user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { paidAt: "desc" },
    });
  },

  // Same idea as appointmentsRepository.updateIfStatus: null when the payment was no longer
  // in `from` at the moment of writing.
  async updateStatusIfCurrent(id: string, from: PaymentStatus, data: { status: PaymentStatus; paidAt?: Date | null }) {
    const { count } = await prisma.payment.updateMany({ where: { id, status: from }, data });
    return count === 1 ? prisma.payment.findUniqueOrThrow({ where: { id } }) : null;
  },
};
