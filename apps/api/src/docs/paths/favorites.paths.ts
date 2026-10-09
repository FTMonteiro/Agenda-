import { z } from "zod";
import { authErrors, bearerAuth, commonErrors, listSuccessResponse, registry, successResponse } from "../registry";
import { favoriteSchema } from "../schemas";

const businessIdParam = z.object({ businessId: z.string().uuid() });

registry.registerPath({
  method: "get",
  path: "/favorites",
  tags: ["Favorites"],
  summary: "Listar os próprios favoritos",
  security: bearerAuth,
  responses: { 200: listSuccessResponse(favoriteSchema), ...authErrors },
});

registry.registerPath({
  method: "post",
  path: "/favorites/{businessId}",
  tags: ["Favorites"],
  summary: "Adicionar negócio aos favoritos",
  security: bearerAuth,
  request: { params: businessIdParam },
  responses: { 201: successResponse(favoriteSchema), ...commonErrors, ...authErrors },
});

registry.registerPath({
  method: "delete",
  path: "/favorites/{businessId}",
  tags: ["Favorites"],
  summary: "Remover negócio dos favoritos",
  security: bearerAuth,
  request: { params: businessIdParam },
  responses: { 200: successResponse(z.object({})), ...commonErrors, ...authErrors },
});
