import type { ProvinceDTO } from "@slotix/types";
import { requireOwner } from "@/lib/auth";
import { apiCall, errorResponse } from "@/lib/dashboard-api";

// Angola's provinces with their centres, for the settings map's "go to province" picker.
export async function GET() {
  try {
    await requireOwner();
    return Response.json(await apiCall<ProvinceDTO[]>("/geo/provinces"));
  } catch (error) {
    return errorResponse(error, "Não foi possível carregar as províncias.");
  }
}
