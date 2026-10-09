import { matchBusinessCategory } from "@slotix/types";
import { apiProxyFetch } from "@/lib/api-proxy";

// Two calls to the API chained together — register (always CUSTOMER) then create the
// business (which promotes to OWNER) — because there's no single "register as owner"
// endpoint. Matches the old dashboard's cadastro form, which always collects a company
// name (this is an owner-only signup flow, not a customer one).
export async function POST(request: Request) {
  const { name, company, email, password, category } = (await request.json()) as {
    name: string;
    company: string;
    email: string;
    password: string;
    category?: string;
  };

  // Checked before the account exists: a rejected category after /auth/register would
  // leave an account with no business behind.
  const businessCategory = matchBusinessCategory(category);
  if (!businessCategory) {
    return Response.json({ error: "Escolha o tipo do seu espaço.", code: "CATEGORY_REQUIRED" }, { status: 400 });
  }

  const registerResponse = await apiProxyFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  const registerJson = await registerResponse.json();

  if (!registerResponse.ok || !registerJson.success) {
    return Response.json(
      { error: registerJson.error?.message ?? "Não foi possível criar a conta.", code: registerJson.error?.code },
      { status: registerResponse.status },
    );
  }

  const accessToken = registerJson.data.accessToken as string;

  // Retried on a server-side failure: giving up here leaves an account with no business,
  // which can't sign in to the dashboard at all and can't register again with that email.
  let businessCreated = false;
  for (let attempt = 0; attempt < 3 && !businessCreated; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const businessResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1"}/businesses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name: company, category: businessCategory }),
      });
      const businessJson = await businessResponse.json();

      businessCreated = businessResponse.ok && businessJson.success;
      if (!businessCreated && businessResponse.status < 500) break;
    } catch {
      // network error or a non-JSON reply — try again
    }
  }

  if (!businessCreated) {
    return Response.json(
      {
        error:
          "Conta criada, mas não foi possível registar a empresa. Entre na sua conta e tente novamente em Configurações.",
        code: "BUSINESS_CREATION_FAILED",
      },
      { status: 502 },
    );
  }

  // No session cookie here on purpose: matches the old flow exactly — register redirects
  // to /login rather than signing the user in immediately.
  return Response.json({ redirectTo: "/login" }, { status: 201 });
}
