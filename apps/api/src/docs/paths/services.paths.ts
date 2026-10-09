import { z } from "zod";
import { createServiceSchema, updateServiceSchema } from "../../modules/services/services.schema";
import { authErrors, bearerAuth, commonErrors, forbiddenError, registry, successResponse } from "../registry";
import { serviceSchema } from "../schemas";

const idParam = z.object({ id: z.string().uuid() });
const businessIdQuery = z.object({ businessId: z.string().uuid() });

registry.registerPath({
  method: "get",
  path: "/services",
  tags: ["Services"],
  summary: "Listar serviços de um negócio",
  request: { query: businessIdQuery },
  responses: { 200: successResponse(z.array(serviceSchema)), ...commonErrors },
});

registry.registerPath({
  method: "get",
  path: "/services/{id}",
  tags: ["Services"],
  summary: "Detalhe de um serviço",
  request: { params: idParam },
  responses: { 200: successResponse(serviceSchema), ...commonErrors },
});

registry.registerPath({
  method: "post",
  path: "/services",
  tags: ["Services"],
  summary: "Criar serviço (dono)",
  security: bearerAuth,
  request: { body: { content: { "application/json": { schema: createServiceSchema } } } },
  responses: { 201: successResponse(serviceSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "patch",
  path: "/services/{id}",
  tags: ["Services"],
  summary: "Atualizar serviço (dono)",
  security: bearerAuth,
  request: { params: idParam, body: { content: { "application/json": { schema: updateServiceSchema } } } },
  responses: { 200: successResponse(serviceSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "delete",
  path: "/services/{id}",
  tags: ["Services"],
  summary: "Remover serviço (dono)",
  security: bearerAuth,
  request: { params: idParam },
  responses: { 200: successResponse(z.object({})), ...commonErrors, ...authErrors, ...forbiddenError },
});
