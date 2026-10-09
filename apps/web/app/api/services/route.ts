import type { ServiceDTO } from "@slotix/types";
import { requireAuth, requireOwner } from "@/lib/auth";
import { apiCall, errorJson, errorResponse, jsonBody } from "@/lib/dashboard-api";
import { parseServiceBody } from "./service-body";

// OWNER sees every service; EMPLOYEE only the active ones — same split as the old dashboard.
export async function GET() {
  try {
    const user = await requireAuth();
    const services = await apiCall<ServiceDTO[]>(`/services?businessId=${user.businessId}`);

    return Response.json(user.role === "OWNER" ? services : services.filter((service) => service.active));
  } catch (error) {
    return errorResponse(error, "Erro ao buscar serviços.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireOwner();
    const parsed = parseServiceBody(await request.json());
    if ("error" in parsed) return errorJson(parsed.error, 400);

    const { active, ...fields } = parsed;
    let service = await apiCall<ServiceDTO>("/services", jsonBody("POST", { businessId: user.businessId, ...fields }));

    // The API always creates a service active; the form can ask for an inactive one.
    if (!active) service = await apiCall<ServiceDTO>(`/services/${service.id}`, jsonBody("PATCH", { active: false }));

    return Response.json(service, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Não foi possível criar o serviço.");
  }
}
