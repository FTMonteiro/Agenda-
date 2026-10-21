import { requireOwner } from "@/lib/auth";
import { clearSession } from "@/lib/api-proxy";
import { apiCall, errorResponse } from "@/lib/dashboard-api";

// The owner deleting their account for good: the API deletes the space with everything
// in it and the employees' accounts too. Employees can't do this here — their accounts
// are managed by the owner in Equipa.
export async function DELETE() {
  try {
    await requireOwner();
    await apiCall<{ deleted: true }>("/users/me", { method: "DELETE" });
    await clearSession();
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Não foi possível eliminar a conta.");
  }
}
