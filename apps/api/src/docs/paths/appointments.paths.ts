import { createAppointmentSchema, rescheduleAppointmentSchema } from "@slotix/validation";
import { z } from "zod";
import { createWalkInAppointmentSchema } from "../../modules/appointments/appointments.schema";
import { authErrors, bearerAuth, commonErrors, forbiddenError, listSuccessResponse, registry, successResponse } from "../registry";
import { appointmentSchema, paymentSchema } from "../schemas";

const idParam = z.object({ id: z.guid() });

registry.registerPath({
  method: "post",
  path: "/appointments",
  tags: ["Appointments"],
  summary: "Criar agendamento (cliente)",
  security: bearerAuth,
  request: { body: { content: { "application/json": { schema: createAppointmentSchema } } } },
  responses: { 201: successResponse(appointmentSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "post",
  path: "/appointments/walk-in",
  tags: ["Appointments"],
  summary: "Criar agendamento em nome de um cliente walk-in (staff)",
  security: bearerAuth,
  request: { body: { content: { "application/json": { schema: createWalkInAppointmentSchema } } } },
  responses: { 201: successResponse(appointmentSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "get",
  path: "/appointments",
  tags: ["Appointments"],
  summary: "Listar os próprios agendamentos (cliente) ou os do negócio (dono)",
  security: bearerAuth,
  responses: { 200: listSuccessResponse(appointmentSchema), ...authErrors },
});

registry.registerPath({
  method: "get",
  path: "/appointments/{id}",
  tags: ["Appointments"],
  summary: "Detalhe de um agendamento",
  security: bearerAuth,
  request: { params: idParam },
  responses: { 200: successResponse(appointmentSchema), ...commonErrors, ...authErrors },
});

registry.registerPath({
  method: "patch",
  path: "/appointments/{id}/cancel",
  tags: ["Appointments"],
  summary: "Cancelar agendamento",
  security: bearerAuth,
  request: { params: idParam },
  responses: { 200: successResponse(appointmentSchema), ...commonErrors, ...authErrors },
});

registry.registerPath({
  method: "patch",
  path: "/appointments/{id}/confirm",
  tags: ["Appointments"],
  summary: "Confirmar agendamento (dono)",
  security: bearerAuth,
  request: { params: idParam },
  responses: { 200: successResponse(appointmentSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "patch",
  path: "/appointments/{id}/complete",
  tags: ["Appointments"],
  summary: "Marcar agendamento como concluído (dono)",
  security: bearerAuth,
  request: { params: idParam },
  responses: { 200: successResponse(appointmentSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "patch",
  path: "/appointments/{id}/reschedule",
  tags: ["Appointments"],
  summary: "Reagendar",
  security: bearerAuth,
  request: { params: idParam, body: { content: { "application/json": { schema: rescheduleAppointmentSchema } } } },
  responses: { 200: successResponse(appointmentSchema), ...commonErrors, ...authErrors },
});

registry.registerPath({
  method: "get",
  path: "/appointments/{id}/payment",
  tags: ["Appointments"],
  summary: "Pagamento associado ao agendamento",
  security: bearerAuth,
  request: { params: idParam },
  responses: { 200: successResponse(paymentSchema), ...commonErrors, ...authErrors },
});
