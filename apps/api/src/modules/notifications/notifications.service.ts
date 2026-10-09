import type { NotificationDTO } from "@slotix/types";
import { AuthorizationError, NotFoundError } from "../../shared/errors";
import { notificationsRepository } from "./notifications.repository";

function toNotificationDTO(notification: {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}): NotificationDTO {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    createdAt: notification.createdAt.toISOString(),
  };
}

export const notificationsService = {
  async notify(userId: string, type: string, title: string, message: string): Promise<void> {
    await notificationsRepository.create({ userId, type, title, message });
  },

  async listMine(userId: string): Promise<NotificationDTO[]> {
    const notifications = await notificationsRepository.findByUser(userId);
    return notifications.map(toNotificationDTO);
  },

  async markRead(id: string, userId: string): Promise<NotificationDTO> {
    const notification = await notificationsRepository.findById(id);
    if (!notification) throw new NotFoundError("Notificação não encontrada.", "NOTIFICATION_NOT_FOUND");
    if (notification.userId !== userId) throw new AuthorizationError();

    const updated = await notificationsRepository.markRead(id);
    return toNotificationDTO(updated);
  },

  async markAllRead(userId: string): Promise<void> {
    await notificationsRepository.markAllRead(userId);
  },
};
