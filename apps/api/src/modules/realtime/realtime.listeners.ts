import type { AppointmentDTO } from "@slotix/types";
import { domainEvents } from "../../shared/events/domainEvents";
import { realtimeHub } from "./realtime.hub";
import { realtimeRepository } from "./realtime.repository";

// Everyone who sees this appointment somewhere: the business's owner and staff (agenda
// on the dashboard) and the client who booked it (list in the app).
async function broadcastAppointment(appointment: AppointmentDTO, change: string) {
  const staff = await realtimeRepository.findBusinessStaffUserIds(appointment.businessId);
  const recipients = appointment.clientId ? [...staff, appointment.clientId] : staff;

  realtimeHub.send(recipients, {
    type: "appointment",
    data: {
      id: appointment.id,
      businessId: appointment.businessId,
      status: appointment.status,
      scheduledAt: appointment.scheduledAt,
      change,
    },
  });
}

export function registerRealtimeListeners(): void {
  domainEvents.onEvent("AppointmentChanged", ({ appointment, change }) => {
    broadcastAppointment(appointment, change).catch((error) => console.error("Falha ao enviar atualização em tempo real:", error));
  });
}
