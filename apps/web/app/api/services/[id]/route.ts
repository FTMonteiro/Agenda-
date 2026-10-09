import type { ServiceDTO } from "@slotix/types";
import { requireAuth, requireOwner } from "@/lib/auth";
import { apiCall, errorJson, errorResponse, historyConflict, jsonBody } from "@/lib/dashboard-api";
import { parseServiceBody } from "../service-body";

type Context = { params: Promise<{ id: string }> };

// The API looks services up by id alone, so the "is it one of mine" check is done here.
async function getOwnService(id: string, businessId: string): Promise<ServiceDTO | null> {
  const service = await apiCall<ServiceDTO>(`/services/${id}`);
  return service.businessId === businessId ? service : null;
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const service = await getOwnService(id, user.businessId);
    if (!service || (user.role === "EMPLOYEE" && !service.active)) return errorJson("Serviço não encontrado.", 404);

    return Response.json(service);
  } catch (error) {
    return errorResponse(error, "Erro ao buscar o serviço.");
  }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    await requireOwner();
    const { id } = await params;

    const parsed = parseServiceBody(await request.json());
    if ("error" in parsed) return errorJson(parsed.error, 400);

    return Response.json(await apiCall<ServiceDTO>(`/services/${id}`, jsonBody("PATCH", parsed)));
  } catch (error) {
    return errorResponse(error, "Não foi possível atualizar o serviço.");
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    await requireOwner();
    const { id } = await params;

    const body = (await request.json()) as { active?: unknown };
    if (typeof body.active !== "boolean") return errorJson("O estado do serviço é inválido.", 400);

    return Response.json(await apiCall<ServiceDTO>(`/services/${id}`, jsonBody("PATCH", { active: body.active })));
  } catch (error) {
    return errorResponse(error, "Não foi possível alterar o estado do serviço.");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const owner = await requireOwner();
    const { id } = await params;

    const conflict = await historyConflict(owner.businessId, "serviceId", id, "serviço");
    if (conflict) return conflict;

    await apiCall(`/services/${id}`, { method: "DELETE" });
    return Response.json({ success: true, message: "Serviço excluído com sucesso." });
  } catch (error) {
    return errorResponse(error, "Não foi possível excluir o serviço.");
  }
}
