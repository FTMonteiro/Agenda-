import type { AppointmentDTO, CreateAppointmentRequest } from "@slotix/types";
import { apiFetch } from "./api-client";

export async function listMyAppointments(): Promise<AppointmentDTO[]> {
  return apiFetch<AppointmentDTO[]>("/appointments");
}

export async function getAppointment(id: string): Promise<AppointmentDTO> {
  return apiFetch<AppointmentDTO>(`/appointments/${id}`);
}

export async function createAppointment(input: CreateAppointmentRequest): Promise<AppointmentDTO> {
  return apiFetch<AppointmentDTO>("/appointments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function cancelAppointment(id: string): Promise<AppointmentDTO> {
  return apiFetch<AppointmentDTO>(`/appointments/${id}/cancel`, { method: "PATCH" });
}
