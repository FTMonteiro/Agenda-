import type { AppointmentDTO } from "@slotix/types";
import { requireStaff } from "@/lib/auth";
import { ApiCallError, apiCall, errorJson, errorResponse, formatAppointment, jsonBody, loadLookups, parseLocalDateTime } from "@/lib/dashboard-api";

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

// Booked by staff on behalf of one of the business's own (walk-in) clients. Availability,
// business hours and "must be in the future" are all enforced by the API.
export async function POST(request: Request) {
  try {
    const user = await requireStaff();
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return errorJson("Dados do agendamento inválidos.", 400);

    const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
    const clientId = text(body.clientId);
    const professionalId = text(body.professionalId);
    const serviceId = text(body.serviceId);
    const notes = text(body.notes);

    if (!clientId) return errorJson("Selecione o cliente.", 400);
    if (!professionalId) return errorJson("Selecione o profissional.", 400);
    if (!serviceId) return errorJson("Selecione o serviço.", 400);

    const scheduledAt = parseLocalDateTime(text(body.date), text(body.time));
    if (!scheduledAt) return errorJson("Data ou hora inválida.", 400);

    const appointment = await apiCall<AppointmentDTO>(
      "/appointments/walk-in",
      jsonBody("POST", {
        businessId: user.businessId,
        walkInClientId: clientId,
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
    if (error instanceof ApiCallError && error.status === 404 && /cliente/i.test(error.message)) {
      return errorJson(
        "Este cliente tem conta na app Agenda+ e faz as próprias marcações pela app; não é possível marcar por ele aqui.",
        409,
      );
    }
    return errorResponse(error, "Não foi possível criar o agendamento.");
  }
}
