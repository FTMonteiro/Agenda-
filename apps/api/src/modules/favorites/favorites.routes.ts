import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { favoritesController } from "./favorites.controller";

export const favoritesRoutes = Router();

favoritesRoutes.use(authenticate);
favoritesRoutes.get("/", favoritesController.listMine);
favoritesRoutes.post("/:businessId", favoritesController.add);
favoritesRoutes.delete("/:businessId", favoritesController.remove);
