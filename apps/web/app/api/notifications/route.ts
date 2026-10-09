import { randomUUID } from "node:crypto";
import type { NotificationDTO } from "@slotix/types";
import { requireAuth } from "@/lib/auth";
import { apiCall, errorJson, errorResponse } from "@/lib/dashboard-api";

// The API's types are event names (APPOINTMENT_CREATED, PAYMENT_PAID, ...); the bell only
// knows these severities.
function toSeverity(type: string): "INFO" | "SUCCESS" | "WARNING" {
  if (/CANCEL|FAIL|REFUND|EXPIRED/.test(type)) return "WARNING";
  if (/PAID|CONFIRMED|COMPLETED/.test(type)) return "SUCCESS";
  return "INFO";
}

export async function GET() {
  try {
    await requireAuth();
    const notifications = await apiCall<NotificationDTO[]>("/notifications");

    return Response.json({
      success: true,
      notifications: notifications.slice(0, 100).map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: toSeverity(notification.type),
        read: notification.read,
        resourceId: null,
        resourceType: null,
        createdAt: notification.createdAt,
        readAt: notification.read ? notification.createdAt : null,
      })),
      total: notifications.length,
      unreadCount: notifications.filter((notification) => !notification.read).length,
    });
  } catch (error) {
    return errorResponse(error, "Não foi possível carregar as notificações.");
  }
}

// The pages post a notification after their own actions ("Cliente criado", ...). In the
// API notifications are only ever raised by the server from domain events, so there is
// nowhere to store these: the page gets it echoed back for the current session only.
export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!title || !message) return errorJson("O título e a mensagem são obrigatórios.", 400);

    const type = typeof body?.type === "string" ? body.type.toUpperCase() : "INFO";

    return Response.json(
      {
        success: true,
        notification: {
          id: `local-${randomUUID()}`,
          title,
          message,
          type: ["INFO", "SUCCESS", "WARNING", "ERROR"].includes(type) ? type : "INFO",
          read: false,
          resourceId: typeof body?.resourceId === "string" ? body.resourceId : null,
          resourceType: typeof body?.resourceType === "string" ? body.resourceType : null,
          createdAt: new Date().toISOString(),
          readAt: null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error, "Não foi possível criar a notificação.");
  }
}

export async function DELETE() {
  try {
    await requireAuth();
    return errorJson("Ainda não é possível apagar notificações: a API só permite marcá-las como lidas.", 501);
  } catch (error) {
    return errorResponse(error, "Não foi possível apagar as notificações.");
  }
}
