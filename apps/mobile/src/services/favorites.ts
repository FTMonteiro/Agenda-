import type { FavoriteDTO } from "@slotix/types";
import { apiFetch } from "./api-client";

export async function listFavorites(): Promise<FavoriteDTO[]> {
  return apiFetch<FavoriteDTO[]>("/favorites");
}

export async function addFavorite(businessId: string): Promise<FavoriteDTO> {
  return apiFetch<FavoriteDTO>(`/favorites/${businessId}`, { method: "POST" });
}

export async function removeFavorite(businessId: string): Promise<void> {
  await apiFetch<{ deleted: boolean }>(`/favorites/${businessId}`, { method: "DELETE" });
}
