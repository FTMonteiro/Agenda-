import { loginSchema, refreshSchema, registerSchema } from "@slotix/validation";
import { z } from "zod";
import {
  appleAuthSchema,
  googleAuthSchema,
  googleMobileExchangeSchema,
  googleMobileStartSchema,
  googleUrlQuerySchema,
} from "../../modules/auth/auth.schema";
import { commonErrors, registry, successResponse, bearerAuth, authErrors } from "../registry";
import { authTokensSchema, loginResponseSchema, userSchema } from "../schemas";

registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary: "Criar conta (cliente)",
  request: { body: { content: { "application/json": { schema: registerSchema } } } },
  responses: {
    201: successResponse(loginResponseSchema, "Conta criada, sessão iniciada"),
    ...commonErrors,
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Autenticar com email e senha",
  request: { body: { content: { "application/json": { schema: loginSchema } } } },
  responses: {
    200: successResponse(loginResponseSchema, "Autenticado"),
    ...commonErrors,
    401: authErrors[401],
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/google/url",
  tags: ["Auth"],
  summary: "Endereço da Google para escolher a conta (login com Google do painel)",
  description:
    "O painel redireciona o browser para o `url` devolvido. `redirectUri` tem de ser `<origem do painel>/api/auth/google/callback` e estar autorizado no cliente OAuth da Google Cloud.",
  request: { query: googleUrlQuerySchema },
  responses: {
    200: successResponse(z.object({ url: z.string().url() })),
    ...commonErrors,
    503: { description: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET não configurados (GOOGLE_NOT_CONFIGURED)" },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/google",
  tags: ["Auth"],
  summary: "Autenticar ou criar conta com o código devolvido pela Google",
  description:
    "`mode: login` só entra numa conta já existente com o mesmo email (SOCIAL_NOT_REGISTERED caso contrário). `mode: register` cria o dono e o seu espaço (`company` e `category` obrigatórios; EMAIL_ALREADY_REGISTERED se o email já existir).",
  request: { body: { content: { "application/json": { schema: googleAuthSchema } } } },
  responses: {
    200: successResponse(loginResponseSchema, "Autenticado"),
    ...commonErrors,
    401: authErrors[401],
    409: { description: "Email já registado (EMAIL_ALREADY_REGISTERED)" },
    503: { description: "Login com Google não configurado (GOOGLE_NOT_CONFIGURED)" },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/google/mobile/start",
  tags: ["Auth"],
  summary: "App: iniciar o login/registo com Google",
  description:
    "Devolve o `url` a abrir no browser do telemóvel e um `verifier` que a app guarda. A Google devolve o browser a `/auth/google/mobile/callback`, que o reencaminha para `returnUrl` com `?handoff=…` (ou `?error=CÓDIGO`). A app troca o handoff por uma sessão em `/auth/google/mobile/exchange`.",
  request: { body: { content: { "application/json": { schema: googleMobileStartSchema } } } },
  responses: {
    200: successResponse(z.object({ url: z.string().url(), verifier: z.string() })),
    ...commonErrors,
    503: { description: "Login com Google não configurado (GOOGLE_NOT_CONFIGURED)" },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/google/mobile/exchange",
  tags: ["Auth"],
  summary: "App: trocar o handoff do login com Google por uma sessão",
  request: { body: { content: { "application/json": { schema: googleMobileExchangeSchema } } } },
  responses: {
    200: successResponse(loginResponseSchema, "Autenticado"),
    ...commonErrors,
    401: authErrors[401],
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/apple",
  tags: ["Auth"],
  summary: "App (iOS): autenticar ou criar conta com o identityToken da Apple",
  description:
    "`mode: login` só entra numa conta já existente com o mesmo email (SOCIAL_NOT_REGISTERED caso contrário); `mode: register` cria uma conta de cliente (EMAIL_ALREADY_REGISTERED se já existir).",
  request: { body: { content: { "application/json": { schema: appleAuthSchema } } } },
  responses: {
    200: successResponse(loginResponseSchema, "Autenticado"),
    ...commonErrors,
    401: authErrors[401],
    409: { description: "Email já registado (EMAIL_ALREADY_REGISTERED)" },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/apple/mobile/start",
  tags: ["Auth"],
  summary: "App (Android): iniciar o login/registo com Apple pelo browser",
  description:
    "Igual a `/auth/google/mobile/start`, com a página da Apple. Precisa de `APPLE_SERVICE_ID`. A Apple devolve o browser (form POST) a `/auth/apple/mobile/callback`; a app troca o handoff em `/auth/apple/mobile/exchange`.",
  request: { body: { content: { "application/json": { schema: googleMobileStartSchema } } } },
  responses: {
    200: successResponse(z.object({ url: z.string().url(), verifier: z.string() })),
    ...commonErrors,
    503: { description: "Login com Apple não configurado (APPLE_NOT_CONFIGURED)" },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/apple/mobile/exchange",
  tags: ["Auth"],
  summary: "App (Android): trocar o handoff do login com Apple por uma sessão",
  request: { body: { content: { "application/json": { schema: googleMobileExchangeSchema } } } },
  responses: {
    200: successResponse(loginResponseSchema, "Autenticado"),
    ...commonErrors,
    401: authErrors[401],
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/refresh",
  tags: ["Auth"],
  summary: "Trocar um refresh token válido por um novo par de tokens",
  request: { body: { content: { "application/json": { schema: refreshSchema } } } },
  responses: {
    200: successResponse(authTokensSchema, "Novo par de tokens"),
    ...commonErrors,
    401: authErrors[401],
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  tags: ["Auth"],
  summary: "Terminar sessão",
  security: bearerAuth,
  responses: {
    200: successResponse(z.object({}).openapi({ description: "Vazio" })),
    ...authErrors,
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/me",
  tags: ["Auth"],
  summary: "Dados do utilizador autenticado",
  security: bearerAuth,
  responses: {
    200: successResponse(userSchema),
    ...authErrors,
  },
});
