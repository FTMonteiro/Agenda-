import { byBodyEmail, byIp, byRefreshToken, rateLimit } from "../../shared/middleware/rateLimit";
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
  logoutSchema,
  refreshSchema,
  registerSchema,
} from "./auth.schema";

export const authRoutes = Router();

const MINUTE = 60_000;
// Per account first (the dashboard's users can share one server IP), per IP as a backstop
// against one machine spraying many accounts. See shared/middleware/rateLimit.ts.
const loginLimit = rateLimit("login", { windowMs: 15 * MINUTE, max: 10, key: byBodyEmail }, { windowMs: 15 * MINUTE, max: 300, key: byIp });
const registerLimit = rateLimit("register", { windowMs: 60 * MINUTE, max: 5, key: byBodyEmail }, { windowMs: 60 * MINUTE, max: 100, key: byIp });
const refreshLimit = rateLimit("refresh", { windowMs: 15 * MINUTE, max: 30, key: byRefreshToken });
const oauthLimit = rateLimit("oauth", { windowMs: 15 * MINUTE, max: 100, key: byIp });

authRoutes.post("/register", validate(registerSchema), registerLimit, authController.register);
authRoutes.post("/login", validate(loginSchema), loginLimit, authController.login);
authRoutes.get("/google/url", oauthLimit, validateQuery(googleUrlQuerySchema), authController.googleUrl);
authRoutes.post("/google", oauthLimit, validate(googleAuthSchema), authController.google);
authRoutes.post("/google/mobile/start", oauthLimit, validate(googleMobileStartSchema), authController.googleMobileStart);
authRoutes.get("/google/mobile/callback", oauthLimit, authController.googleMobileCallback);
authRoutes.post("/google/mobile/exchange", oauthLimit, validate(googleMobileExchangeSchema), authController.googleMobileExchange);
authRoutes.post("/apple", oauthLimit, validate(appleAuthSchema), authController.apple);
authRoutes.post("/apple/mobile/start", oauthLimit, validate(googleMobileStartSchema), authController.appleMobileStart);
// Apple answers with an HTML form post, not JSON.
authRoutes.post("/apple/mobile/callback", oauthLimit, express.urlencoded({ extended: false }), authController.appleMobileCallback);
// Same handoff as Google's flow; the name only says which button started it.
authRoutes.post("/apple/mobile/exchange", oauthLimit, validate(googleMobileExchangeSchema), authController.googleMobileExchange);
authRoutes.post("/refresh", refreshLimit, validate(refreshSchema), authController.refresh);
authRoutes.post("/logout", authenticate, validate(logoutSchema), authController.logout);
authRoutes.post("/logout-all", authenticate, authController.logoutAll);
authRoutes.get("/me", authenticate, authController.me);
