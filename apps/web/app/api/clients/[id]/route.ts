import type { WalkInClientDTO } from "@slotix/types";
import { requireAuth, requireOwner } from "@/lib/auth";
import { ApiCallError, apiCall, errorJson, errorResponse, jsonBody } from "@/lib/dashboard-api";

type Context = { params: Promise<{ id: string }> };

// Clients who booked through the app have their own account: the business can see them
// but not edit or delete them. The walk-in endpoints answer 404 for their ids, so this
// turns that into an explanation instead of "not found".
function appClientNotice(error: unknown, action: string): Response | null {
  if (!(error instanceof ApiCallError) || error.status !== 404) return null;
  return errorJson(`Este cliente tem conta na app Agenda+ e gere os próprios dados, por isso não é possível ${action} aqui.`, 409, {
    code: "APP_CLIENT_READ_ONLY",
  });
}

export async function GET(_request: Request, { params }: Context) {
  try {
    await requireAuth();
    const { id } = await params;

    return Response.json(await apiCall<WalkInClientDTO>(`/clients/walk-in/${id}`));
  } catch (error) {
    return errorResponse(error, "Não foi possível carregar o cliente.");
  }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    await requireOwner();
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!name) return errorJson("O nome do cliente é obrigatório.", 400);
    if (!phone) return errorJson("O telefone do cliente é obrigatório.", 400);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorJson("Informe um email válido.", 400);

    const client = await apiCall<WalkInClientDTO>(
      `/clients/walk-in/${id}`,
      jsonBody("PUT", {
        name,
        phone,
        ...(email ? { email } : {}),
        ...(typeof body.active === "boolean" ? { active: body.active } : {}),
      }),
    );

    return Response.json(client);
  } catch (error) {
    return appClientNotice(error, "editá-lo") ?? errorResponse(error, "Não foi possível atualizar o cliente.");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    await requireOwner();
    const { id } = await params;

    await apiCall(`/clients/walk-in/${id}`, { method: "DELETE" });
    return Response.json({ success: true, message: "Cliente excluído com sucesso." });
  } catch (error) {
    // The clients table shows a dedicated message for this case, keyed on `reason`.
    if (error instanceof ApiCallError && error.code === "CLIENT_HAS_APPOINTMENTS") {
      return errorJson(error.message, error.status, { code: error.code, reason: "has_appointments" });
    }
    return appClientNotice(error, "excluí-lo") ?? errorResponse(error, "Não foi possível excluir o cliente.");
  }
}
