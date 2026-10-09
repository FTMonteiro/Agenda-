import { apiProxyFetch, writeSession } from "@/lib/api-proxy";

export async function POST(request: Request) {
  const body = await request.text();
  const response = await apiProxyFetch("/auth/login", { method: "POST", body });
  const json = await response.json();

  if (!response.ok || !json.success) {
    return Response.json({ error: json.error?.message ?? "Email ou palavra-passe incorretos." }, { status: response.status });
  }

  await writeSession({ accessToken: json.data.accessToken, refreshToken: json.data.refreshToken });
  return Response.json({ user: json.data.user });
}
