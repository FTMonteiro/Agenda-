import type { ProfessionalDTO } from "@slotix/types";
import { requireOwner } from "@/lib/auth";
import { apiCall, errorJson, errorResponse, formatProfessional, historyConflict, jsonBody } from "@/lib/dashboard-api";

type Context = { params: Promise<{ id: string }> };

// The API looks professionals up by id alone, so the "is it one of mine" check is done here.
async function getOwnProfessional(id: string, businessId: string): Promise<ProfessionalDTO | null> {
  const professional = await apiCall<ProfessionalDTO>(`/professionals/${id}`);
  return professional.businessId === businessId ? professional : null;
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const owner = await requireOwner();
    const { id } = await params;

    const professional = await getOwnProfessional(id, owner.businessId);
    if (!professional) return errorJson("Profissional não encontrado.", 404);

    return Response.json(formatProfessional(professional));
  } catch (error) {
    return errorResponse(error, "Não foi possível carregar o profissional.");
  }
}

// Only the specialty and the photo can be edited through the API: name, email, phone and password
// belong to the professional's own user account, which the owner cannot change.
export async function PUT(request: Request, { params }: Context) {
  try {
    const owner = await requireOwner();
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const existing = await getOwnProfessional(id, owner.businessId);
    if (!existing) return errorJson("Profissional não encontrado.", 404);

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const specialty = typeof body.specialty === "string" ? body.specialty.trim() : "";
    const photo = typeof body.photo === "string" && /^(data:image\/|https?:\/\/)/.test(body.photo) ? body.photo : "";

    if (name && name !== existing.name) {
      return errorJson("O nome pertence à conta do profissional e só ele o pode alterar. Aqui só é possível editar a especialidade e a foto.", 400);
    }
    if (typeof body.password === "string" && body.password) {
      return errorJson("A palavra-passe só pode ser alterada pelo próprio profissional, na conta dele.", 400);
    }

    const updated = await apiCall<ProfessionalDTO>(
      `/professionals/${id}`,
      jsonBody("PATCH", { specialty, ...(photo && photo !== existing.imageUrl ? { imageUrl: photo } : {}) }),
    );

    return Response.json({
      success: true,
      message: "Profissional atualizado com sucesso.",
      passwordChanged: false,
      professional: formatProfessional(updated, { email, phone }),
    });
  } catch (error) {
    return errorResponse(error, "Não foi possível editar o profissional.");
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const owner = await requireOwner();
    const { id } = await params;

    const body = (await request.json()) as { active?: unknown };
    if (typeof body.active !== "boolean") return errorJson("O estado do profissional é inválido.", 400);

    const existing = await getOwnProfessional(id, owner.businessId);
    if (!existing) return errorJson("Profissional não encontrado.", 404);

    const updated = await apiCall<ProfessionalDTO>(`/professionals/${id}`, jsonBody("PATCH", { active: body.active }));

    return Response.json({
      success: true,
      message: body.active ? "Profissional ativado." : "Profissional desativado.",
      active: body.active,
      professional: formatProfessional(updated),
    });
  } catch (error) {
    return errorResponse(error, "Não foi possível alterar o estado.");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const owner = await requireOwner();
    const { id } = await params;

    const existing = await getOwnProfessional(id, owner.businessId);
    if (!existing) return errorJson("Profissional não encontrado.", 404);

    const conflict = await historyConflict(owner.businessId, "professionalId", id, "profissional");
    if (conflict) return conflict;

    await apiCall(`/professionals/${id}`, { method: "DELETE" });

    return Response.json({
      success: true,
      message: "Profissional excluído com sucesso.",
      deletedProfessional: { id: existing.id, name: existing.name },
    });
  } catch (error) {
    return errorResponse(error, "Não foi possível excluir.");
  }
}
