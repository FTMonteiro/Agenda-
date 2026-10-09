import { Router } from "express";
import { sendError } from "./apiResponse";

/**
 * Placeholder router for modules whose folder structure exists (per the modular
 * monolith layout) but whose business logic hasn't been built yet.
 */
export function notImplementedRouter(moduleName: string): Router {
  const router = Router();

  router.use((_req, res) => {
    sendError(res, "MODULE_NOT_IMPLEMENTED", `O módulo "${moduleName}" ainda não está implementado.`, 501);
  });

  return router;
}
