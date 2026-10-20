import type { AppointmentDTO, BusinessDTO } from "@slotix/types";
import { requireStaff } from "@/lib/auth";
import { apiCall, clientOf, errorJson, errorResponse, fromApiMethod, loadLookups } from "@/lib/dashboard-api";

// `id` is the appointment's id, not the payment's — a receipt is looked up by what was paid for.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireStaff();
    const { id } = await params;

    const [appointment, lookups, business] = await Promise.all([
      apiCall<AppointmentDTO>(`/appointments/${id}`),
      loadLookups(user.businessId),
      // The receipt header names who issued it; without it the receipt still renders.
      apiCall<BusinessDTO>(`/businesses/${user.businessId}`).catch(() => null),
    ]);
    if (appointment.businessId !== user.businessId) return errorJson("Agendamento não encontrado.", 404);

    const payment = lookups.payments.get(appointment.id);
    if (!payment) return errorJson("Este agendamento ainda não tem pagamento.", 404);

    const client = clientOf(appointment, lookups);
    const service = lookups.services.get(appointment.serviceId);
    const professional = lookups.professionals.get(appointment.professionalId);

    return Response.json({
      success: true,
      receipt: {
        title: "Recibo do pagamento",
        type: "PAYMENT_RECEIPT",
        // Sequential numbering doesn't exist yet; the payment id is stable and unique.
        number: `REC-${payment.id.slice(-8).toUpperCase()}`,
        business: business
          ? {
              name: business.name,
              logoUrl: business.logoUrl,
              address: business.address,
              phone: business.phone,
            }
          : null,
        payment: {
          id: payment.id,
          reference: null,
          amount: payment.amount,
          method: fromApiMethod(payment.method),
          status: payment.status,
          paidAt: payment.paidAt ?? payment.createdAt,
          receivedById: null,
        },
        appointment: {
          id: appointment.id,
          date: appointment.scheduledAt,
          status: appointment.status,
          notes: appointment.notes,
        },
        client: {
          id: client?.id ?? "",
          name: client?.name ?? "Cliente",
          email: client?.email ?? null,
          phone: client?.phone ?? null,
        },
        professional: {
          id: appointment.professionalId,
          name: professional?.name ?? "Profissional",
          email: null,
          phone: null,
          specialty: professional?.specialty ?? null,
        },
        service: {
          id: appointment.serviceId,
          name: service?.name ?? "Serviço",
          price: appointment.price,
          duration: service?.duration ?? 0,
        },
        total: payment.amount,
      },
    });
  } catch (error) {
    return errorResponse(error, "Não foi possível carregar o recibo.");
  }
}
