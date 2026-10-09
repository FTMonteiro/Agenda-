import type { AppointmentDTO, PaymentDTO } from "@slotix/types";
import { requireStaff } from "@/lib/auth";
import {
  apiCall,
  clientOf,
  errorJson,
  errorResponse,
  fromApiMethod,
  jsonBody,
  loadLookups,
  localTime,
  toApiMethod,
} from "@/lib/dashboard-api";

function receiptUrl(appointmentId: string): string {
  return `/api/appointments/payments/${appointmentId}/receipt`;
}

// Serves two screens at once: the payments history reads `payments`, and the "receber
// pagamento" dialog reads `appointments` — the confirmed ones still waiting to be paid.
export async function GET() {
  try {
    const user = await requireStaff();

    const [appointments, lookups] = await Promise.all([
      apiCall<AppointmentDTO[]>(`/appointments?businessId=${user.businessId}`),
      loadLookups(user.businessId),
    ]);
    const byId = new Map(appointments.map((appointment) => [appointment.id, appointment]));

    const names = (appointment: AppointmentDTO) => ({
      client: clientOf(appointment, lookups),
      service: lookups.services.get(appointment.serviceId),
      professional: lookups.professionals.get(appointment.professionalId),
    });

    const payments = [...lookups.payments.values()]
      .sort((a, b) => (b.paidAt ?? b.createdAt).localeCompare(a.paidAt ?? a.createdAt))
      .map((payment) => {
        const appointment = byId.get(payment.appointmentId);
        const related = appointment ? names(appointment) : null;

        return {
          id: payment.id,
          amount: payment.amount,
          method: fromApiMethod(payment.method),
          status: payment.status,
          reference: null,
          paidAt: payment.paidAt,
          appointmentId: payment.appointmentId,
          receiptUrl: receiptUrl(payment.appointmentId),
          appointment:
            appointment && related
              ? {
                  id: appointment.id,
                  date: appointment.scheduledAt,
                  time: localTime(new Date(appointment.scheduledAt)),
                  client: related.client?.name ?? "Cliente",
                  service: related.service?.name ?? "Serviço",
                  professional: related.professional?.name ?? "Profissional",
                }
              : undefined,
        };
      });

    const awaitingPayment = appointments
      .filter((appointment) => appointment.status === "CONFIRMED" && !lookups.payments.has(appointment.id))
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      .map((appointment) => {
        const related = names(appointment);

        return {
          id: appointment.id,
          date: appointment.scheduledAt,
          client: { id: related.client?.id ?? "", name: related.client?.name ?? "Cliente" },
          professional: { id: appointment.professionalId, name: related.professional?.name ?? "Profissional" },
          service: {
            id: appointment.serviceId,
            name: related.service?.name ?? "Serviço",
            price: appointment.price,
            duration: related.service?.duration ?? 0,
          },
          payment: null,
        };
      });

    return Response.json(
      { success: true, payments, appointments: awaitingPayment },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );
  } catch (error) {
    return errorResponse(error, "Não foi possível carregar os pagamentos.");
  }
}

// Staff recording a payment received in person. The amount, the "confirmed, same day,
// from 15 minutes before" window and completing the appointment are all the API's job.
export async function POST(request: Request) {
  try {
    await requireStaff();

    const formData = await request.formData().catch(() => null);
    if (!formData) return errorJson("Dados do pagamento inválidos.", 400);

    const appointmentId = String(formData.get("appointmentId") ?? "").trim();
    const method = toApiMethod(String(formData.get("method") ?? ""));

    if (!appointmentId) return errorJson("Selecione o agendamento.", 400);
    if (!method) return errorJson("Método de pagamento inválido.", 400);

    const payment = await apiCall<PaymentDTO>("/payments/receive", jsonBody("POST", { appointmentId, method }));

    return Response.json(
      {
        success: true,
        message: "Pagamento registrado com sucesso.",
        payment: {
          id: payment.id,
          amount: payment.amount,
          method: fromApiMethod(payment.method),
          status: payment.status,
          reference: null,
          receiptUrl: receiptUrl(payment.appointmentId),
          paidAt: payment.paidAt,
          appointmentId: payment.appointmentId,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error, "Não foi possível registrar o pagamento.");
  }
}
