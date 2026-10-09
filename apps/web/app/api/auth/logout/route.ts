import { apiProxyFetch, clearSession } from "@/lib/api-proxy";

export async function POST() {
  // Best-effort: revoke the refresh token server-side, but the cookie is cleared either
  // way — a failed revoke call must never leave the user stuck "logged in" locally.
  try {
    await apiProxyFetch("/auth/logout", { method: "POST" });
  } catch {
    // ignore
  }

  await clearSession();
  return Response.json({ success: true });
}
