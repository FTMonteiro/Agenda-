import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { validate } from "../../shared/middleware/validate";
import { usersController } from "./users.controller";
import { changePasswordSchema, updateLocationSchema, updateProfileSchema } from "./users.schema";

export const usersRoutes = Router();

usersRoutes.use(authenticate);
usersRoutes.get("/me", usersController.me);
usersRoutes.patch("/me", validate(updateProfileSchema), usersController.updateMe);
usersRoutes.put("/me/location", validate(updateLocationSchema), usersController.updateLocation);
usersRoutes.post("/me/password", validate(changePasswordSchema), usersController.changePassword);
usersRoutes.delete("/me", usersController.deleteMe);
