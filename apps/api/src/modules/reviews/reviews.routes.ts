import { Router } from "express";
import { createReviewSchema } from "@slotix/validation";
import { authenticate } from "../../shared/middleware/authenticate";
import { authorize } from "../../shared/middleware/authorize";
import { validate } from "../../shared/middleware/validate";
import { reviewsController } from "./reviews.controller";

export const reviewsRoutes = Router();

reviewsRoutes.get("/", reviewsController.listByBusiness);
reviewsRoutes.get("/:id", reviewsController.getById);
reviewsRoutes.post("/", authenticate, authorize("CUSTOMER"), validate(createReviewSchema), reviewsController.create);
