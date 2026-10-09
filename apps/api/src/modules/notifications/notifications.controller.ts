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

  async markAllRead(req: Request, res: Response) {
    await notificationsService.markAllRead(req.user!.id);
    sendSuccess(res, { updated: true });
  },
};
