import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";

export interface BusinessFilters {
  category?: string;
  provincia?: string;
  municipio?: string;
  bairro?: string;
  search?: string;
  // A viewer position with a radius: lets the database discard everything outside the
  // square around the circle before the exact distance is computed in JS.
  near?: { latitude: number; longitude: number; radiusKm: number };
  minPrice?: number;
  maxPrice?: number;
}

const KM_PER_DEGREE = 111.32;

function buildWhere(filters: BusinessFilters): Prisma.BusinessWhereInput {
  const where: Prisma.BusinessWhereInput = {};

  if (filters.category) {
    where.category = { equals: filters.category, mode: "insensitive" };
  }

  if (filters.provincia) {
    where.provincia = { equals: filters.provincia, mode: "insensitive" };
  }

  if (filters.municipio) {
    where.municipio = { equals: filters.municipio, mode: "insensitive" };
  }

  if (filters.bairro) {
    where.bairro = { equals: filters.bairro, mode: "insensitive" };
  }

  if (filters.near) {
    const { latitude, longitude, radiusKm } = filters.near;
    const latitudeDelta = radiusKm / KM_PER_DEGREE;
    // A degree of longitude shrinks towards the poles; the floor keeps the division sane.
    const longitudeDelta = radiusKm / (KM_PER_DEGREE * Math.max(Math.cos((latitude * Math.PI) / 180), 0.01));

    // A business with no pin can't be judged against a radius: kept, as before.
    where.AND = [
      {
        OR: [
          { latitude: null },
          { longitude: null },
          {
            latitude: { gte: latitude - latitudeDelta, lte: latitude + latitudeDelta },
            longitude: { gte: longitude - longitudeDelta, lte: longitude + longitudeDelta },
          },
        ],
      },
    ];
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.services = {
      some: {
        active: true,
        price: {
          gte: filters.minPrice,
          lte: filters.maxPrice,
        },
      },
    };
  }

  return where;
}

// Rating and favorite count aren't stored on the business (avoids duplicating what
// `reviews`/`favorites` already hold): every read carries what toBusinessDTO needs.
export const businessInclude = {
  reviews: { select: { rating: true } },
  _count: { select: { favorites: true } },
} satisfies Prisma.BusinessInclude;

export const businessesRepository = {
  create(data: {
    ownerId: string;
    name: string;
    description?: string;
    address?: string;
    phone?: string;
    category?: string;
    imageUrl?: string;
    latitude?: number;
    longitude?: number;
    provincia?: string | null;
    municipio?: string | null;
    distrito?: string | null;
    bairro?: string | null;
    rua?: string | null;
  }) {
    return prisma.business.create({ data, include: businessInclude });
  },

  // Anyone can become an OWNER by creating their first business — there's no separate
  // "become a business" step. Promotion and creation happen in one transaction so a
  // failure partway never leaves a promoted-but-business-less user.
  async createAndPromoteOwner(data: {
    ownerId: string;
    name: string;
    description?: string;
    address?: string;
    phone?: string;
    category?: string;
    imageUrl?: string;
    latitude?: number;
    longitude?: number;
    provincia?: string | null;
    municipio?: string | null;
    distrito?: string | null;
    bairro?: string | null;
    rua?: string | null;
  }) {
    const [, business] = await prisma.$transaction([
      prisma.user.update({ where: { id: data.ownerId }, data: { role: "OWNER" } }),
      prisma.business.create({ data, include: businessInclude }),
    ]);
    return business;
  },

  // Rating isn't stored (avoids duplicating what `reviews` already holds), so callers
  // needing a minimum-rating filter must compute it from `reviews` after this returns.
  findManyFiltered(filters: BusinessFilters) {
    return prisma.business.findMany({
      where: buildWhere(filters),
      include: businessInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  // The localities that actually have businesses, with how many each has — what the app
  // offers as "where do you want to look", instead of a hand-written list of places.
  countByLocality() {
    return prisma.business.groupBy({
      by: ["provincia", "municipio", "bairro"],
      where: { provincia: { not: null } },
      _count: { _all: true },
      orderBy: [{ provincia: "asc" }, { municipio: "asc" }, { bairro: "asc" }],
    });
  },

  findById(id: string) {
    return prisma.business.findUnique({ where: { id }, include: businessInclude });
  },

  findByOwner(ownerId: string) {
    return prisma.business.findMany({ where: { ownerId }, include: businessInclude, orderBy: { createdAt: "asc" } });
  },

  update(
    id: string,
    data: {
      name?: string;
      description?: string;
      address?: string;
      phone?: string;
      category?: string;
      imageUrl?: string;
      logoUrl?: string;
      latitude?: number;
      longitude?: number;
      provincia?: string | null;
      municipio?: string | null;
      distrito?: string | null;
      bairro?: string | null;
      rua?: string | null;
    },
  ) {
    return prisma.business.update({ where: { id }, data, include: businessInclude });
  },

  delete(id: string) {
    return prisma.business.delete({ where: { id } });
  },

  findHours(businessId: string) {
    return prisma.businessHours.findMany({ where: { businessId }, orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }] });
  },

  // Replaces the whole week atomically — simpler and less error-prone than diffing
  // individual rows, and the week is small enough that this is cheap either way.
  setHours(businessId: string, hours: { dayOfWeek: number; startMinute: number; endMinute: number }[]) {
    return prisma.$transaction([
      prisma.businessHours.deleteMany({ where: { businessId } }),
      prisma.businessHours.createMany({ data: hours.map((h) => ({ businessId, ...h })) }),
    ]);
  },
};
