import type { AppointmentDTO } from "@slotix/types";
import { requireOwner, requireStaff } from "@/lib/auth";
import { apiCall, errorJson, errorResponse, formatAppointment, jsonBody, loadLookups, parseLocalDateTime } from "@/lib/dashboard-api";

type Context = { params: Promise<{ id: string }> };

async function getOwnAppointment(id: string, businessId: string): Promise<AppointmentDTO | null> {
  const appointment = await apiCall<AppointmentDTO>(`/appointments/${id}`);
  return appointment.businessId === businessId ? appointment : null;
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireStaff();
    const { id } = await params;

    const appointment = await getOwnAppointment(id, user.businessId);
    if (!appointment) return errorJson("Agendamento não encontrado.", 404);

    return Response.json({ appointment: formatAppointment(appointment, await loadLookups(user.businessId)) });
  } catch (error) {
    return errorResponse(error, "Não foi possível carregar o agendamento.");
  }
}

// The edit form posts the whole appointment back, but the API only has discrete actions:
// reschedule, confirm, complete and cancel. Client, service and professional are fixed
// once booked, and notes can't be changed — an edit that touches the first three is
// refused with an explanation rather than half-applied.
export async function PUT(request: Request, { params }: Context) {
  try {
    const user = await requireStaff();
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const current = await getOwnAppointment(id, user.businessId);
    if (!current) return errorJson("Agendamento não encontrado.", 404);

    const lookups = await loadLookups(user.businessId);
    const before = formatAppointment(current, lookups);

    const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
    const differs = (sent: unknown, existing: string) => text(sent) !== "" && text(sent).toLowerCase() !== existing.toLowerCase();

    if (differs(body.client, before.client) || differs(body.service, before.service) || differs(body.professional, before.professional)) {
      return errorJson(
        "Não é possível trocar o cliente, o serviço ou o profissional de um agendamento. Cancele este e crie um novo.",
        400,
      );
    }

    const scheduledAt = parseLocalDateTime(text(body.date), text(body.time));
    if (!scheduledAt) return errorJson("Data ou hora inválida.", 400);

    const status = text(body.status).toUpperCase() || current.status;
    const action = { CONFIRMED: "confirm", COMPLETED: "complete", CANCELLED: "cancel", NO_SHOW: "no-show" }[status];
    if (status !== current.status && !action) {
      return errorJson("Só é possível confirmar, concluir, cancelar ou marcar falta num agendamento.", 400);
    }

    let updated = current;
    if (scheduledAt.getTime() !== new Date(current.scheduledAt).getTime()) {
      updated = await apiCall<AppointmentDTO>(`/appointments/${id}/reschedule`, jsonBody("PATCH", { scheduledAt: scheduledAt.toISOString() }));
    }
    if (status !== current.status && action) {
      updated = await apiCall<AppointmentDTO>(`/appointments/${id}/${action}`, { method: "PATCH" });
    }

    return Response.json({
      message: "Agendamento atualizado com sucesso.",
      appointment: formatAppointment(updated, lookups),
    });
  } catch (error) {
    return errorResponse(error, "Não foi possível atualizar o agendamento.");
  }
}

// The API keeps every appointment as history and has no delete.
export async function DELETE() {
  try {
    await requireOwner();
    return errorJson("Os agendamentos não podem ser excluídos. Cancele o agendamento em vez de o excluir.", 409);
  } catch (error) {
    return errorResponse(error, "Não foi possível excluir o agendamento.");
  }
}
