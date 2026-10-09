import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { env } from "../config/env";
import { generateOpenApiDocument } from "../docs/openapi";
import { errorHandler } from "../shared/middleware/errorHandler";
import { routes } from "./routes";

export function createApp() {
  const app = express();

  // CORS is a browser-only concern: the mobile app's native HTTP calls carry no Origin
  // header and are never subject to this check. Browsers that do send one: the web
  // dashboard (WEB_URL) and the mobile app's own web build (CORS_ORIGINS, e.g. Expo's
  // http://localhost:8081). In development any origin is accepted.
  const allowedOrigins = [env.WEB_URL, ...(env.CORS_ORIGINS?.split(",") ?? [])]
    .map((origin) => origin?.trim())
    .filter((origin): origin is string => Boolean(origin));
  app.use(cors({ origin: env.NODE_ENV === "development" || allowedOrigins.length === 0 ? true : allowedOrigins }));
  // Above the 100kb default: an image kept inline (avatar, or a gallery cover when no
  // external storage is configured) travels as a data URL inside the JSON body.
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ success: true, data: { status: "ok" } });
  });

  // Generated once at startup from the same Zod schemas used for request validation
  // (see src/docs), so the docs can't drift silently out of sync with what the API
  // actually accepts.
  const openApiDocument = generateOpenApiDocument();
  app.get("/api/v1/docs.json", (_req, res) => res.json(openApiDocument));
  app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use("/api/v1", routes);

  app.use(errorHandler);

  return app;
}
