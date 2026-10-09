import { z } from "zod";
import { authErrors, bearerAuth, commonErrors, listSuccessResponse, registry, successResponse } from "../registry";
import { notificationSchema } from "../schemas";

const idParam = z.object({ id: z.string().uuid() });

registry.registerPath({
  method: "get",
  path: "/notifications",
  tags: ["Notifications"],
  summary: "Listar as próprias notificações",
  security: bearerAuth,
  responses: { 200: listSuccessResponse(notificationSchema), ...authErrors },
});

registry.registerPath({
  method: "patch",
  path: "/notifications/read-all",
  tags: ["Notifications"],
  summary: "Marcar todas as notificações como lidas",
  security: bearerAuth,
  responses: { 200: successResponse(z.object({})), ...authErrors },
});

registry.registerPath({
  method: "patch",
  path: "/notifications/{id}/read",
  tags: ["Notifications"],
  summary: "Marcar uma notificação como lida",
  security: bearerAuth,
  request: { params: idParam },
  responses: { 200: successResponse(notificationSchema), ...commonErrors, ...authErrors },
});
