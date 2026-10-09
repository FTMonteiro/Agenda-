import { Router } from "express";
import { optionalAuthenticate } from "../../shared/middleware/authenticate";
import { validateQuery } from "../../shared/middleware/validate";
import { searchController } from "./search.controller";
import { searchQuerySchema } from "./search.schema";

export const searchRoutes = Router();

// Public — the same endpoint Web and Mobile both call, no separate mobile route.
searchRoutes.get("/", optionalAuthenticate, validateQuery(searchQuerySchema), searchController.search);
