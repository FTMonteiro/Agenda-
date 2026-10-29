import { z } from "zod";
import { authErrors, bearerAuth, commonErrors, forbiddenError, registry, successResponse } from "../registry";
import { galleryImageSchema } from "../schemas";

const businessIdParam = z.object({ businessId: z.guid() });
const imageParams = z.object({ businessId: z.guid(), id: z.guid() });

registry.registerPath({
  method: "get",
  path: "/businesses/{businessId}/gallery",
  tags: ["Gallery"],
  summary: "Listar imagens da galeria de um negócio",
  request: { params: businessIdParam },
  responses: { 200: successResponse(z.array(galleryImageSchema)), ...commonErrors },
});

registry.registerPath({
  method: "post",
  path: "/businesses/{businessId}/gallery",
  tags: ["Gallery"],
  summary: "Enviar imagem para a galeria (dono, máx. 5MB)",
  security: bearerAuth,
  request: {
    params: businessIdParam,
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            file: z.string().openapi({ type: "string", format: "binary", description: "Ficheiro de imagem" }),
            caption: z.string().max(500).optional(),
          }),
        },
      },
    },
  },
  responses: { 201: successResponse(galleryImageSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "patch",
  path: "/businesses/{businessId}/gallery/{id}/cover",
  tags: ["Gallery"],
  summary: "Definir imagem como capa (dono)",
  description: "Sem campo isCover: a imagem em position 0 é a capa por convenção. Move a imagem escolhida para position 0 e desloca as restantes.",
  security: bearerAuth,
  request: { params: imageParams },
  responses: { 200: successResponse(z.array(galleryImageSchema)), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "delete",
  path: "/businesses/{businessId}/gallery/{id}",
  tags: ["Gallery"],
  summary: "Remover imagem da galeria (dono)",
  security: bearerAuth,
  request: { params: imageParams },
  responses: { 200: successResponse(z.object({})), ...commonErrors, ...authErrors, ...forbiddenError },
});
