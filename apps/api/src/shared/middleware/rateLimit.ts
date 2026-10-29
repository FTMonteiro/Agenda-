import { createHash } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors";
import { normalizeEmail } from "../utils/email";

/*
 * Fixed-window request limits, kept in memory. Enough while the API runs as one process
 * (as the realtime hub already assumes); several instances would each count separately,
 * which only makes the limits looser, never blocks anyone wrongly.
 *
 * Keys lean on the account (email, user id) rather than the IP: the web dashboard calls
 * the API from its own server, so all of its users can share one IP unless TRUST_PROXY is
 * set behind a proxy that forwards the real client address.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const sweep = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}, 60_000);
sweep.unref();

interface RateLimitRule {
  windowMs: number;
  max: number;
  // What is being counted; returning null skips this rule for the request.
  key: (req: Request) => string | null | undefined;
}

export function rateLimit(name: string, ...rules: RateLimitRule[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();

    for (const [index, rule] of rules.entries()) {
      const subject = rule.key(req);
      if (!subject) continue;

      const key = `${name}:${index}:${subject}`;
      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + rule.windowMs };
        buckets.set(key, bucket);
      }
      bucket.count += 1;

      if (bucket.count > rule.max) {
        res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000).toString());
        next(new AppError("RATE_LIMITED", "Demasiadas tentativas. Aguarde alguns minutos e tente novamente.", 429));
        return;
      }
    }
    next();
  };
}

// The end user's address (see shared/internalProxy.ts). A signed dashboard request that
// couldn't tell the user's IP isn't counted per IP at all — counting it against the
// dashboard server's address would make every dashboard user share one limit.
export const byIp = (req: Request) => (req.viaInternalProxy ? req.clientIp : (req.clientIp ?? req.ip ?? "unknown"));
// A refresh token is limited on its own: the dashboard refreshes all of its users' sessions
// from one server, so a per-IP limit would end unrelated users' sessions together.
export const byRefreshToken = (req: Request) => {
  const token = (req.body as { refreshToken?: unknown } | undefined)?.refreshToken;
  return typeof token === "string" ? createHash("sha256").update(token).digest("hex") : null;
};
export const byUser = (req: Request) => req.user?.id;
export const byBodyEmail = (req: Request) => {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  // The canonical address: "Ana@X.ao" and " ana@x.ao" are one bucket. Variants that are
  // different addresses (ana_silva vs ana.silva) are different accounts too, now that
  // lookups match exactly — so they can't be used to spread attempts against one account.
  return typeof email === "string" ? normalizeEmail(email) : null;
};

// Tests start every case from empty counters.
export function resetRateLimits(): void {
  buckets.clear();
}
