import { requireAuth } from "@/lib/auth";
import { apiCall, errorResponse } from "@/lib/dashboard-api";

export async function PATCH() {
  try {
    await requireAuth();
    await apiCall("/notifications/read-all", { method: "PATCH" });

    return Response.json({ success: true, message: "Todas as notificações foram marcadas como lidas." });
  } catch (error) {
    return errorResponse(error, "Não foi possível marcar as notificações como lidas.");
  }
}
