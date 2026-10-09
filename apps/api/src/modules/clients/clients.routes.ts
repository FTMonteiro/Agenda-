import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { authorize } from "../../shared/middleware/authorize";
import { validate } from "../../shared/middleware/validate";
import { clientsController } from "./clients.controller";
import { createWalkInClientSchema, updateWalkInClientSchema } from "./clients.schema";

export const clientsRoutes = Router();

clientsRoutes.use(authenticate);

// Walk-in clients (no account of their own): create/list/view open to any staff of the
// business; edit/remove restricted to the owner — same split the old dashboard used.
clientsRoutes.post("/walk-in", authorize("OWNER", "EMPLOYEE"), validate(createWalkInClientSchema), clientsController.createWalkIn);
clientsRoutes.get("/walk-in", authorize("OWNER", "EMPLOYEE"), clientsController.listWalkIns);
clientsRoutes.get("/walk-in/:id", authorize("OWNER", "EMPLOYEE"), clientsController.getWalkIn);
clientsRoutes.put("/walk-in/:id", authorize("OWNER"), validate(updateWalkInClientSchema), clientsController.updateWalkIn);
clientsRoutes.delete("/walk-in/:id", authorize("OWNER"), clientsController.removeWalkIn);

// The app clients who booked here: staff see the list (it's who their appointments are
// with); one client's full history stays with the owner.
clientsRoutes.get("/", authorize("OWNER", "EMPLOYEE"), clientsController.listByBusiness);

clientsRoutes.use(authorize("OWNER"));
clientsRoutes.get("/:userId", clientsController.getOne);
