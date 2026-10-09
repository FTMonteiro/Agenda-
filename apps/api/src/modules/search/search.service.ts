import type { MatchedServiceDTO, PaginationMeta, SearchResultDTO } from "@slotix/types";
import { ValidationError } from "../../shared/errors";
import { compareNearest, compareRecommended, compareTopRated, weightedRating } from "../../shared/utils/ranking";
import { countMatchingWords, splitSearchWords } from "../../shared/utils/textMatch";
import { toBusinessDTO, type Coordinates } from "../businesses";
import { searchRepository } from "./search.repository";
import type { SearchQueryInput } from "./search.schema";

interface ServiceLike {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: { toNumber(): number };
}

// The service whose name/description/category best overlaps the query words wins; ties
// (including "no word overlap at all" — the business matched via its own name/category
// instead) fall back to the cheapest active service, as a representative starting price.
function pickMatchedService(words: string[], services: ServiceLike[]): MatchedServiceDTO | null {
  let best: ServiceLike | null = null;
  let bestScore = -1;

  for (const service of services) {
    const score = countMatchingWords(words, service.name, service.description, service.category);
    const currentBestPrice = best?.price.toNumber() ?? Infinity;
    if (score > bestScore || (score === bestScore && service.price.toNumber() < currentBestPrice)) {
      best = service;
      bestScore = score;
    }
  }

  if (!best) return null;
  return { id: best.id, name: best.name, price: best.price.toNumber() };
}

function priceOrInfinity(result: SearchResultDTO): number {
  return result.matchedService?.price ?? Infinity;
}

// Each mode sorts by exactly the one dimension its name promises — no hidden blending —
// so results stay predictable. "recommended"/"nearest"/"topRated" reuse the exact same
// comparators `businesses.list` offers (shared/utils/ranking.ts); "bestPrice" is
// search-only, since it depends on the matchedService concept.
function sortResults(results: SearchResultDTO[], sortBy: SearchQueryInput["sortBy"]): SearchResultDTO[] {
  const scored = results.map((result) => ({
    result,
    score: weightedRating(result.business.ratingAvg, result.business.ratingCount),
    distanceKm: result.business.distanceKm,
    ratingCount: result.business.ratingCount,
  }));

  switch (sortBy) {
    case "nearest":
      return scored.sort(compareNearest).map((entry) => entry.result);

    case "bestPrice":
      return scored.sort((a, b) => priceOrInfinity(a.result) - priceOrInfinity(b.result)).map((entry) => entry.result);

    case "topRated":
      return scored.sort(compareTopRated).map((entry) => entry.result);

    case "recommended":
    default:
      return scored.sort(compareRecommended).map((entry) => entry.result);
  }
}

export const searchService = {
  async search(query: SearchQueryInput): Promise<{ data: SearchResultDTO[]; meta: PaginationMeta }> {
    if (query.sortBy === "nearest" && (query.latitude === undefined || query.longitude === undefined)) {
      throw new ValidationError("latitude e longitude são obrigatórias para ordenar por 'nearest'.", "SEARCH_LOCATION_REQUIRED");
    }

    const words = splitSearchWords(query.q);
    if (words.length === 0) {
      throw new ValidationError("Termo de pesquisa inválido.", "SEARCH_INVALID_QUERY");
    }

    const viewerCoords: Coordinates | undefined =
      query.latitude !== undefined && query.longitude !== undefined ? { latitude: query.latitude, longitude: query.longitude } : undefined;

    const candidates = await searchRepository.findCandidates(words);

    const results: SearchResultDTO[] = candidates.map((business) => ({
      business: toBusinessDTO(business, viewerCoords),
      matchedService: pickMatchedService(words, business.services),
    }));

    const sorted = sortResults(results, query.sortBy);

    const total = sorted.length;
    const start = (query.page - 1) * query.limit;
    const page = sorted.slice(start, start + query.limit);

    return { data: page, meta: { page: query.page, limit: query.limit, total } };
  },
};
