import { z } from "zod";
import { BUSINESS_CATEGORIES } from "@slotix/types";
import { imageUrl, longText, phone, shortText } from "../../shared/validation/fields";

// Region names come from OpenStreetMap (see modules/geo), never from a fixed list; null
// clears one that no longer applies after the pin moves.
const regionName = z.string().trim().min(1).max(120).nullable().optional();

export const createBusinessSchema = z.object({
  name: shortText(120).pipe(z.string().min(2)),
  description: longText(2000).optional(),
  address: shortText(300).optional(),
  phone: phone.optional(),
  // One of the shared space types: it's what the app files the business under, so free
  // text here would leave the business out of every category.
  category: z.enum(BUSINESS_CATEGORIES, { message: "Tipo de espaço inválido." }).optional(),
  imageUrl: imageUrl.optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  provincia: regionName,
  municipio: regionName,
  distrito: regionName,
  bairro: regionName,
  rua: regionName,
});

export const updateBusinessSchema = createBusinessSchema.partial();

export const listBusinessesQuerySchema = z.object({
  category: z.string().max(60).optional(),
  // Locality filters, matched (case-insensitively) against the region stored with each
  // business.
  provincia: z.string().max(120).optional(),
  municipio: z.string().max(120).optional(),
  bairro: z.string().max(120).optional(),
  search: z.string().max(200).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  // Only used when both are present: distanceKm is computed on each result, and
  // radiusKm (if also given) filters out anything further away. No default radius is
  // applied — omit it and every result still gets a distance, just no filtering.
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().optional(),
  // Omitted keeps the existing default (newest first) — this is opt-in so nothing that
  // already calls this endpoint changes behavior. "bestPrice" isn't offered here: it
  // depends on a query-matched service, a concept that only exists in /search.
  sortBy: z.enum(["recommended", "nearest", "topRated", "mostFavorited"]).optional(),
  // "true" keeps only the businesses that many customers have favorited (see
  // popularThreshold in the service).
  popular: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// GET /businesses/:id — with the viewer's position the result carries distanceKm.
export const getBusinessQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

const businessHoursEntrySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
  })
  .refine((entry) => entry.endMinute > entry.startMinute, {
    message: "endMinute tem de ser maior do que startMinute",
  });

export const setBusinessHoursSchema = z.object({
  hours: z.array(businessHoursEntrySchema).max(50),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
export type GetBusinessQuery = z.infer<typeof getBusinessQuerySchema>;
export type ListBusinessesQuery = z.infer<typeof listBusinessesQuerySchema>;
export type SetBusinessHoursInput = z.infer<typeof setBusinessHoursSchema>;
export type BusinessHoursEntry = z.infer<typeof businessHoursEntrySchema>;
