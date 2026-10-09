import { Router, type Request, type Response } from "express";
import { NotFoundError } from "../../shared/errors";
import { authenticate } from "../../shared/middleware/authenticate";
import { validateQuery } from "../../shared/middleware/validate";
import { sendSuccess } from "../../shared/utils/apiResponse";
import { geoReverseQuerySchema, geoSearchQuerySchema, type GeoReverseQuery, type GeoSearchQuery } from "./geo.schema";
import { geoService } from "./geo.service";

export const geoRoutes = Router();

// Public: takes no input and is answered from a month-long cache, so it can't be used to
// push traffic at OpenStreetMap. The app needs it before anyone has signed in.
geoRoutes.get("/provinces", async (_req: Request, res: Response) => {
  sendSuccess(res, await geoService.provinces());
});

// Public for the same reason: the only input is a province name, checked against the
// province list before anything is asked of OpenStreetMap, and each answer is cached.
geoRoutes.get("/provinces/:name/zones", async (req: Request<{ name: string }>, res: Response) => {
  const zones = await geoService.zones(req.params.name);
  if (!zones) throw new NotFoundError("Província não encontrada.", "PROVINCE_NOT_FOUND");
  sendSuccess(res, zones);
});

// Authenticated on purpose: these forward to a rate-limited third party (Nominatim), so
// they are for an owner placing their business, not an open geocoding proxy. Customers
// never need them — they browse the localities that already have businesses.
geoRoutes.get("/search", authenticate, validateQuery(geoSearchQuerySchema), async (req: Request, res: Response) => {
  const { q } = req.validatedQuery as unknown as GeoSearchQuery;
  sendSuccess(res, await geoService.search(q));
});

geoRoutes.get("/reverse", authenticate, validateQuery(geoReverseQuerySchema), async (req: Request, res: Response) => {
  const { latitude, longitude } = req.validatedQuery as unknown as GeoReverseQuery;
  sendSuccess(res, await geoService.reverse(latitude, longitude));
});
