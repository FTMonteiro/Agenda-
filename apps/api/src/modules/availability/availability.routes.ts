import { Router } from "express";
import { validateQuery } from "../../shared/middleware/validate";
import { availabilityController } from "./availability.controller";
import { getAvailabilitySchema } from "./availability.schema";

export const availabilityRoutes = Router();

availabilityRoutes.get("/", validateQuery(getAvailabilitySchema), availabilityController.getSlots);
