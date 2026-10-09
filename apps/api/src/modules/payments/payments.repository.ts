import { prisma } from "../../config/database";
import type { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";

export const paymentsRepository = {
  create(data: {
    appointmentId: string;
    userId?: string;
    walkInClientId?: string;
    businessId: string;
    amount: Prisma.Decimal | number;
    currency: string;
    method: PaymentMethod;
  }) {
    return prisma.payment.create({ data });
  },

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
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({ data: { ...data, status: "PAID", paidAt: new Date() } });
      await tx.appointment.update({ where: { id: data.appointmentId }, data: { status: "COMPLETED" } });
      return payment;
    });
  },

  findById(id: string) {
    return prisma.payment.findUnique({ where: { id } });
  },

  findByAppointmentId(appointmentId: string) {
    return prisma.payment.findUnique({ where: { appointmentId } });
  },

  findByUser(userId: string) {
    return prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
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
        user: { select: { name: true } },
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

  updateStatus(id: string, data: { status: PaymentStatus; paidAt?: Date | null }) {
    return prisma.payment.update({ where: { id }, data });
  },
};
