import type { ProfessionalDTO, UserDTO } from "@slotix/types";
import { requireStaff } from "@/lib/auth";
import { apiCall, errorJson, errorResponse, jsonBody } from "@/lib/dashboard-api";

// The signed-in employee's own professional profile. An OWNER has none, and gets the
// API's 404 passed through.
async function loadProfile() {
  const [professional, account] = await Promise.all([
    apiCall<ProfessionalDTO>("/professionals/me"),
    apiCall<UserDTO>("/users/me"),
  ]);

  return {
    id: professional.id,
    name: professional.name,
    email: account.email,
    phone: account.phone,
    specialty: professional.specialty,
    avatar: account.avatarUrl ?? professional.imageUrl,
    active: professional.active,
    emailVerified: false,
    businessId: professional.businessId,
    userId: professional.userId,
    createdAt: professional.createdAt,
    updatedAt: professional.updatedAt,
  };
}

export async function GET() {
  try {
    await requireStaff();
    return Response.json({ success: true, profile: await loadProfile() });
  } catch (error) {
    return errorResponse(error, "Não foi possível carregar o perfil.");
  }
}

// The only thing the profile screen edits is the photo, and the API stores it as a URL —
// it has no upload for avatars, so a picture picked from disk can't be saved yet.
export async function PUT(request: Request) {
  try {
    await requireStaff();
    const body = (await request.json()) as { avatar?: unknown };
    const avatar = typeof body.avatar === "string" ? body.avatar.trim() : "";

    if (!/^https?:\/\//.test(avatar)) {
      return errorJson("Ainda não é possível carregar uma foto: a API só aceita o endereço (URL) de uma imagem já publicada.", 400);
    }

    await apiCall<UserDTO>("/users/me", jsonBody("PATCH", { avatarUrl: avatar }));
    return Response.json({ success: true, profile: await loadProfile() });
  } catch (error) {
    return errorResponse(error, "Não foi possível atualizar a foto.");
  }
}

export async function DELETE() {
  try {
    await requireStaff();
    return errorJson("Ainda não é possível remover a foto: a API não permite limpar o avatar.", 400);
  } catch (error) {
    return errorResponse(error, "Não foi possível remover a foto.");
  }
}
