import type { PaginationMeta, SearchQuery, SearchResultDTO } from "@slotix/types";
import { apiFetchList, buildQuery } from "./api-client";

export async function search(query: SearchQuery): Promise<{ data: SearchResultDTO[]; meta: PaginationMeta }> {
  return apiFetchList<SearchResultDTO>(`/search${buildQuery(query)}`);
}
