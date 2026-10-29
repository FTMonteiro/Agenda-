import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { env } from "../config/env";
import { generateOpenApiDocument } from "../docs/openapi";
import { internalProxy } from "../shared/internalProxy";
import { errorHandler } from "../shared/middleware/errorHandler";
import { routes } from "./routes";

// Origins a browser may call this API from. Outside development, nothing configured means
// no browser origin at all (the dashboard calls the API from its own server, and native
// apps send no Origin), never "any origin".
export function corsOrigins(config: Pick<typeof env, "NODE_ENV" | "WEB_URL" | "CORS_ORIGINS">): true | string[] {
  if (config.NODE_ENV === "development") return true;
  return [config.WEB_URL, ...(config.CORS_ORIGINS?.split(",") ?? [])]
    .map((origin) => origin?.trim().replace(/\/$/, ""))
    .filter((origin): origin is string => Boolean(origin));
}

export function apiDocsEnabled(config: Pick<typeof env, "NODE_ENV" | "ENABLE_API_DOCS">): boolean {
  return config.NODE_ENV !== "production" || config.ENABLE_API_DOCS === "true";
}

// The API only ever answers JSON (and one SSE stream): nothing it serves should run
// scripts, be framed, or be sniffed into another type.
function securityHeaders(req: express.Request, res: express.Response, next: express.NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  if (!req.path.startsWith("/api/v1/docs")) {
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  }
  if (env.NODE_ENV === "production") res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
}

export function createApp() {
  const app = express();
  // nosemgrep: ajinabraham.njsscan.good.good_helmet_checks.helmet_header_x_powered_by -- esta linha desativa o X-Powered-By (com os outros cabeçalhos em securityHeaders).
  app.disable("x-powered-by");
  if (env.TRUST_PROXY !== undefined) app.set("trust proxy", env.TRUST_PROXY);
  app.use(securityHeaders);
  app.use(internalProxy);

  // CORS is a browser-only concern: the mobile app's native HTTP calls carry no Origin
  // header and are never subject to this check. Browsers that do send one: the web
  // dashboard (WEB_URL) and the mobile app's own web build (CORS_ORIGINS, e.g. Expo's
  // http://localhost:8081). In development any origin is accepted.
  app.use(cors({ origin: corsOrigins(env) }));
  // Above the 100kb default: an image kept inline (avatar, or a gallery cover when no
  // external storage is configured) travels as a data URL inside the JSON body.
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ success: true, data: { status: "ok" } });
  });

  // Generated once at startup from the same Zod schemas used for request validation
  // (see src/docs), so the docs can't drift silently out of sync with what the API
  // actually accepts.
  // In production the full map of the API isn't handed to anyone who asks (ENABLE_API_DOCS).
  if (apiDocsEnabled(env)) {
    const openApiDocument = generateOpenApiDocument();
    app.get("/api/v1/docs.json", (_req, res) => res.json(openApiDocument));
    app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
  }

  app.use("/api/v1", routes);

  app.use(errorHandler);

  return app;
}
