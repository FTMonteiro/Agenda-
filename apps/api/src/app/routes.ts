import { Router, type Request, type Response } from "express";
import { authRoutes } from "../modules/auth";
import { usersRoutes, usersService } from "../modules/users";
import { businessesRoutes } from "../modules/businesses";
import { clientsRoutes, clientsService } from "../modules/clients";
import { professionalsRoutes, professionalsService } from "../modules/professionals";
import { servicesRoutes, servicesService } from "../modules/services";
import { appointmentsRoutes } from "../modules/appointments";
import { availabilityRoutes } from "../modules/availability";
import { paymentsRoutes, paymentsService } from "../modules/payments";
import { notificationsRoutes } from "../modules/notifications";
import { favoritesRoutes } from "../modules/favorites";
import { reviewsRoutes, reviewsService } from "../modules/reviews";
import { galleryRoutes } from "../modules/gallery";
import { searchRoutes } from "../modules/search";
import { geoRoutes } from "../modules/geo";
import { realtimeRoutes } from "../modules/realtime";
import { authenticate } from "../shared/middleware/authenticate";
import { authorize } from "../shared/middleware/authorize";
import { validate } from "../shared/middleware/validate";
import { sendSuccess } from "../shared/utils/apiResponse";
import { ValidationError } from "../shared/errors";
import { createReviewSchema } from "@slotix/validation";

export const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/users", usersRoutes);
routes.use("/businesses", businessesRoutes);
routes.use("/clients", clientsRoutes);
routes.use("/professionals", professionalsRoutes);
routes.use("/services", servicesRoutes);
routes.use("/appointments", appointmentsRoutes);
routes.use("/availability", availabilityRoutes);
routes.use("/payments", paymentsRoutes);
routes.use("/notifications", notificationsRoutes);
routes.use("/favorites", favoritesRoutes);
routes.use("/reviews", reviewsRoutes);
routes.use("/search", searchRoutes);
routes.use("/geo", geoRoutes);
routes.use("/events", realtimeRoutes);
// Gallery is business-scoped (upload/list/delete images for one business), so it's
// mounted nested rather than as a flat top-level resource. gallery.routes.ts uses
// Router({ mergeParams: true }) to read :businessId from this parent path.
routes.use("/businesses/:businessId/gallery", galleryRoutes);

// Convenience nested routes composed at the top level (rather than importing across
// businesses/services/professionals/reviews) to avoid circular module imports — those
// modules already depend on `businesses` for ownership checks, so `businesses` can't
// depend back on them.
routes.get("/businesses/:id/services", async (req: Request<{ id: string }>, res: Response) => {
  const services = await servicesService.listByBusiness(req.params.id);
  sendSuccess(res, services);
});

routes.get("/businesses/:id/professionals", async (req: Request<{ id: string }>, res: Response) => {
  const professionals = await professionalsService.listByBusiness(req.params.id);
  sendSuccess(res, professionals);
});

// Whether the signed-in customer is a client of the business, and becoming one (the app
// asks when they book). Composed here for the same reason as the routes above.
routes.get("/businesses/:id/membership", authenticate, authorize("CUSTOMER"), async (req: Request<{ id: string }>, res: Response) => {
  const membership = await clientsService.getMembership(req.params.id, req.user!.id);
  sendSuccess(res, membership);
});

routes.post("/businesses/:id/membership", authenticate, authorize("CUSTOMER"), async (req: Request<{ id: string }>, res: Response) => {
  const user = await usersService.getProfile(req.user!.id);
  const membership = await clientsService.join(req.params.id, req.user!.id, user.name);
  sendSuccess(res, membership, 201);
});

routes.get("/businesses/:id/reviews", async (req: Request<{ id: string }>, res: Response) => {
  const reviews = await reviewsService.listByBusiness(req.params.id);
  sendSuccess(res, reviews);
});

routes.post(
  "/businesses/:id/reviews",
  authenticate,
  authorize("CUSTOMER"),
  validate(createReviewSchema),
  async (req: Request<{ id: string }>, res: Response) => {
    const review = await reviewsService.create(req.user!.id, req.body, req.params.id);
    sendSuccess(res, review, 201);
  },
);

// Same reasoning: `payments` already depends on `appointments`, so this nested
// convenience route is composed here instead of `appointments` depending back on it.
routes.get("/appointments/:id/payment", authenticate, async (req: Request<{ id: string }>, res: Response) => {
  const payment = await paymentsService.getByAppointment(req.params.id, req.user!.id, req.user!.role);
  sendSuccess(res, payment);
});

// Same reasoning: `payments` already depends on `businesses`, so this is composed here
// instead of `businesses` depending back on `payments`.
routes.get("/businesses/:id/financials", authenticate, authorize("OWNER"), async (req: Request<{ id: string }>, res: Response) => {
  const month = typeof req.query.month === "string" ? req.query.month : undefined;
  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    throw new ValidationError("O parâmetro month tem de estar no formato YYYY-MM.", "FINANCIALS_INVALID_MONTH");
  }
  const financials = await paymentsService.getFinancials(req.params.id, req.user!.id, month);
  sendSuccess(res, financials);
});
