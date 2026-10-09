import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../../shared/middleware/authenticate";
import { authorize } from "../../shared/middleware/authorize";
import { validate, validateQuery } from "../../shared/middleware/validate";
import { businessesController } from "./businesses.controller";
import { createBusinessSchema, getBusinessQuerySchema, listBusinessesQuerySchema, setBusinessHoursSchema, updateBusinessSchema } from "./businesses.schema";

export const businessesRoutes = Router();

// Public, but a signed-in user without coordinates on the request gets distances from
// their last saved position (see withStoredLocation).
businessesRoutes.get("/", optionalAuthenticate, validateQuery(listBusinessesQuerySchema), businessesController.list);
// These must come before /:id, or "mine"/"localities" would be parsed as an :id.
businessesRoutes.get("/mine", authenticate, businessesController.listMine);
businessesRoutes.get("/localities", businessesController.listLocalities);
businessesRoutes.get("/:id", optionalAuthenticate, validateQuery(getBusinessQuerySchema), businessesController.getById);
businessesRoutes.get("/:id/hours", businessesController.getHours);

// No authorize("OWNER") here on purpose: creating a business is how a CUSTOMER becomes
// an OWNER (see businessesService.create) — gating it behind OWNER would be circular.
businessesRoutes.post("/", authenticate, validate(createBusinessSchema), businessesController.create);
businessesRoutes.patch("/:id", authenticate, authorize("OWNER"), validate(updateBusinessSchema), businessesController.update);
businessesRoutes.put("/:id/hours", authenticate, authorize("OWNER"), validate(setBusinessHoursSchema), businessesController.setHours);
businessesRoutes.delete("/:id", authenticate, authorize("OWNER"), businessesController.remove);
