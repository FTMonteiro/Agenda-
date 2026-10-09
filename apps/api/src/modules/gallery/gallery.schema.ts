import { z } from "zod";

export const uploadGalleryImageSchema = z.object({
  caption: z.string().max(500).optional(),
});

export type UploadGalleryImageInput = z.infer<typeof uploadGalleryImageSchema>;
