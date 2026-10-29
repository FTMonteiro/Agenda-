import type { NextFunction, Request, Response } from "express";
import { AuthenticationError } from "../errors";
import { findSessionUser, isSessionActive, isStoredRefreshToken } from "../sessionUsers";
import { verifyAccessToken } from "../utils/jwt";

// The user behind a request's bearer token, or null when there is no usable token: not an
// access token (see utils/jwt), expired, from a session that was ended, or for an account
// that no longer exists.
async function resolveUser(header: string | undefined) {
  if (!header?.startsWith("Bearer ")) return null;
  const raw = header.slice("Bearer ".length);

  let token;
  try {
    token = verifyAccessToken(raw);
  } catch {
    return null;
  }

  const user = await findSessionUser(token.sub);
  if (!user) return null;
  if (token.sid && !(await isSessionActive(token.sid))) return null;
  if (token.legacy && (await isStoredRefreshToken(raw))) return null;

  return { user: { id: user.id, role: user.role }, sessionId: token.sid };
}

// For public endpoints that do a little more for a signed-in user: a valid token sets
// req.user, anything else (no token, expired, malformed) is treated as anonymous.
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  resolveUser(req.headers.authorization)
    .then((resolved) => {
      if (resolved) {
        req.user = resolved.user;
        req.tokenSessionId = resolved.sessionId;
      }
      next();
    })
    .catch(next);
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  if (!req.headers.authorization?.startsWith("Bearer ")) {
    next(new AuthenticationError("Token de acesso em falta."));
    return;
  }

  resolveUser(req.headers.authorization)
    .then((resolved) => {
      if (!resolved) {
        next(new AuthenticationError("Token de acesso inválido ou expirado."));
        return;
      }
      req.user = resolved.user;
      req.tokenSessionId = resolved.sessionId;
      next();
    })
    .catch(next);
}
