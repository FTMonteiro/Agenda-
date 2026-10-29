import { z } from "zod";
import { imageUrl, longText, shortText } from "../../shared/validation/fields";

// The column is Decimal(10,2): 8 digits before the point. Anything above would overflow in
// the database (a 500) instead of being refused here (a 400).
const MAX_PRICE = 99_999_999.99;

export const createServiceSchema = z.object({
  businessId: z.guid(),
  name: shortText(120).pipe(z.string().min(2)),
  description: longText(2000).optional(),
  price: z.number().nonnegative().max(MAX_PRICE),
  duration: z.number().int().positive().max(24 * 60),
  category: shortText(60).optional(),
  imageUrl: imageUrl.optional(),
});

export const updateServiceSchema = z.object({
  name: shortText(120).pipe(z.string().min(2)).optional(),
  description: longText(2000).optional(),
  price: z.number().nonnegative().max(MAX_PRICE).optional(),
  duration: z.number().int().positive().max(24 * 60).optional(),
  category: shortText(60).optional(),
  imageUrl: imageUrl.optional(),
  active: z.boolean().optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
