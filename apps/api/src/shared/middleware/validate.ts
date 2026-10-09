import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { ValidationError } from "../errors";

export function validate(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const message = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
      next(new ValidationError(message));
      return;
    }

    req.body = result.data;
    next();
  };
}

// Express 5's req.query has no setter, so the parsed/coerced result is stashed on
// req.validatedQuery instead of being written back onto req.query.
export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const message = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
      next(new ValidationError(message));
      return;
    }

    req.validatedQuery = result.data;
    next();
  };
}
