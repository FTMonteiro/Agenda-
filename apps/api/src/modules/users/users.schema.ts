import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

export const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
