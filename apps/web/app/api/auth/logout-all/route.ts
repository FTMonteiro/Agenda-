import { apiProxyFetch, clearSession } from "@/lib/api-proxy";

// "Terminar todas as sessões": the API ends every session of the account, on every device
// (access tokens included), and this browser's cookie goes with them.
export async function POST() {
  const response = await apiProxyFetch("/auth/logout-all", { method: "POST" });
  if (!response.ok) {
    return Response.json({ success: false, error: "Não foi possível terminar as sessões. Tente novamente." }, { status: response.status === 401 ? 401 : 502 });
  }

  await clearSession();
  return Response.json({ success: true });
}
