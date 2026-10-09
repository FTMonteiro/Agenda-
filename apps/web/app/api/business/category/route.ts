import { matchBusinessCategory, type BusinessDTO } from "@slotix/types";
import { requireAuth } from "@/lib/auth";
import { apiCall, errorResponse } from "@/lib/dashboard-api";

// Just the type of the signed-in user's space — what the forms need to show examples that
// fit it (see lib/category-examples), without loading the whole settings payload.
export async function GET() {
  try {
    const user = await requireAuth();
    const business = await apiCall<BusinessDTO>(`/businesses/${user.businessId}`);

    return Response.json({ category: matchBusinessCategory(business.category) ?? "" });
  } catch (error) {
    return errorResponse(error, "Não foi possível carregar o tipo de espaço.");
  }
}
