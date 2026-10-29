import { z } from "zod";

export const getAvailabilitySchema = z.object({
  businessId: z.guid(),
  professionalId: z.guid(),
  serviceId: z.guid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date tem de estar no formato YYYY-MM-DD"),
});

export type GetAvailabilityInput = z.infer<typeof getAvailabilitySchema>;
