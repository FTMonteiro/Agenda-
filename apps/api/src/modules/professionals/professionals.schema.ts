import { isoDateTime } from "@slotix/validation";
import { z } from "zod";
import { imageUrl, longText, personName, phone, shortText } from "../../shared/validation/fields";

export const createProfessionalSchema = z.object({
  businessId: z.guid(),
  userId: z.guid(),
  bio: longText(1000).optional(),
  specialty: shortText(120).optional(),
  imageUrl: imageUrl.optional(),
});

export const inviteProfessionalSchema = z.object({
  businessId: z.guid(),
  name: personName,
  email: z.string().trim().toLowerCase().email().max(254),
  phone: phone.optional(),
  specialty: shortText(120).optional(),
  imageUrl: imageUrl.optional(),
});

export const updateProfessionalSchema = z.object({
  bio: longText(1000).optional(),
  specialty: shortText(120).optional(),
  imageUrl: imageUrl.optional(),
  active: z.boolean().optional(),
});

export const createBlockSchema = z
  .object({
    startAt: isoDateTime,
    endAt: isoDateTime,
    reason: longText(500).optional(),
  })
  .refine((block) => new Date(block.endAt) > new Date(block.startAt), {
    message: "endAt tem de ser depois de startAt",
  });

export type CreateProfessionalInput = z.infer<typeof createProfessionalSchema>;
export type InviteProfessionalInput = z.infer<typeof inviteProfessionalSchema>;
export type UpdateProfessionalInput = z.infer<typeof updateProfessionalSchema>;
export type CreateBlockInput = z.infer<typeof createBlockSchema>;
