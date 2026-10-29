import type { Role } from "@slotix/types";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
      };
      validatedQuery?: Record<string, unknown>;
      // Set by shared/internalProxy.ts: the address per-IP limits count against, and whether
      // the request came signed from the web dashboard's server.
      // The session (sid) of the access token that authenticated the request, if it has one.
      tokenSessionId?: string;
      clientIp?: string;
      viaInternalProxy?: boolean;
    }
  }
}

export {};
