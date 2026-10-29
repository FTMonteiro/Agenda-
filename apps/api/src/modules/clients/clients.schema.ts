import { z } from "zod";
import { personName, phone } from "../../shared/validation/fields";

export const createWalkInClientSchema = z.object({
  businessId: z.guid(),
  name: personName,
  phone: phone.pipe(z.string().min(1)),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
});

export const updateWalkInClientSchema = z.object({
  name: personName.optional(),
  phone: phone.pipe(z.string().min(1)).optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  active: z.boolean().optional(),
});

export type CreateWalkInClientInput = z.infer<typeof createWalkInClientSchema>;
export type UpdateWalkInClientInput = z.infer<typeof updateWalkInClientSchema>;
