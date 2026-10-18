import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { notificationsController } from "./notifications.controller";

export const notificationsRoutes = Router();

notificationsRoutes.use(authenticate);
notificationsRoutes.get("/", notificationsController.listMine);
notificationsRoutes.post("/", notificationsController.createForSelf);
notificationsRoutes.post("/push-token", notificationsController.registerPushToken);
notificationsRoutes.delete("/push-token", notificationsController.removePushToken);
notificationsRoutes.patch("/read-all", notificationsController.markAllRead);
notificationsRoutes.patch("/:id/read", notificationsController.markRead);
