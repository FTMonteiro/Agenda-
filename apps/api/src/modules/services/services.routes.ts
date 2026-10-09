import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { authorize } from "../../shared/middleware/authorize";
import { validate } from "../../shared/middleware/validate";
import { servicesController } from "./services.controller";
import { createServiceSchema, updateServiceSchema } from "./services.schema";

export const servicesRoutes = Router();

servicesRoutes.get("/", servicesController.listByBusiness);
servicesRoutes.get("/:id", servicesController.getById);

servicesRoutes.post("/", authenticate, authorize("OWNER"), validate(createServiceSchema), servicesController.create);
servicesRoutes.patch("/:id", authenticate, authorize("OWNER"), validate(updateServiceSchema), servicesController.update);
servicesRoutes.delete("/:id", authenticate, authorize("OWNER"), servicesController.remove);
