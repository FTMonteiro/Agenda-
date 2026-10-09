import type { NotificationDTO } from "@slotix/types";
import { apiFetch } from "./api-client";

export async function listNotifications(): Promise<NotificationDTO[]> {
  return apiFetch<NotificationDTO[]>("/notifications");
}

export async function markNotificationRead(id: string): Promise<NotificationDTO> {
  return apiFetch<NotificationDTO>(`/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch<{ updated: boolean }>("/notifications/read-all", { method: "PATCH" });
}
