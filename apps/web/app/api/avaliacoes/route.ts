import type { BusinessDTO, ReviewDTO } from "@slotix/types";
import { requireAuth } from "@/lib/auth";
import { apiCall, errorResponse } from "@/lib/dashboard-api";

// As estrelas que os clientes deram ao espaço na app: a média, quantas avaliações há,
// quantas de cada nota (5 a 1) e as mais recentes, com o comentário.
export async function GET() {
  try {
    const user = await requireAuth();

    const [business, reviews] = await Promise.all([
      apiCall<BusinessDTO>(`/businesses/${user.businessId}`),
      apiCall<ReviewDTO[]>(`/businesses/${user.businessId}/reviews`),
    ]);

    const distribution = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: reviews.filter((review) => review.rating === stars).length,
    }));

    return Response.json({
      success: true,
      average: business.ratingAvg,
      count: business.ratingCount,
      favorites: business.favoriteCount,
      distribution,
      recent: reviews.slice(0, 5).map((review) => ({
        id: review.id,
        clientName: review.clientName,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      })),
    });
  } catch (error) {
    return errorResponse(error, "Não foi possível carregar as avaliações.");
  }
}
