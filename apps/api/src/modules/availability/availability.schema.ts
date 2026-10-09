import { z } from "zod";

export const getAvailabilitySchema = z.object({
  businessId: z.string().uuid(),
  professionalId: z.string().uuid(),
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date tem de estar no formato YYYY-MM-DD"),
});

export type GetAvailabilityInput = z.infer<typeof getAvailabilitySchema>;
