import { z } from "zod";
import {
  createBlockSchema,
  createProfessionalSchema,
  inviteProfessionalSchema,
  updateProfessionalSchema,
} from "../../modules/professionals/professionals.schema";
import { authErrors, bearerAuth, commonErrors, forbiddenError, registry, successResponse } from "../registry";
import { professionalBlockSchema, professionalSchema } from "../schemas";

const idParam = z.object({ id: z.guid() });
const blockParams = z.object({ id: z.guid(), blockId: z.guid() });
const businessIdQuery = z.object({ businessId: z.guid() });

registry.registerPath({
  method: "get",
  path: "/professionals",
  tags: ["Professionals"],
  summary: "Listar profissionais de um negócio",
  request: { query: businessIdQuery },
  responses: { 200: successResponse(z.array(professionalSchema)), ...commonErrors },
});

registry.registerPath({
  method: "get",
  path: "/professionals/me",
  tags: ["Professionals"],
  summary: "Perfil de profissional do utilizador autenticado (funcionário)",
  security: bearerAuth,
  responses: { 200: successResponse(professionalSchema), ...commonErrors, ...authErrors },
});

registry.registerPath({
  method: "get",
  path: "/professionals/{id}",
  tags: ["Professionals"],
  summary: "Detalhe de um profissional",
  request: { params: idParam },
  responses: { 200: successResponse(professionalSchema), ...commonErrors },
});

registry.registerPath({
  method: "post",
  path: "/professionals",
  tags: ["Professionals"],
  summary: "Criar profissional (dono)",
  security: bearerAuth,
  request: { body: { content: { "application/json": { schema: createProfessionalSchema } } } },
  responses: { 201: successResponse(professionalSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "post",
  path: "/professionals/invite",
  tags: ["Professionals"],
  summary: "Convidar funcionário novo (cria User + Professional, dono)",
  description: "Ao contrário de POST /professionals, não exige um userId existente: cria a conta e devolve a senha temporária uma única vez.",
  security: bearerAuth,
  request: { body: { content: { "application/json": { schema: inviteProfessionalSchema } } } },
  responses: {
    201: successResponse(z.object({ professional: professionalSchema, temporaryPassword: z.string() })),
    ...commonErrors,
    ...authErrors,
    ...forbiddenError,
  },
});

registry.registerPath({
  method: "patch",
  path: "/professionals/{id}",
  tags: ["Professionals"],
  summary: "Atualizar profissional (dono)",
  security: bearerAuth,
  request: { params: idParam, body: { content: { "application/json": { schema: updateProfessionalSchema } } } },
  responses: { 200: successResponse(professionalSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "delete",
  path: "/professionals/{id}",
  tags: ["Professionals"],
  summary: "Remover profissional (dono)",
  security: bearerAuth,
  request: { params: idParam },
  responses: { 200: successResponse(z.object({})), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "get",
  path: "/professionals/{id}/blocks",
  tags: ["Professionals"],
  summary: "Listar bloqueios de agenda (dono ou o próprio profissional)",
  security: bearerAuth,
  request: { params: idParam },
  responses: { 200: successResponse(z.array(professionalBlockSchema)), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "post",
  path: "/professionals/{id}/blocks",
  tags: ["Professionals"],
  summary: "Criar bloqueio de agenda (folga/férias)",
  security: bearerAuth,
  request: { params: idParam, body: { content: { "application/json": { schema: createBlockSchema } } } },
  responses: { 201: successResponse(professionalBlockSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "delete",
  path: "/professionals/{id}/blocks/{blockId}",
  tags: ["Professionals"],
  summary: "Remover bloqueio de agenda",
  security: bearerAuth,
  request: { params: blockParams },
  responses: { 200: successResponse(z.object({})), ...commonErrors, ...authErrors, ...forbiddenError },
});
