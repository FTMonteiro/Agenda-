import { z } from "zod";
import {
  createBusinessSchema,
  getBusinessQuerySchema,
  listBusinessesQuerySchema,
  setBusinessHoursSchema,
  updateBusinessSchema,
} from "../../modules/businesses/businesses.schema";
import { authErrors, bearerAuth, commonErrors, forbiddenError, registry, successResponse, listSuccessResponse } from "../registry";
import { authTokensSchema, businessHoursEntrySchema, businessSchema, financialsSummarySchema, professionalSchema, serviceSchema } from "../schemas";

const idParam = z.object({ id: z.guid() });

registry.registerPath({
  method: "get",
  path: "/businesses",
  tags: ["Businesses"],
  summary: "Listar negócios (público, com filtros e ordenação)",
  request: { query: listBusinessesQuerySchema },
  responses: {
    200: listSuccessResponse(businessSchema),
    ...commonErrors,
  },
});

registry.registerPath({
  method: "get",
  path: "/businesses/mine",
  tags: ["Businesses"],
  summary: "Listar os próprios negócios (dono)",
  security: bearerAuth,
  responses: { 200: successResponse(z.array(businessSchema)), ...authErrors },
});

registry.registerPath({
  method: "get",
  path: "/businesses/localities",
  tags: ["Businesses"],
  summary: "Localidades onde existem negócios, com a contagem de cada uma",
  responses: {
    200: successResponse(
      z.array(z.object({
          provincia: z.string(),
          municipio: z.string().nullable(),
          bairro: z.string().nullable(),
          count: z.number().int(),
        })),
    ),
    ...commonErrors,
  },
});

registry.registerPath({
  method: "get",
  path: "/businesses/{id}",
  tags: ["Businesses"],
  summary: "Detalhe de um negócio (com distanceKm se vier a posição do cliente)",
  request: { params: idParam, query: getBusinessQuerySchema },
  responses: {
    200: successResponse(businessSchema),
    ...commonErrors,
  },
});

registry.registerPath({
  method: "get",
  path: "/businesses/{id}/hours",
  tags: ["Businesses"],
  summary: "Horário de funcionamento do negócio",
  request: { params: idParam },
  responses: {
    200: listSuccessResponse(businessHoursEntrySchema),
    ...commonErrors,
  },
});

registry.registerPath({
  method: "post",
  path: "/businesses",
  tags: ["Businesses"],
  summary: "Criar negócio (qualquer utilizador autenticado; promove a OWNER se ainda não for)",
  description:
    "Não exige role OWNER: é assim que um CUSTOMER se torna dono. Devolve tokens novos porque o token de acesso atual do chamador ainda carrega o role antigo.",
  security: bearerAuth,
  request: { body: { content: { "application/json": { schema: createBusinessSchema } } } },
  responses: {
    201: successResponse(z.object({ business: businessSchema, tokens: authTokensSchema })),
    ...commonErrors,
    ...authErrors,
  },
});

registry.registerPath({
  method: "patch",
  path: "/businesses/{id}",
  tags: ["Businesses"],
  summary: "Atualizar negócio (dono)",
  security: bearerAuth,
  request: { params: idParam, body: { content: { "application/json": { schema: updateBusinessSchema } } } },
  responses: {
    200: successResponse(businessSchema),
    ...commonErrors,
    ...authErrors,
    ...forbiddenError,
  },
});

registry.registerPath({
  method: "put",
  path: "/businesses/{id}/hours",
  tags: ["Businesses"],
  summary: "Substituir o horário de funcionamento (dono)",
  security: bearerAuth,
  request: { params: idParam, body: { content: { "application/json": { schema: setBusinessHoursSchema } } } },
  responses: {
    200: listSuccessResponse(businessHoursEntrySchema),
    ...commonErrors,
    ...authErrors,
    ...forbiddenError,
  },
});

registry.registerPath({
  method: "delete",
  path: "/businesses/{id}",
  tags: ["Businesses"],
  summary: "Remover negócio (dono)",
  security: bearerAuth,
  request: { params: idParam },
  responses: {
    200: successResponse(z.object({})),
    ...commonErrors,
    ...authErrors,
    ...forbiddenError,
  },
});

// Convenience nested reads, composed at the top level in routes.ts but reachable at
// these same /businesses/{id}/... URLs.
registry.registerPath({
  method: "get",
  path: "/businesses/{id}/services",
  tags: ["Businesses"],
  summary: "Serviços de um negócio",
  request: { params: idParam },
  responses: {
    200: successResponse(z.array(serviceSchema)),
    ...commonErrors,
  },
});

registry.registerPath({
  method: "get",
  path: "/businesses/{id}/professionals",
  tags: ["Businesses"],
  summary: "Profissionais de um negócio",
  request: { params: idParam },
  responses: {
    200: successResponse(z.array(professionalSchema)),
    ...commonErrors,
  },
});

registry.registerPath({
  method: "get",
  path: "/businesses/{id}/financials",
  tags: ["Businesses"],
  summary: "Relatório financeiro do negócio (dono)",
  description: "Receita é reconhecida por paidAt, não createdAt. todayRevenue/todayPayments refletem sempre o dia real atual, independente do ?month escolhido.",
  security: bearerAuth,
  request: { params: idParam, query: z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional().openapi({ example: "2026-09" }) }) },
  responses: {
    200: successResponse(financialsSummarySchema),
    ...commonErrors,
    ...authErrors,
    ...forbiddenError,
  },
});
