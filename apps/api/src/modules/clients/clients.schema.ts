import { z } from "zod";

export const createWalkInClientSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(2),
  phone: z.string().min(1),
  email: z.string().email().optional(),
});

export const updateWalkInClientSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  active: z.boolean().optional(),
});

export type CreateWalkInClientInput = z.infer<typeof createWalkInClientSchema>;
export type UpdateWalkInClientInput = z.infer<typeof updateWalkInClientSchema>;
