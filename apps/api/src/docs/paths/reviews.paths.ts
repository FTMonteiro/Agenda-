import { createReviewSchema } from "@slotix/validation";
import { z } from "zod";
import { authErrors, bearerAuth, commonErrors, forbiddenError, registry, successResponse } from "../registry";
import { reviewSchema } from "../schemas";

const idParam = z.object({ id: z.string().uuid() });
const businessIdParam = z.object({ id: z.string().uuid() });
const businessIdQuery = z.object({ businessId: z.string().uuid() });

registry.registerPath({
  method: "get",
  path: "/reviews",
  tags: ["Reviews"],
  summary: "Listar avaliações de um negócio",
  request: { query: businessIdQuery },
  responses: { 200: successResponse(z.array(reviewSchema)), ...commonErrors },
});

registry.registerPath({
  method: "post",
  path: "/reviews",
  tags: ["Reviews"],
  summary: "Avaliar um negócio após um agendamento concluído (cliente)",
  security: bearerAuth,
  request: { body: { content: { "application/json": { schema: createReviewSchema } } } },
  responses: { 201: successResponse(reviewSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});

registry.registerPath({
  method: "get",
  path: "/reviews/{id}",
  tags: ["Reviews"],
  summary: "Detalhe de uma avaliação",
  request: { params: idParam },
  responses: { 200: successResponse(reviewSchema), ...commonErrors },
});

// Nested under /businesses/{id}/reviews (composed at the top level in routes.ts).
registry.registerPath({
  method: "get",
  path: "/businesses/{id}/reviews",
  tags: ["Reviews"],
  summary: "Avaliações de um negócio",
  request: { params: businessIdParam },
  responses: { 200: successResponse(z.array(reviewSchema)), ...commonErrors },
});

registry.registerPath({
  method: "post",
  path: "/businesses/{id}/reviews",
  tags: ["Reviews"],
  summary: "Avaliar um negócio após um agendamento concluído (cliente)",
  security: bearerAuth,
  request: { params: businessIdParam, body: { content: { "application/json": { schema: createReviewSchema } } } },
  responses: { 201: successResponse(reviewSchema), ...commonErrors, ...authErrors, ...forbiddenError },
});
