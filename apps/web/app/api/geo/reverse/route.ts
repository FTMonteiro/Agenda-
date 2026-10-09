import type { PlaceDTO } from "@slotix/types";
import { requireOwner } from "@/lib/auth";
import { apiCall, errorResponse } from "@/lib/dashboard-api";

// The address and region of a point picked on the settings map; null when OpenStreetMap
// has nothing there.
export async function GET(request: Request) {
  try {
    await requireOwner();
    const params = new URL(request.url).searchParams;
    const query = `latitude=${encodeURIComponent(params.get("latitude") ?? "")}&longitude=${encodeURIComponent(params.get("longitude") ?? "")}`;
    return Response.json(await apiCall<PlaceDTO | null>(`/geo/reverse?${query}`));
  } catch (error) {
    return errorResponse(error, "Não foi possível obter a morada desse ponto.");
  }
}
