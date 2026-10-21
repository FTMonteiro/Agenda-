import type { ProfessionalDTO, UserDTO } from "@slotix/types";
import { requireOwner, requireStaff, type AuthUser } from "@/lib/auth";
import { apiCall, errorJson, errorResponse, jsonBody } from "@/lib/dashboard-api";

// The signed-in user's own profile: their name, contact and photo — never the business
// logo, which only identifies the space in the app. An employee also has their
// professional record (specialty, the photo the owner picked when creating them).
async function loadProfile(user: AuthUser) {
  const [account, professional] = await Promise.all([
    apiCall<UserDTO>("/users/me"),
    user.role === "EMPLOYEE" ? apiCall<ProfessionalDTO>("/professionals/me") : null,
  ]);

  return {
    id: professional?.id ?? account.id,
    name: professional?.name ?? account.name,
    email: account.email,
    phone: account.phone ?? "",
    specialty: professional?.specialty ?? "",
    avatar: account.avatarUrl ?? professional?.imageUrl ?? null,
    active: professional?.active ?? true,
  };
}

export async function GET() {
  try {
    const user = await requireStaff();
    return Response.json({ success: true, profile: await loadProfile(user) });
  } catch (error) {
    return errorResponse(error, "Não foi possível carregar o perfil.");
  }
}

// The owner's own name and phone (not the space's — those are in Dados do estabelecimento).
export async function PATCH(request: Request) {
  try {
    const user = await requireOwner();
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

    if (name.length < 2) return errorJson("O nome deve ter pelo menos 2 caracteres.", 400);

    await apiCall<UserDTO>("/users/me", jsonBody("PATCH", { name, phone }));
    return Response.json({ success: true, profile: await loadProfile(user) });
  } catch (error) {
    return errorResponse(error, "Não foi possível guardar o perfil.");
  }
}

// The photo arrives as a data URL (already reduced in the browser); the API stores the
// file and makes it the account's avatarUrl.
export async function PUT(request: Request) {
  try {
    const user = await requireStaff();
    const body = (await request.json()) as { avatar?: unknown };
    const avatar = typeof body.avatar === "string" ? body.avatar.trim() : "";

    if (!avatar.startsWith("data:image/")) return errorJson("Escolha uma imagem PNG, JPG ou WebP.", 400);

    const image = await (await fetch(avatar)).blob();
    const upload = new FormData();
    upload.append("file", image, `avatar.${image.type.split("/")[1] ?? "jpg"}`);

    await apiCall<UserDTO>("/users/me/avatar", { method: "POST", body: upload });
    return Response.json({ success: true, profile: await loadProfile(user) });
  } catch (error) {
    return errorResponse(error, "Não foi possível atualizar a foto.");
  }
}

export async function DELETE() {
  try {
    const user = await requireStaff();
    await apiCall<UserDTO>("/users/me/avatar", { method: "DELETE" });
    return Response.json({ success: true, profile: await loadProfile(user) });
  } catch (error) {
    return errorResponse(error, "Não foi possível remover a foto.");
  }
}
