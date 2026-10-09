import type { Request, Response } from "express";
import type { LoginInput, RefreshInput, RegisterInput } from "@slotix/validation";
import { sendSuccess } from "../../shared/utils/apiResponse";
import { usersService } from "../users";
import type { AppleAuthInput, GoogleAuthInput, GoogleMobileExchangeInput, GoogleMobileStartInput, GoogleUrlQuery } from "./auth.schema";
import { env } from "../../config/env";

// The address the caller reached this API at — what Google has to send the phone back to.
function publicBaseUrl(req: Request): string {
  if (env.API_PUBLIC_URL) return env.API_PUBLIC_URL.replace(/\/$/, "");
  const protocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim() || req.protocol;
  return `${protocol}://${req.get("host")}`;
}
import { authService } from "./auth.service";

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body as RegisterInput);
    sendSuccess(res, result, 201);
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body as LoginInput);
    sendSuccess(res, result);
  },

  googleUrl(req: Request, res: Response) {
    const { redirectUri, state } = req.validatedQuery as unknown as GoogleUrlQuery;
    sendSuccess(res, { url: authService.googleAuthorizationUrl(redirectUri, state) });
  },

  async google(req: Request, res: Response) {
    const result = await authService.googleSignIn(req.body as GoogleAuthInput);
    sendSuccess(res, result);
  },

  googleMobileStart(req: Request, res: Response) {
    sendSuccess(res, authService.googleMobileStart(req.body as GoogleMobileStartInput, publicBaseUrl(req)));
  },

  // Opened by the phone's browser, not by the app: it answers with a redirect, not JSON.
  async googleMobileCallback(req: Request, res: Response) {
    const { code, state, error } = req.query as Record<string, string | undefined>;
    const target = await authService.googleMobileCallback({ code, state, error });

    if (!target) {
      res.status(400).type("text/plain").send("Pedido inválido ou expirado. Volte à aplicação e tente novamente.");
      return;
    }
    res.redirect(target);
  },

  appleMobileStart(req: Request, res: Response) {
    sendSuccess(res, authService.appleMobileStart(req.body as GoogleMobileStartInput, publicBaseUrl(req)));
  },

  // Apple posts a form here from the phone's browser. 303 turns that POST into a plain
  // navigation to the app's deep link.
  async appleMobileCallback(req: Request, res: Response) {
    const target = await authService.appleMobileCallback((req.body ?? {}) as Record<string, string | undefined>);

    if (!target) {
      res.status(400).type("text/plain").send("Pedido inválido ou expirado. Volte à aplicação e tente novamente.");
      return;
    }
    res.redirect(303, target);
  },

  async googleMobileExchange(req: Request, res: Response) {
    const result = await authService.googleMobileExchange(req.body as GoogleMobileExchangeInput);
    sendSuccess(res, result);
  },

  async apple(req: Request, res: Response) {
    const result = await authService.appleSignIn(req.body as AppleAuthInput);
    sendSuccess(res, result);
  },

  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body as RefreshInput;
    const result = await authService.refresh(refreshToken);
    sendSuccess(res, result);
  },

  async logout(req: Request, res: Response) {
    await authService.logout(req.user!.id);
    sendSuccess(res, { loggedOut: true });
  },

  async me(req: Request, res: Response) {
    const profile = await usersService.getProfile(req.user!.id);
    sendSuccess(res, profile);
  },
};
