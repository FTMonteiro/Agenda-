import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z.string().min(1, "O parâmetro q é obrigatório."),
  // Optional and only used when both are present ("usa [a localização] apenas quando
  // necessário"): distance display/sort/"nearest" all require it, everything else works
  // without it.
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  sortBy: z.enum(["recommended", "nearest", "bestPrice", "topRated"]).default("recommended"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
