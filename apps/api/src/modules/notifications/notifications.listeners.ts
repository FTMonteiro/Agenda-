import { domainEvents } from "../../shared/events/domainEvents";
import { notificationsService } from "./notifications.service";

// Walk-in clients have no account to notify — every listener below is a no-op for them
// (clientId/userId null), which is expected, not an error.
export function registerNotificationListeners(): void {
  domainEvents.onEvent("AppointmentCreated", (appointment) => {
    if (!appointment.clientId) return;
    void notificationsService.notify(
      appointment.clientId,
      "APPOINTMENT_CREATED",
      "Agendamento criado",
      "O seu agendamento foi criado e está pendente de confirmação.",
    );
  });

  domainEvents.onEvent("AppointmentCancelled", (appointment) => {
    if (!appointment.clientId) return;
    void notificationsService.notify(
      appointment.clientId,
      "APPOINTMENT_CANCELLED",
      "Agendamento cancelado",
      "O seu agendamento foi cancelado.",
    );
  });

  domainEvents.onEvent("PaymentPaid", (payment) => {
    if (!payment.userId) return;
    void notificationsService.notify(payment.userId, "PAYMENT_PAID", "Pagamento confirmado", "O seu pagamento foi confirmado.");
  });

  domainEvents.onEvent("PaymentRefunded", (payment) => {
    if (!payment.userId) return;
    void notificationsService.notify(payment.userId, "PAYMENT_REFUNDED", "Pagamento reembolsado", "O seu pagamento foi reembolsado.");
  });
}
