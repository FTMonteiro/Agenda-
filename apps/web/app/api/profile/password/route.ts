import { requireStaff } from "@/lib/auth";
import { writeSession } from "@/lib/api-proxy";
import { ApiCallError, apiCall, errorJson, errorResponse, jsonBody } from "@/lib/dashboard-api";

// The signed-in user changing their own password — how an employee replaces the temporary
// one generated when the owner created their account.
export async function POST(request: Request) {
  try {
    await requireStaff();
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword) return errorJson("Digite a senha atual.", 400);
    if (newPassword.length < 8) return errorJson("A nova senha deve ter pelo menos 8 caracteres.", 400);
    if (newPassword === currentPassword) return errorJson("A nova senha deve ser diferente da atual.", 400);

    try {
      // The API ends every other session and hands this one a fresh pair of tokens.
      const tokens = await apiCall<{ accessToken?: string; refreshToken?: string }>("/users/me/password", jsonBody("POST", { currentPassword, newPassword }));
      if (tokens?.accessToken && tokens.refreshToken) {
        await writeSession({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      }
    } catch (error) {
      // The API answers a wrong current password with 401, which the dashboard would read
      // as "session expired"; the session is fine (requireStaff passed), so it's a 400 here.
      if (error instanceof ApiCallError && (error.status === 401 || error.status === 400)) {
        return errorJson("A senha atual está incorreta.", 400);
      }
      if (error instanceof ApiCallError && error.status === 429) {
        return errorJson("Demasiadas tentativas. Aguarde alguns minutos e tente novamente.", 429);
      }
      throw error;
    }

    return Response.json({ success: true, message: "Senha alterada com sucesso." });
  } catch (error) {
    return errorResponse(error, "Não foi possível alterar a senha.");
  }
}
