import { z } from "zod";

export { loginSchema, registerSchema, refreshSchema } from "@slotix/validation";

// Where Google sends the browser back to: the dashboard's own callback route.
const redirectUri = z.string().url();

export const googleUrlQuerySchema = z.object({
  redirectUri,
  // Opaque value the dashboard generates and checks again on the way back (CSRF).
  state: z.string().min(16).max(200),
});

export const googleAuthSchema = z.object({
  code: z.string().min(1).max(2000),
  redirectUri,
  // "login" only signs in an account that already exists; "register" creates the owner
  // account and its business in one go, so it needs the business name and category.
  mode: z.enum(["login", "register"]),
  company: z.string().trim().min(2).max(120).optional(),
  category: z.string().max(60).optional(),
});

export type GoogleUrlQuery = z.infer<typeof googleUrlQuerySchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;

const mode = z.enum(["login", "register"]);

// The app's flow. `returnUrl` is the deep link that brings the browser back to the app.
export const googleMobileStartSchema = z.object({
  mode,
  returnUrl: z.string().min(1).max(500),
});

export const googleMobileExchangeSchema = z.object({
  handoff: z.string().min(1).max(4000),
  verifier: z.string().min(1).max(200),
});

export const appleAuthSchema = z.object({
  // The JWT the phone receives from Apple after Face ID / password.
  identityToken: z.string().min(1).max(8000),
  mode,
  // Apple only tells the app the person's name the first time, so the app passes it on.
  name: z.string().trim().max(120).optional(),
});

export type GoogleMobileStartInput = z.infer<typeof googleMobileStartSchema>;
export type GoogleMobileExchangeInput = z.infer<typeof googleMobileExchangeSchema>;
export type AppleAuthInput = z.infer<typeof appleAuthSchema>;

// Optional: clients whose session predates sids hand back their refresh token so that
// logout can still end exactly that session.
export const logoutSchema = z.object({ refreshToken: z.string().min(1).max(4000).optional() }).default({});
