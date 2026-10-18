import type { NotificationDTO } from "@slotix/types";
import { AuthorizationError, NotFoundError, ValidationError } from "../../shared/errors";
import { notificationsRepository } from "./notifications.repository";
import { sendPush } from "./pushNotifications";

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
  // Stored for the bell and also pushed, with sound, to the user's phones.
  async notify(userId: string, type: string, title: string, message: string): Promise<void> {
    await notificationsRepository.create({ userId, type, title, message });
    await sendPush(userId, title, message);
  },

  // What the dashboard records about its own actions ("Cliente criado", ...), so it stays
  // in the bell instead of only lasting until the page reloads. Not pushed: the person is
  // the one who just did it.
  async createForSelf(userId: string, input: { type?: unknown; title?: unknown; message?: unknown }): Promise<NotificationDTO> {
    const title = typeof input.title === "string" ? input.title.trim().slice(0, 200) : "";
    const message = typeof input.message === "string" ? input.message.trim().slice(0, 1000) : "";
    if (!title || !message) throw new ValidationError("O título e a mensagem são obrigatórios.", "NOTIFICATION_INVALID");

    const type = typeof input.type === "string" && /^[A-Z_]{1,40}$/.test(input.type) ? input.type : "INFO";
    const notification = await notificationsRepository.create({ userId, type, title, message });
    return toNotificationDTO(notification);
  },

  async registerPushToken(userId: string, token: unknown): Promise<void> {
    if (typeof token !== "string" || !/^(Exponent|Expo)PushToken\[.+\]$/.test(token)) {
      throw new ValidationError("Token de notificações inválido.", "PUSH_TOKEN_INVALID");
    }
    await notificationsRepository.savePushToken(userId, token);
  },

  async removePushToken(userId: string, token: unknown): Promise<void> {
    if (typeof token === "string") await notificationsRepository.deletePushToken(userId, token);
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
