import type { Response } from "express";
import type { PaginationMeta } from "@slotix/types";

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data });
}

export function sendListSuccess<T>(res: Response, data: T[], meta: PaginationMeta): void {
  res.status(200).json({ success: true, data, meta });
}

export function sendError(res: Response, code: string, message: string, statusCode: number): void {
  res.status(statusCode).json({ success: false, error: { code, message } });
}
