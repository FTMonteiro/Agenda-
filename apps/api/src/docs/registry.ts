import { OpenAPIRegistry, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z, type ZodTypeAny } from "zod";

// Must run once, before any `.openapi(...)` call anywhere in this module tree.
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

export const paginationMetaSchema = registry.register(
  "PaginationMeta",
  z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
  }),
);

export const errorResponseSchema = registry.register(
  "ApiError",
  z.object({
    success: z.literal(false),
    error: z.object({
      code: z.string().openapi({ example: "VALIDATION_ERROR" }),
      message: z.string().openapi({ example: "Mensagem descritiva do erro." }),
    }),
  }),
);

function jsonContent(schema: ZodTypeAny) {
  return { content: { "application/json": { schema } } };
}

export function successResponse(schema: ZodTypeAny, description = "Sucesso") {
  return {
    description,
    ...jsonContent(z.object({ success: z.literal(true), data: schema })),
  };
}

export function listSuccessResponse(schema: ZodTypeAny, description = "Sucesso") {
  return {
    description,
    ...jsonContent(
      z.object({
        success: z.literal(true),
        data: z.array(schema),
        meta: paginationMetaSchema,
      }),
    ),
  };
}

export function errorResponse(description: string) {
  return { description, ...jsonContent(errorResponseSchema) };
}

// Attach only the subset that's actually reachable for a given route (e.g. a public
// GET has no 401/403); 400/404 are close enough to universal to default in everywhere.
export const commonErrors = {
  400: errorResponse("Dados de entrada inválidos"),
  404: errorResponse("Recurso não encontrado"),
};

export const authErrors = {
  401: errorResponse("Token de acesso em falta, inválido ou expirado"),
};

export const forbiddenError = {
  403: errorResponse("Autenticado mas sem permissão para esta ação"),
};

export const bearerAuth = [{ bearerAuth: [] }];
