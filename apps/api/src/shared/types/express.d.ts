import type { Role } from "@slotix/types";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
      };
      validatedQuery?: Record<string, unknown>;
    }
  }
}

export {};
