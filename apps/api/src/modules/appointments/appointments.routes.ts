import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { authorize } from "../../shared/middleware/authorize";
import { validate } from "../../shared/middleware/validate";
import { appointmentsController } from "./appointments.controller";
import { createAppointmentSchema, createWalkInAppointmentSchema, rescheduleAppointmentSchema } from "./appointments.schema";

export const appointmentsRoutes = Router();

appointmentsRoutes.use(authenticate);

appointmentsRoutes.post("/", authorize("CUSTOMER"), validate(createAppointmentSchema), appointmentsController.create);
appointmentsRoutes.post(
  "/walk-in",
  authorize("OWNER", "EMPLOYEE"),
  validate(createWalkInAppointmentSchema),
  appointmentsController.createForWalkIn,
);
appointmentsRoutes.get("/", appointmentsController.list);
appointmentsRoutes.get("/:id", appointmentsController.getById);
appointmentsRoutes.patch("/:id/cancel", appointmentsController.cancel);
appointmentsRoutes.patch("/:id/confirm", authorize("OWNER", "EMPLOYEE"), appointmentsController.confirm);
appointmentsRoutes.patch("/:id/complete", authorize("OWNER", "EMPLOYEE"), appointmentsController.complete);
appointmentsRoutes.patch("/:id/no-show", authorize("OWNER", "EMPLOYEE"), appointmentsController.markNoShow);
appointmentsRoutes.patch("/:id/reschedule", validate(rescheduleAppointmentSchema), appointmentsController.reschedule);
