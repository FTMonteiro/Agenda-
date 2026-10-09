import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const createAppointmentSchema = z.object({
  businessId: z.string().uuid(),
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  notes: z.string().optional(),
});

export const rescheduleAppointmentSchema = z.object({
  scheduledAt: z.string().datetime(),
});

export const createFavoriteSchema = z.object({
  businessId: z.string().uuid(),
});

export const createReviewSchema = z.object({
  appointmentId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const paymentMethodSchema = z.enum(["CASH", "CARD", "MULTICAIXA", "BANK_TRANSFER", "OTHER"]);

export const createPaymentSchema = z.object({
  appointmentId: z.string().uuid(),
  method: paymentMethodSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
export type CreateFavoriteInput = z.infer<typeof createFavoriteSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
