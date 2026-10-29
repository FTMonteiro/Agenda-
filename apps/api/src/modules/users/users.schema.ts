import { z } from "zod";
import { imageUrl, personName, phone } from "../../shared/validation/fields";

export const updateProfileSchema = z.object({
  name: personName.optional(),
  phone: phone.optional(),
  avatarUrl: imageUrl.optional(),
});

export const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
