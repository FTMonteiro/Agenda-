import type { PlaceDTO } from "@slotix/types";
import { requireOwner } from "@/lib/auth";
import { apiCall, errorResponse } from "@/lib/dashboard-api";

// Address search for the settings map. Goes through the API (never straight to
// OpenStreetMap from the browser) so its cache and rate limit apply.
export async function GET(request: Request) {
  try {
    await requireOwner();
    const query = new URL(request.url).searchParams.get("q") ?? "";
    return Response.json(await apiCall<PlaceDTO[]>(`/geo/search?q=${encodeURIComponent(query)}`));
  } catch (error) {
    return errorResponse(error, "Não foi possível procurar essa morada.");
  }
}
