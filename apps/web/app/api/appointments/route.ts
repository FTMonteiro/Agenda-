import type { AppointmentDTO, WalkInClientDTO } from "@slotix/types";
import { requireStaff } from "@/lib/auth";
import { apiCall, errorJson, errorResponse, formatAppointment, jsonBody, loadLookups, parseLocalDateTime } from "@/lib/dashboard-api";

export async function GET() {
  try {
    const user = await requireStaff();

    const [appointments, lookups] = await Promise.all([
      apiCall<AppointmentDTO[]>(`/appointments?businessId=${user.businessId}`),
      loadLookups(user.businessId),
    ]);

    const formatted = appointments
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      .map((appointment) => formatAppointment(appointment, lookups));

    return Response.json(
      { success: true, appointments: formatted },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );
  } catch (error) {
    return errorResponse(error, "Erro ao carregar agendamentos.");
  }
}

// Booked by staff for any of the business's clients — one registered by hand, an app
// user who is a client of the space (clientSource "app") — or for someone who isn't a
// client yet (newClient), who is registered first. Availability, business hours and
// "must be in the future" are all enforced by the API.
export async function POST(request: Request) {
  try {
    const user = await requireStaff();
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return errorJson("Dados do agendamento inválidos.", 400);

    const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
    const newClient = body.newClient && typeof body.newClient === "object" ? (body.newClient as Record<string, unknown>) : null;
    const clientId = text(body.clientId);
    const professionalId = text(body.professionalId);
    const serviceId = text(body.serviceId);
    const notes = text(body.notes);

    if (newClient) {
      if (!text(newClient.name)) return errorJson("Indique o nome do cliente.", 400);
      if (!text(newClient.phone)) return errorJson("Indique o telefone do cliente.", 400);
    } else if (!clientId) {
      return errorJson("Selecione o cliente.", 400);
    }
    if (!professionalId) return errorJson("Selecione o profissional.", 400);
    if (!serviceId) return errorJson("Selecione o serviço.", 400);

    const scheduledAt = parseLocalDateTime(text(body.date), text(body.time));
    if (!scheduledAt) return errorJson("Data ou hora inválida.", 400);

    // Someone new becomes one of the space's clients first. If the booking then fails
    // (slot taken, closed that day), they stay registered — the retry picks them from the list.
    let client: { clientId: string } | { walkInClientId: string };
    if (newClient) {
      const created = await apiCall<WalkInClientDTO>(
        "/clients/walk-in",
        jsonBody("POST", { businessId: user.businessId, name: text(newClient.name), phone: text(newClient.phone) }),
      );
      client = { walkInClientId: created.id };
    } else {
      client = body.clientSource === "app" ? { clientId } : { walkInClientId: clientId };
    }

    const appointment = await apiCall<AppointmentDTO>(
      "/appointments/walk-in",
      jsonBody("POST", {
        businessId: user.businessId,
        ...client,
        serviceId,
        professionalId,
        scheduledAt: scheduledAt.toISOString(),
        ...(notes ? { notes } : {}),
      }),
    );

    return Response.json(
      {
        success: true,
        message: "Agendamento criado com sucesso.",
        appointment: formatAppointment(appointment, await loadLookups(user.businessId)),
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error, "Não foi possível criar o agendamento.");
  }
}
