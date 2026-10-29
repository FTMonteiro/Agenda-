import { requireOwner } from "@/lib/auth";
import { apiCall, errorResponse } from "@/lib/dashboard-api";

type Context = { params: Promise<{ id: string }> };

// The owner giving an employee a new password. The current one can't be shown (only its
// hash exists), so a new temporary one is generated and returned this once.
export async function POST(_request: Request, { params }: Context) {
  try {
    await requireOwner();
    const { id } = await params;

    const { temporaryPassword } = await apiCall<{ temporaryPassword: string }>(`/professionals/${encodeURIComponent(id)}/reset-password`, { method: "POST" });

    return Response.json({ success: true, temporaryPassword });
  } catch (error) {
    return errorResponse(error, "Não foi possível gerar uma nova senha.");
  }
}
