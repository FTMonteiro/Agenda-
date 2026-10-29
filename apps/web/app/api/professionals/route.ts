import { isAcceptedImageUrl, UNSUPPORTED_IMAGE_MESSAGE } from "@/lib/image-formats";
import type { ProfessionalDTO } from "@slotix/types";
import { requireOwner, requireStaff } from "@/lib/auth";
import { apiCall, errorJson, errorResponse, formatProfessional, jsonBody } from "@/lib/dashboard-api";

export async function GET() {
  try {
    const user = await requireStaff();
    const professionals = await apiCall<ProfessionalDTO[]>(`/professionals?businessId=${user.businessId}`);

    const visible = user.role === "OWNER" ? professionals : professionals.filter((professional) => professional.active);

    return Response.json(
      visible.sort((a, b) => a.name.localeCompare(b.name, "pt")).map((professional) => formatProfessional(professional)),
    );
  } catch (error) {
    return errorResponse(error, "Não foi possível carregar os profissionais.");
  }
}

// In the API a professional is always a user account: /professionals/invite creates both
// and returns a one-time temporary password. So access is always created, whatever the
// form's "criar acesso" switch says, and a password typed in the form is not used.
export async function POST(request: Request) {
  try {
    const owner = await requireOwner();
    const body = (await request.json()) as Record<string, unknown>;

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const specialty = typeof body.specialty === "string" ? body.specialty.trim() : "";
    // A small square JPEG as a data URL, prepared by the form (see PhotoField).
    const photo = typeof body.photo === "string" ? body.photo.trim() : "";
    if (photo && !isAcceptedImageUrl(photo)) return errorJson(UNSUPPORTED_IMAGE_MESSAGE, 400);

    if (name.length < 2) return errorJson("O nome do profissional é obrigatório.", 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorJson("Informe um email válido.", 400);

    const { professional, temporaryPassword } = await apiCall<{ professional: ProfessionalDTO; temporaryPassword: string }>(
      "/professionals/invite",
      jsonBody("POST", {
        businessId: owner.businessId,
        name,
        email,
        ...(phone ? { phone } : {}),
        ...(specialty ? { specialty } : {}),
        ...(photo ? { imageUrl: photo } : {}),
      }),
    );

    return Response.json(
      {
        success: true,
        message: "Profissional cadastrado e acesso ao sistema criado com sucesso.",
        accessCreated: true,
        temporaryPassword,
        professional: formatProfessional(professional, { email, phone }),
        user: null,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error, "Não foi possível cadastrar o profissional.");
  }
}
