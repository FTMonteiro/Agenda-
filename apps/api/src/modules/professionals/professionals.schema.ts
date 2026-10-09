import { z } from "zod";

export const createProfessionalSchema = z.object({
  businessId: z.string().uuid(),
  userId: z.string().uuid(),
  bio: z.string().optional(),
  specialty: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export const inviteProfessionalSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export const updateProfessionalSchema = z.object({
  bio: z.string().optional(),
  specialty: z.string().optional(),
  imageUrl: z.string().url().optional(),
  active: z.boolean().optional(),
});

export const createBlockSchema = z
  .object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    reason: z.string().optional(),
  })
  .refine((block) => new Date(block.endAt) > new Date(block.startAt), {
    message: "endAt tem de ser depois de startAt",
  });

export type CreateProfessionalInput = z.infer<typeof createProfessionalSchema>;
export type InviteProfessionalInput = z.infer<typeof inviteProfessionalSchema>;
export type UpdateProfessionalInput = z.infer<typeof updateProfessionalSchema>;
export type CreateBlockInput = z.infer<typeof createBlockSchema>;
