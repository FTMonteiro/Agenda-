import type { AuthTokensDTO, BusinessDTO, BusinessHoursEntryDTO, LocalityDTO, PaginationMeta } from "@slotix/types";
import { issueTokens } from "../auth/auth.service";
import { usersRepository } from "../users/users.repository";
import { AuthorizationError, NotFoundError, ValidationError } from "../../shared/errors";
import { haversineDistanceKm } from "../../shared/utils/geo";
import { compareNearest, compareRecommended, compareTopRated, weightedRating } from "../../shared/utils/ranking";
import { uploadGalleryImage } from "../gallery/gallery.storage";
import { businessesRepository } from "./businesses.repository";
import type { CreateBusinessInput, ListBusinessesQuery, SetBusinessHoursInput, UpdateBusinessInput } from "./businesses.schema";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

function ratingOf(reviews: { rating: number }[]): { ratingAvg: number | null; ratingCount: number } {
  if (reviews.length === 0) return { ratingAvg: null, ratingCount: 0 };
  const avg = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  return { ratingAvg: Math.round(avg * 10) / 10, ratingCount: reviews.length };
}

// viewerCoords is optional and only ever comes from an explicit lat/lng on the request —
// existing callers (favorites, reviews, etc.) that don't pass it keep getting
// distanceKm: null, unchanged from before this field existed.
export function toBusinessDTO(
  business: {
    id: string;
    ownerId: string;
    name: string;
    description: string | null;
    address: string | null;
    phone: string | null;
    category: string | null;
    imageUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    provincia: string | null;
    municipio: string | null;
    distrito: string | null;
    bairro: string | null;
    rua: string | null;
    createdAt: Date;
    updatedAt: Date;
    reviews?: { rating: number }[];
    _count?: { favorites: number };
  },
  viewerCoords?: Coordinates,
): BusinessDTO {
  const { ratingAvg, ratingCount } = ratingOf(business.reviews ?? []);
  const distanceKm =
    viewerCoords && business.latitude !== null && business.longitude !== null
      ? // To the metre: below 1 km the clients show metres ("850 m"), not a rounded "0.9 km".
        Math.round(haversineDistanceKm(viewerCoords.latitude, viewerCoords.longitude, business.latitude, business.longitude) * 1000) / 1000
      : null;

  return {
    id: business.id,
    ownerId: business.ownerId,
    name: business.name,
    description: business.description,
    address: business.address,
    phone: business.phone,
    category: business.category,
    imageUrl: business.imageUrl,
    latitude: business.latitude,
    longitude: business.longitude,
    provincia: business.provincia,
    municipio: business.municipio,
    distrito: business.distrito,
    bairro: business.bairro,
    rua: business.rua,
    ratingAvg,
    ratingCount,
    favoriteCount: business._count?.favorites ?? 0,
    distanceKm,
    createdAt: business.createdAt.toISOString(),
    updatedAt: business.updatedAt.toISOString(),
  };
}

export async function getBusinessOrThrow(businessId: string) {
  const business = await businessesRepository.findById(businessId);
  if (!business) throw new NotFoundError("Negócio não encontrado.", "BUSINESS_NOT_FOUND");
  return business;
}

const LOGO_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function assertBusinessOwner(business: { ownerId: string }, userId: string): void {
  if (business.ownerId !== userId) {
    throw new AuthorizationError("Não é o proprietário deste negócio.");
  }
}

// A business counts as popular once this share of the app's customers has favorited it —
// and never with fewer than MIN_POPULAR_FAVORITES, so that while the app has few users a
// single like (or none) is not "many".
const POPULAR_CUSTOMER_SHARE = 0.1;
const MIN_POPULAR_FAVORITES = 2;

export function popularThreshold(customerCount: number): number {
  return Math.max(MIN_POPULAR_FAVORITES, Math.ceil(customerCount * POPULAR_CUSTOMER_SHARE));
}

export const businessesService = {
  // Any authenticated user can create a business; if they aren't already an OWNER,
  // creating one promotes them (self-service "become a business owner", no separate
  // signup step). Since the caller's current access token still carries the old role
  // claim, fresh tokens are always returned alongside the business so the client can
  // swap them in immediately and use OWNER-gated endpoints without re-logging in.
  async create(ownerId: string, input: CreateBusinessInput): Promise<{ business: BusinessDTO; tokens: AuthTokensDTO }> {
    const user = await usersRepository.findById(ownerId);
    if (!user) throw new NotFoundError("Utilizador não encontrado.", "USER_NOT_FOUND");

    const business =
      user.role === "OWNER"
        ? await businessesRepository.create({ ownerId, ...input })
        : await businessesRepository.createAndPromoteOwner({ ownerId, ...input });

    const tokens = await issueTokens({ id: ownerId, role: "OWNER" });
    return { business: toBusinessDTO(business), tokens };
  },

  async list(query: ListBusinessesQuery): Promise<{ data: BusinessDTO[]; meta: PaginationMeta }> {
    if (query.sortBy === "nearest" && (query.latitude === undefined || query.longitude === undefined)) {
      throw new ValidationError("latitude e longitude são obrigatórias para ordenar por 'nearest'.", "BUSINESS_LOCATION_REQUIRED");
    }

    const viewerCoords = query.latitude !== undefined && query.longitude !== undefined ? { latitude: query.latitude, longitude: query.longitude } : undefined;

    const businesses = await businessesRepository.findManyFiltered({
      category: query.category,
      provincia: query.provincia,
      municipio: query.municipio,
      bairro: query.bairro,
      search: query.search,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      near: viewerCoords && query.radiusKm !== undefined ? { ...viewerCoords, radiusKm: query.radiusKm } : undefined,
    });

    const dtos = businesses.map((business) => toBusinessDTO(business, viewerCoords));

    let filtered = query.minRating !== undefined ? dtos.filter((dto) => (dto.ratingAvg ?? 0) >= query.minRating!) : dtos;
    // radiusKm only means anything alongside coordinates; a business without its own
    // lat/lng (distanceKm: null) can't be judged against a radius, so it's kept rather
    // than silently dropped.
    if (query.radiusKm !== undefined && viewerCoords) {
      filtered = filtered.filter((dto) => dto.distanceKm === null || dto.distanceKm <= query.radiusKm!);
    }

    if (query.popular) {
      const threshold = popularThreshold(await usersRepository.countCustomers());
      filtered = filtered.filter((dto) => dto.favoriteCount >= threshold);
    }

    // Omitted: keeps findManyFiltered's own order (newest first) — existing callers see
    // no change. Reuses the exact same comparators /search offers for the same 3 modes.
    if (query.sortBy) {
      const scored = filtered.map((dto) => ({
        dto,
        score: weightedRating(dto.ratingAvg, dto.ratingCount),
        distanceKm: dto.distanceKm,
        ratingCount: dto.ratingCount,
      }));
      const comparator = query.sortBy === "nearest" ? compareNearest : query.sortBy === "topRated" ? compareTopRated : compareRecommended;
      // "mostFavorited" is popularity, not rating: the favorite count decides, and the
      // rating only breaks ties between businesses with the same number of favorites.
      filtered = scored
        .sort((a, b) =>
          query.sortBy === "mostFavorited" ? b.dto.favoriteCount - a.dto.favoriteCount || compareTopRated(a, b) : comparator(a, b),
        )
        .map((entry) => entry.dto);
    }

    const total = filtered.length;
    const start = (query.page - 1) * query.limit;
    const page = filtered.slice(start, start + query.limit);

    return { data: page, meta: { page: query.page, limit: query.limit, total } };
  },

  async listMine(ownerId: string): Promise<BusinessDTO[]> {
    const businesses = await businessesRepository.findByOwner(ownerId);
    return businesses.map((b) => toBusinessDTO(b));
  },

  async getById(id: string, viewerCoords?: Coordinates): Promise<BusinessDTO> {
    const business = await getBusinessOrThrow(id);
    return toBusinessDTO(business, viewerCoords);
  },

  async listLocalities(): Promise<LocalityDTO[]> {
    const groups = await businessesRepository.countByLocality();
    return groups.map((group) => ({
      provincia: group.provincia!,
      municipio: group.municipio,
      bairro: group.bairro,
      count: group._count._all,
    }));
  },

  async update(id: string, ownerId: string, input: UpdateBusinessInput): Promise<BusinessDTO> {
    const business = await getBusinessOrThrow(id);
    assertBusinessOwner(business, ownerId);
    const updated = await businessesRepository.update(id, input);
    return toBusinessDTO(updated);
  },

  // The logo picked in the dashboard's Configurações: stored like a gallery image, but it
  // only becomes the business's imageUrl — it isn't added to the gallery.
  async uploadLogo(id: string, ownerId: string, file: { buffer: Buffer; mimetype: string }): Promise<BusinessDTO> {
    const business = await getBusinessOrThrow(id);
    assertBusinessOwner(business, ownerId);

    if (!LOGO_MIME_TYPES.has(file.mimetype)) {
      throw new ValidationError("Formato de imagem não suportado (use JPEG, PNG ou WEBP).", "BUSINESS_LOGO_INVALID_FILE_TYPE");
    }

    const { url } = await uploadGalleryImage(id, file);
    const updated = await businessesRepository.update(id, { imageUrl: url });
    return toBusinessDTO(updated);
  },

  async remove(id: string, ownerId: string): Promise<void> {
    const business = await getBusinessOrThrow(id);
    assertBusinessOwner(business, ownerId);
    await businessesRepository.delete(id);
  },

  async getHours(businessId: string): Promise<BusinessHoursEntryDTO[]> {
    await getBusinessOrThrow(businessId);
    const hours = await businessesRepository.findHours(businessId);
    return hours.map((h) => ({ dayOfWeek: h.dayOfWeek, startMinute: h.startMinute, endMinute: h.endMinute }));
  },

  async setHours(businessId: string, ownerId: string, input: SetBusinessHoursInput): Promise<BusinessHoursEntryDTO[]> {
    const business = await getBusinessOrThrow(businessId);
    assertBusinessOwner(business, ownerId);

    await businessesRepository.setHours(businessId, input.hours);
    return businessesService.getHours(businessId);
  },
};
