import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { authorize } from "../../shared/middleware/authorize";
import { validate } from "../../shared/middleware/validate";
import { professionalsController } from "./professionals.controller";
import { createBlockSchema, createProfessionalSchema, inviteProfessionalSchema, updateProfessionalSchema } from "./professionals.schema";

export const professionalsRoutes = Router();

professionalsRoutes.get("/", professionalsController.listByBusiness);
// Must come before /:id, or "me" would be parsed as an :id.
professionalsRoutes.get("/me", authenticate, professionalsController.getMine);
professionalsRoutes.get("/:id", professionalsController.getById);

professionalsRoutes.post("/", authenticate, authorize("OWNER"), validate(createProfessionalSchema), professionalsController.create);
// Creates the User (role EMPLOYEE) too, unlike POST / which links an existing userId —
// this is how an owner adds someone who has never signed up.
professionalsRoutes.post("/invite", authenticate, authorize("OWNER"), validate(inviteProfessionalSchema), professionalsController.invite);
// The owner can't see an employee's password, only replace it with a new temporary one.
professionalsRoutes.post("/:id/reset-password", authenticate, authorize("OWNER"), professionalsController.resetPassword);
professionalsRoutes.patch("/:id", authenticate, authorize("OWNER"), validate(updateProfessionalSchema), professionalsController.update);
professionalsRoutes.delete("/:id", authenticate, authorize("OWNER"), professionalsController.remove);

// Blocks (time off): listing/managing is restricted to the owner or the professional
// themselves (assertCanManageBlocks) since a block's `reason` can be sensitive; public
// availability is exposed only as computed free/busy slots via /availability.
professionalsRoutes.get("/:id/blocks", authenticate, professionalsController.listBlocks);
professionalsRoutes.post("/:id/blocks", authenticate, validate(createBlockSchema), professionalsController.addBlock);
professionalsRoutes.delete("/:id/blocks/:blockId", authenticate, professionalsController.removeBlock);
