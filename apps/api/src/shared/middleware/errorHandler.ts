import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors";
import { sendError } from "../utils/apiResponse";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.statusCode);
    return;
  }

  console.error(err);
  sendError(res, "INTERNAL_ERROR", "Ocorreu um erro inesperado.", 500);
}
