import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";

function buildWhere(words: string[]): Prisma.BusinessWhereInput {
  // Matches if ANY query word appears anywhere relevant (recall over precision — see
  // shared/utils/textMatch.ts for why). Each business's own matchedService selection in
  // search.service.ts is what actually surfaces the most relevant service for display.
  return {
    OR: words.map((word) => ({
      OR: [
        { name: { contains: word, mode: "insensitive" } },
        { description: { contains: word, mode: "insensitive" } },
        { category: { contains: word, mode: "insensitive" } },
        // Where the business is: searching "Cacuaco" finds the businesses there.
        { address: { contains: word, mode: "insensitive" } },
        { bairro: { contains: word, mode: "insensitive" } },
        { municipio: { contains: word, mode: "insensitive" } },
        { provincia: { contains: word, mode: "insensitive" } },
        {
          services: {
            some: {
              active: true,
              OR: [
                { name: { contains: word, mode: "insensitive" } },
                { description: { contains: word, mode: "insensitive" } },
                { category: { contains: word, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    })),
  };
}

export const searchRepository = {
  findCandidates(words: string[]) {
    return prisma.business.findMany({
      where: buildWhere(words),
      include: {
        reviews: { select: { rating: true } },
        _count: { select: { favorites: true } },
        services: { where: { active: true } },
      },
    });
  },
};
