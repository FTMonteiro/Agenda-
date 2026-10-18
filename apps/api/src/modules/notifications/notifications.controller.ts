import type { Request, Response } from "express";
import { sendSuccess } from "../../shared/utils/apiResponse";
import { notificationsService } from "./notifications.service";

export const notificationsController = {
  async listMine(req: Request, res: Response) {
    const notifications = await notificationsService.listMine(req.user!.id);
    sendSuccess(res, notifications);
  },

  async markRead(req: Request<{ id: string }>, res: Response) {
    const notification = await notificationsService.markRead(req.params.id, req.user!.id);
    sendSuccess(res, notification);
  },

  async createForSelf(req: Request, res: Response) {
    const notification = await notificationsService.createForSelf(req.user!.id, req.body ?? {});
    sendSuccess(res, notification, 201);
  },

  async registerPushToken(req: Request, res: Response) {
    await notificationsService.registerPushToken(req.user!.id, req.body?.token);
    sendSuccess(res, { registered: true });
  },

  async removePushToken(req: Request, res: Response) {
    await notificationsService.removePushToken(req.user!.id, req.body?.token);
    sendSuccess(res, { removed: true });
  },

  async markAllRead(req: Request, res: Response) {
    await notificationsService.markAllRead(req.user!.id);
    sendSuccess(res, { updated: true });
  },
};
