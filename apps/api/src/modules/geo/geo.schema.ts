import { z } from "zod";

export const geoSearchQuerySchema = z.object({
  q: z.string().trim().min(3, "Escreva pelo menos 3 letras.").max(200),
});

export const geoReverseQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export type GeoSearchQuery = z.infer<typeof geoSearchQuerySchema>;
export type GeoReverseQuery = z.infer<typeof geoReverseQuerySchema>;
