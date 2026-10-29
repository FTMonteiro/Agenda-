import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../errors";
import { sendError } from "../utils/apiResponse";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.statusCode);
    return;
  }

  // Two requests racing to create the same thing (a second payment for an appointment, a
  // duplicate favorite): the database's unique constraint wins, and that's a conflict for
  // the caller, not a server fault. Neither message reveals the table or column involved.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      sendError(res, "CONFLICT", "Este registo já existe.", 409);
      return;
    }
    if (err.code === "P2025") {
      sendError(res, "NOT_FOUND", "Recurso não encontrado.", 404);
      return;
    }
  }

  // body-parser / multer errors (malformed JSON, body or file too large) carry their own
  // 4xx status; anything else is ours.
  const status = (err as { status?: unknown; statusCode?: unknown })?.status ?? (err as { statusCode?: unknown })?.statusCode;
  if (typeof status === "number" && status >= 400 && status < 500) {
    sendError(res, "BAD_REQUEST", "Pedido inválido.", status);
    return;
  }
  if ((err as { name?: unknown })?.name === "MulterError") {
    sendError(res, "UPLOAD_INVALID", "Ficheiro inválido ou demasiado grande.", 400);
    return;
  }

  console.error(err);
  sendError(res, "INTERNAL_ERROR", "Ocorreu um erro inesperado.", 500);
}
