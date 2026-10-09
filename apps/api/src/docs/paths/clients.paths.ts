import { z } from "zod";
import { createWalkInClientSchema, updateWalkInClientSchema } from "../../modules/clients/clients.schema";
import { authErrors, bearerAuth, commonErrors, forbiddenError, listSuccessResponse, registry, successResponse } from "../registry";
import { clientSchema, walkInClientSchema } from "../schemas";

const userIdParam = z.object({ userId: z.string().uuid() });
const idParam = z.object({ id: z.string().uuid() });
const businessIdQuery = z.object({ businessId: z.string().uuid() });

registry.registerPath({
  method: "get",
  path: "/clients",
  tags: ["Clients"],
  summary: "Listar clientes do negócio do dono autenticado",
  security: bearerAuth,
  responses: { 200: listSuccessResponse(clientSchema), ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "get",
  path: "/clients/{userId}",
  tags: ["Clients"],
  summary: "Detalhe de um cliente do negócio",
  security: bearerAuth,
  request: { params: userIdParam },
  responses: { 200: successResponse(clientSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});

// Walk-in clients: no account of their own (name/phone entered manually by staff).
registry.registerPath({
  method: "post",
  path: "/clients/walk-in",
  tags: ["Clients"],
  summary: "Registar cliente walk-in (qualquer staff do negócio)",
  security: bearerAuth,
  request: { body: { content: { "application/json": { schema: createWalkInClientSchema } } } },
  responses: { 201: successResponse(walkInClientSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "get",
  path: "/clients/walk-in",
  tags: ["Clients"],
  summary: "Listar clientes walk-in de um negócio (qualquer staff)",
  security: bearerAuth,
  request: { query: businessIdQuery },
  responses: { 200: successResponse(z.array(walkInClientSchema)), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "get",
  path: "/clients/walk-in/{id}",
  tags: ["Clients"],
  summary: "Detalhe de um cliente walk-in (qualquer staff)",
  security: bearerAuth,
  request: { params: idParam },
  responses: { 200: successResponse(walkInClientSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "put",
  path: "/clients/walk-in/{id}",
  tags: ["Clients"],
  summary: "Atualizar cliente walk-in (dono)",
  security: bearerAuth,
  request: { params: idParam, body: { content: { "application/json": { schema: updateWalkInClientSchema } } } },
  responses: { 200: successResponse(walkInClientSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "delete",
  path: "/clients/walk-in/{id}",
  tags: ["Clients"],
  summary: "Remover cliente walk-in (dono; bloqueado se tiver agendamentos)",
  security: bearerAuth,
  request: { params: idParam },
  responses: { 200: successResponse(z.object({ deleted: z.literal(true) })), ...commonErrors, ...authErrors, ...forbiddenError },
});
