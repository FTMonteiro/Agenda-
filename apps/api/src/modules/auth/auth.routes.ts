import express, { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { validate, validateQuery } from "../../shared/middleware/validate";
import { authController } from "./auth.controller";
import {
  appleAuthSchema,
  googleAuthSchema,
  googleMobileExchangeSchema,
  googleMobileStartSchema,
  googleUrlQuerySchema,
  loginSchema,
  refreshSchema,
  registerSchema,
} from "./auth.schema";

export const authRoutes = Router();

authRoutes.post("/register", validate(registerSchema), authController.register);
authRoutes.post("/login", validate(loginSchema), authController.login);
authRoutes.get("/google/url", validateQuery(googleUrlQuerySchema), authController.googleUrl);
authRoutes.post("/google", validate(googleAuthSchema), authController.google);
authRoutes.post("/google/mobile/start", validate(googleMobileStartSchema), authController.googleMobileStart);
authRoutes.get("/google/mobile/callback", authController.googleMobileCallback);
authRoutes.post("/google/mobile/exchange", validate(googleMobileExchangeSchema), authController.googleMobileExchange);
authRoutes.post("/apple", validate(appleAuthSchema), authController.apple);
authRoutes.post("/apple/mobile/start", validate(googleMobileStartSchema), authController.appleMobileStart);
// Apple answers with an HTML form post, not JSON.
authRoutes.post("/apple/mobile/callback", express.urlencoded({ extended: false }), authController.appleMobileCallback);
// Same handoff as Google's flow; the name only says which button started it.
authRoutes.post("/apple/mobile/exchange", validate(googleMobileExchangeSchema), authController.googleMobileExchange);
authRoutes.post("/refresh", validate(refreshSchema), authController.refresh);
authRoutes.post("/logout", authenticate, authController.logout);
authRoutes.get("/me", authenticate, authController.me);
