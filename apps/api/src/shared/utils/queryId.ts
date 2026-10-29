import type { Request } from "express";
import { ValidationError } from "../errors";

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// An id from the query string. Express hands a repeated parameter over as an array (and
// anything at all as a string), which used to reach Prisma and come back as a 500; here
// it's a 400 before any query runs.
export function queryId(req: Request, name: string, options: { required: true }): string;
export function queryId(req: Request, name: string, options?: { required?: false }): string | undefined;
export function queryId(req: Request, name: string, options: { required?: boolean } = {}): string | undefined {
  const value = req.query[name];
  if (value === undefined || value === "") {
    if (options.required) throw new ValidationError(`O parâmetro ${name} é obrigatório.`);
    return undefined;
  }
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    throw new ValidationError(`O parâmetro ${name} é inválido.`);
  }
  return value;
}
