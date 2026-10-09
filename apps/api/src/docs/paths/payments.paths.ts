import { createPaymentSchema } from "@slotix/validation";
import { z } from "zod";
import { authErrors, bearerAuth, commonErrors, forbiddenError, listSuccessResponse, registry, successResponse } from "../registry";
import { paymentSchema } from "../schemas";

const idParam = z.object({ id: z.string().uuid() });

registry.registerPath({
  method: "post",
  path: "/payments",
  tags: ["Payments"],
  summary: "Registar pagamento de um agendamento",
  security: bearerAuth,
  request: { body: { content: { "application/json": { schema: createPaymentSchema } } } },
  responses: { 201: successResponse(paymentSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "post",
  path: "/payments/receive",
  tags: ["Payments"],
  summary: "Registar pagamento recebido presencialmente (staff, em nome do negócio)",
  description:
    "Diferente de POST /payments (o cliente paga a própria marcação): aqui o staff regista um pagamento já recebido (dinheiro, cartão...). Fica PAID e o agendamento CONFIRMED conclui-se imediatamente, atomicamente. Exige que o agendamento esteja CONFIRMED, no mesmo dia, a partir de 15 minutos antes do horário marcado.",
  security: bearerAuth,
  request: { body: { content: { "application/json": { schema: createPaymentSchema } } } },
  responses: { 201: successResponse(paymentSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "get",
  path: "/payments",
  tags: ["Payments"],
  summary: "Listar pagamentos",
  security: bearerAuth,
  responses: { 200: listSuccessResponse(paymentSchema), ...authErrors },
});

registry.registerPath({
  method: "get",
  path: "/payments/{id}",
  tags: ["Payments"],
  summary: "Detalhe de um pagamento",
  security: bearerAuth,
  request: { params: idParam },
  responses: { 200: successResponse(paymentSchema), ...commonErrors, ...authErrors },
});

registry.registerPath({
  method: "patch",
  path: "/payments/{id}/pay",
  tags: ["Payments"],
  summary: "Marcar pagamento como pago (dono)",
  security: bearerAuth,
  request: { params: idParam },
  responses: { 200: successResponse(paymentSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "patch",
  path: "/payments/{id}/fail",
  tags: ["Payments"],
  summary: "Marcar pagamento como falhado (dono)",
  security: bearerAuth,
  request: { params: idParam },
  responses: { 200: successResponse(paymentSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "patch",
  path: "/payments/{id}/refund",
  tags: ["Payments"],
  summary: "Reembolsar pagamento (dono)",
  security: bearerAuth,
  request: { params: idParam },
  responses: { 200: successResponse(paymentSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});
