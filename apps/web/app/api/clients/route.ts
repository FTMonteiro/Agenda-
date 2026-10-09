import type { ClientDTO, WalkInClientDTO } from "@slotix/types";
import { requireAuth } from "@/lib/auth";
import { apiCall, errorJson, errorResponse, jsonBody } from "@/lib/dashboard-api";

// The business's clients are two kinds of people: the ones staff registered by hand (what
// the API calls walk-in clients) and the app users who booked there themselves. A customer
// who books through the app is therefore on this list from that moment, with nothing to
// register. `source` tells the two apart; app clients manage their own details.
export async function GET() {
  try {
    const user = await requireAuth();
    const query = `businessId=${user.businessId}`;

    const [walkIns, appClients] = await Promise.all([
      apiCall<WalkInClientDTO[]>(`/clients/walk-in?${query}`),
      // Not worth failing the whole list over: without it, only the manual clients show.
      apiCall<ClientDTO[]>(`/clients?${query}`).catch(() => [] as ClientDTO[]),
    ]);

    const clients = [
      ...walkIns.map((client) => ({ ...client, source: "manual" as const })),
      ...appClients.map((client) => ({
        id: client.userId,
        businessId: user.businessId,
        name: client.name,
        phone: client.phone ?? "",
        email: client.email,
        active: client.status !== "inactive",
        visits: client.visits,
        totalSpent: client.totalSpent,
        lastVisit: client.lastVisit,
        createdAt: client.lastVisit ?? new Date(0).toISOString(),
        updatedAt: client.lastVisit ?? new Date(0).toISOString(),
        source: "app" as const,
      })),
    ];

    return Response.json(clients.sort((a, b) => a.name.localeCompare(b.name, "pt")));
  } catch (error) {
    return errorResponse(error, "Não foi possível carregar os clientes.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = (await request.json()) as Record<string, unknown>;

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!name) return errorJson("O nome do cliente é obrigatório.", 400);
    if (!phone) return errorJson("O telefone do cliente é obrigatório.", 400);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorJson("Informe um email válido.", 400);

    let client = await apiCall<WalkInClientDTO>(
      "/clients/walk-in",
      jsonBody("POST", { businessId: user.businessId, name, phone, ...(email ? { email } : {}) }),
    );

    // The API always creates a client active; editing it afterwards is owner-only there.
    if (body.active === false && user.role === "OWNER") {
      client = await apiCall<WalkInClientDTO>(`/clients/walk-in/${client.id}`, jsonBody("PUT", { active: false }));
    }

    return Response.json(client, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Não foi possível criar o cliente.");
  }
}
