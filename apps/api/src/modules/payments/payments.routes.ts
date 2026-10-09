import { Router } from "express";
import { createPaymentSchema } from "@slotix/validation";
import { authenticate } from "../../shared/middleware/authenticate";
import { authorize } from "../../shared/middleware/authorize";
import { validate } from "../../shared/middleware/validate";
import { paymentsController } from "./payments.controller";

export const paymentsRoutes = Router();

paymentsRoutes.use(authenticate);

paymentsRoutes.post("/", authorize("CUSTOMER", "ADMIN"), validate(createPaymentSchema), paymentsController.create);
// Staff recording a payment received in person — same body shape, different semantics
// (see paymentsService.receivePayment): PAID immediately, appointment auto-completes.
paymentsRoutes.post(
  "/receive",
  authorize("OWNER", "EMPLOYEE", "ADMIN"),
  validate(createPaymentSchema),
  paymentsController.receivePayment,
);
paymentsRoutes.get("/", paymentsController.list);
paymentsRoutes.get("/:id", paymentsController.getById);
paymentsRoutes.patch("/:id/pay", authorize("OWNER", "ADMIN"), paymentsController.markAsPaid);
paymentsRoutes.patch("/:id/fail", authorize("OWNER", "ADMIN"), paymentsController.markAsFailed);
paymentsRoutes.patch("/:id/refund", authorize("OWNER", "ADMIN"), paymentsController.refund);
