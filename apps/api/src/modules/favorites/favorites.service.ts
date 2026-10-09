import type { FavoriteDTO } from "@slotix/types";
import { ConflictError, NotFoundError } from "../../shared/errors";
import { getBusinessOrThrow, toBusinessDTO } from "../businesses";
import { favoritesRepository } from "./favorites.repository";

function toFavoriteDTO(favorite: {
  id: string;
  businessId: string;
  createdAt: Date;
  business: Parameters<typeof toBusinessDTO>[0];
}): FavoriteDTO {
  return {
    id: favorite.id,
    businessId: favorite.businessId,
    business: toBusinessDTO(favorite.business),
    createdAt: favorite.createdAt.toISOString(),
  };
}

export const favoritesService = {
  async add(userId: string, businessId: string): Promise<FavoriteDTO> {
    await getBusinessOrThrow(businessId);

    const existing = await favoritesRepository.findByUserAndBusiness(userId, businessId);
    if (existing) {
      throw new ConflictError("Este negócio já está nos favoritos.", "FAVORITE_ALREADY_EXISTS");
    }

    const favorite = await favoritesRepository.create(userId, businessId);
    return toFavoriteDTO(favorite);
  },

  async listMine(userId: string): Promise<FavoriteDTO[]> {
    const favorites = await favoritesRepository.findByUser(userId);
    return favorites.map(toFavoriteDTO);
  },

  async remove(userId: string, businessId: string): Promise<void> {
    const favorite = await favoritesRepository.findByUserAndBusiness(userId, businessId);
    if (!favorite) {
      throw new NotFoundError("Este negócio não está nos favoritos.", "FAVORITE_NOT_FOUND");
    }

    await favoritesRepository.delete(favorite.id);
  },
};
