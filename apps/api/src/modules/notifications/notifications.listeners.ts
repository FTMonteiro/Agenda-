import type { AppointmentDTO } from "@slotix/types";
import { env } from "../../config/env";
import { domainEvents } from "../../shared/events/domainEvents";
import { notificationsRepository } from "./notifications.repository";
import { notificationsService } from "./notifications.service";

function when(date: Date): string {
  const day = new Intl.DateTimeFormat("pt-PT", { timeZone: env.APP_TIMEZONE, day: "2-digit", month: "2-digit" }).format(date);
  const time = new Intl.DateTimeFormat("pt-PT", { timeZone: env.APP_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  return `${day} às ${time}`;
}

// The business side of an appointment the client did in the app: the owner (on the
// dashboard bell) and the professional booked, when that is someone else's account.
async function notifyBusiness(appointment: AppointmentDTO, type: string, title: string, describe: (details: string) => string) {
  const found = await notificationsRepository.findAppointmentForNotice(appointment.id);
  if (!found) return;

  const details = `${found.client?.name ?? "Cliente"} — ${found.service.name}, ${when(found.scheduledAt)}`;
  const recipients = new Set([found.business.ownerId, found.professional.userId]);

  await Promise.all([...recipients].map((userId) => notificationsService.notify(userId, type, title, describe(details))));
}

async function notifyClient(appointment: AppointmentDTO, type: string, title: string, describe: (details: string) => string) {
  if (!appointment.clientId) return;

  const found = await notificationsRepository.findAppointmentForNotice(appointment.id);
  const details = found ? `${found.service.name} em ${found.business.name}, ${when(found.scheduledAt)}` : "";

  await notificationsService.notify(appointment.clientId, type, title, describe(details));
}

function run(task: Promise<unknown>) {
  task.catch((error) => console.error("Falha ao criar notificação:", error));
}

// Walk-in clients have no account to notify — the client-side notices are a no-op for
// them (clientId null), which is expected, not an error. Everything sent here also goes
// to the person's phone as a push with sound (see notificationsService.notify).
export function registerNotificationListeners(): void {
  // Only clients book through `create` (the dashboard books walk-ins), so this is always
  // a booking made in the app.
  domainEvents.onEvent("AppointmentCreated", (appointment) => {
    run(
      notifyClient(appointment, "APPOINTMENT_CREATED", "Agendamento criado", (details) =>
        details ? `O seu agendamento (${details}) foi criado e está pendente de confirmação.` : "O seu agendamento foi criado e está pendente de confirmação.",
      ),
    );
    run(notifyBusiness(appointment, "APPOINTMENT_CREATED", "Novo agendamento", (details) => `Novo agendamento pela app: ${details}.`));
  });

  domainEvents.onEvent("AppointmentConfirmed", (appointment) => {
    run(
      notifyClient(appointment, "APPOINTMENT_CONFIRMED", "Agendamento confirmado", (details) =>
        details ? `O seu agendamento (${details}) foi confirmado.` : "O seu agendamento foi confirmado.",
      ),
    );
  });

  domainEvents.onEvent("AppointmentCancelled", (appointment) => {
    run(
      notifyClient(appointment, "APPOINTMENT_CANCELLED", "Agendamento cancelado", (details) =>
        details ? `O seu agendamento (${details}) foi cancelado.` : "O seu agendamento foi cancelado.",
      ),
    );
    if (appointment.byClient) {
      run(notifyBusiness(appointment, "APPOINTMENT_CANCELLED", "Agendamento cancelado", (details) => `O cliente cancelou pela app: ${details}.`));
    }
  });

  domainEvents.onEvent("PaymentPaid", (payment) => {
    if (!payment.userId) return;
    run(notificationsService.notify(payment.userId, "PAYMENT_PAID", "Pagamento confirmado", "O seu pagamento foi confirmado."));
  });

  domainEvents.onEvent("PaymentRefunded", (payment) => {
    if (!payment.userId) return;
    run(notificationsService.notify(payment.userId, "PAYMENT_REFUNDED", "Pagamento reembolsado", "O seu pagamento foi reembolsado."));
  });
}
