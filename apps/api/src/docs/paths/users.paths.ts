import { z } from "zod";
import { changePasswordSchema, updateProfileSchema, updateLocationSchema } from "../../modules/users/users.schema";
import { authErrors, bearerAuth, commonErrors, registry, successResponse } from "../registry";
import { userSchema } from "../schemas";

registry.registerPath({
  method: "get",
  path: "/users/me",
  tags: ["Users"],
  summary: "Perfil do utilizador autenticado",
  security: bearerAuth,
  responses: {
    200: successResponse(userSchema),
    ...authErrors,
  },
});

registry.registerPath({
  method: "patch",
  path: "/users/me",
  tags: ["Users"],
  summary: "Atualizar perfil (nome, telefone, avatar)",
  security: bearerAuth,
  request: { body: { content: { "application/json": { schema: updateProfileSchema } } } },
  responses: {
    200: successResponse(userSchema),
    ...commonErrors,
    ...authErrors,
  },
});

registry.registerPath({
  method: "put",
  path: "/users/me/location",
  tags: ["Users"],
  summary: "Guardar a posição atual do utilizador (usada para calcular distâncias)",
  security: bearerAuth,
  request: { body: { content: { "application/json": { schema: updateLocationSchema } } } },
  responses: {
    200: successResponse(userSchema),
    ...commonErrors,
    ...authErrors,
  },
});

registry.registerPath({
  method: "post",
  path: "/users/me/avatar",
  tags: ["Users"],
  summary: "Carregar a foto de perfil (multipart, campo \"file\": JPEG, PNG ou WEBP)",
  security: bearerAuth,
  request: {
    body: { content: { "multipart/form-data": { schema: z.object({ file: z.string().openapi({ format: "binary" }) }) } } },
  },
  responses: {
    200: successResponse(userSchema),
    ...commonErrors,
    ...authErrors,
  },
});

registry.registerPath({
  method: "delete",
  path: "/users/me/avatar",
  tags: ["Users"],
  summary: "Remover a foto de perfil",
  security: bearerAuth,
  responses: {
    200: successResponse(userSchema),
    ...authErrors,
  },
});

registry.registerPath({
  method: "post",
  path: "/users/me/password",
  tags: ["Users"],
  summary: "Alterar a própria senha",
  security: bearerAuth,
  request: { body: { content: { "application/json": { schema: changePasswordSchema } } } },
  responses: {
    200: successResponse(z.object({})),
    ...commonErrors,
    ...authErrors,
  },
});

registry.registerPath({
  method: "delete",
  path: "/users/me",
  tags: ["Users"],
  summary: "Apagar a própria conta",
  security: bearerAuth,
  responses: {
    200: successResponse(z.object({})),
    ...authErrors,
  },
});
