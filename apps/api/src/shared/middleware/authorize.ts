import type { NextFunction, Request, Response } from "express";
import type { Role } from "@slotix/types";
import { AuthenticationError, AuthorizationError } from "../errors";

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError());
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AuthorizationError());
      return;
    }

    next();
  };
}
