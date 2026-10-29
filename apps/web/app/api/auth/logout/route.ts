import { apiProxyFetch, clearSession, readSession } from "@/lib/api-proxy";

export async function POST() {
  // Best-effort: revoke the refresh token server-side, but the cookie is cleared either
  // way — a failed revoke call must never leave the user stuck "logged in" locally.
  try {
    // Ends only this session. The refresh token identifies it when the session predates
    // session ids; other devices stay signed in.
    const session = await readSession();
    await apiProxyFetch("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: session?.refreshToken }) });
  } catch {
    // ignore
  }

  await clearSession();
  return Response.json({ success: true });
}
