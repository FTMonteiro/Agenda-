import type { NextFunction, Request, Response } from "express";
import { AuthenticationError } from "../errors";
import { verifyAccessToken } from "../utils/jwt";

// For public endpoints that do a little more for a signed-in user: a valid token sets
// req.user, anything else (no token, expired, malformed) is treated as anonymous.
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (header?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(header.slice("Bearer ".length));
      req.user = { id: payload.sub, role: payload.role };
    } catch {
      // anonymous
    }
  }
  next();
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    next(new AuthenticationError("Token de acesso em falta."));
    return;
  }

  try {
    const payload = verifyAccessToken(header.slice("Bearer ".length));
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new AuthenticationError("Token de acesso inválido ou expirado."));
  }
}
