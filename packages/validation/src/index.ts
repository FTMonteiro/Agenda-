import { z } from "zod";

// Emails are compared case-insensitively everywhere: "Ana@x.ao" and "ana@x.ao" are one person.
const email = z.string().trim().toLowerCase().email().max(254);
// bcrypt only reads the first 72 bytes; the ceiling also keeps hashing cheap to refuse.
const password = z.string().min(8).max(128);

// An ISO 8601 UTC timestamp, with or without seconds — what Zod 3's datetime() accepted.
// Zod 4's requires the seconds, so minute precision is allowed explicitly to keep the
// API contract unchanged.
// The metadata keeps the generated OpenAPI docs describing it as one date-time string.
export const isoDateTime = z.union([z.iso.datetime(), z.iso.datetime({ precision: -1 })]).meta({ type: "string", format: "date-time" });

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  password,
  phone: z.string().trim().max(40).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).max(4000),
});

export const createAppointmentSchema = z.object({
  businessId: z.guid(),
  serviceId: z.guid(),
  professionalId: z.guid(),
  scheduledAt: isoDateTime,
  notes: z.string().max(1000).optional(),
});

export const rescheduleAppointmentSchema = z.object({
  scheduledAt: isoDateTime,
});

export const createFavoriteSchema = z.object({
  businessId: z.guid(),
});

export const createReviewSchema = z.object({
  appointmentId: z.guid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const paymentMethodSchema = z.enum(["CASH", "CARD", "MULTICAIXA", "BANK_TRANSFER", "OTHER"]);

export const createPaymentSchema = z.object({
  appointmentId: z.guid(),
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
