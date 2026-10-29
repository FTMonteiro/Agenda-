import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

/*
 * The web dashboard calls this API from its own server, so every dashboard user arrives
 * from the same address. To keep per-IP limits per person, the dashboard's server reports
 * the end user's IP in signed headers:
 *
 *   x-agenda-proxy-ts   unix seconds when the request was signed
 *   x-agenda-client-ip  the end user's IP as the web server determined it (may be empty)
 *   x-agenda-proxy-sig  hex HMAC-SHA256(INTERNAL_PROXY_SECRET, "agenda-proxy-v1\n<ts>\n<ip>")
 *
 * Only a valid, fresh signature is trusted. Anything else — no secret configured, a bad or
 * stale signature, a plain X-Forwarded-For sent by a client — is ignored, and the request
 * counts against the address it actually came from. The same scheme is implemented on the
 * web side in apps/web/lib/internal-proxy.ts; the two must stay in step.
 */
export const INTERNAL_PROXY_HEADERS = { timestamp: "x-agenda-proxy-ts", clientIp: "x-agenda-client-ip", signature: "x-agenda-proxy-sig" } as const;

const MAX_CLOCK_SKEW_SECONDS = 300;

export function internalProxySignature(secret: string, timestamp: string, clientIp: string): string {
  return createHmac("sha256", secret).update(`agenda-proxy-v1\n${timestamp}\n${clientIp}`).digest("hex");
}

function verified(req: Request, secret: string): { clientIp?: string } | null {
  const signature = req.get(INTERNAL_PROXY_HEADERS.signature);
  const timestamp = req.get(INTERNAL_PROXY_HEADERS.timestamp) ?? "";
  const clientIp = req.get(INTERNAL_PROXY_HEADERS.clientIp)?.trim() ?? "";
  if (!signature || !/^\d{1,12}$/.test(timestamp)) return null;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > MAX_CLOCK_SKEW_SECONDS) return null;
  if (clientIp && !isIP(clientIp)) return null;

  // nosemgrep: ajinabraham.njsscan.generic.hardcoded_secrets.node_secret -- o segredo vem de env.INTERNAL_PROXY_SECRET; nada está fixo no código.
  const expected = Buffer.from(internalProxySignature(secret, timestamp, clientIp), "hex");
  const given = Buffer.from(signature, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return { clientIp: clientIp || undefined };
}

export function internalProxy(req: Request, _res: Response, next: NextFunction): void {
  const proxied = env.INTERNAL_PROXY_SECRET ? verified(req, env.INTERNAL_PROXY_SECRET) : null;
  if (proxied) {
    req.viaInternalProxy = true;
    req.clientIp = proxied.clientIp;
  } else {
    req.viaInternalProxy = false;
    req.clientIp = req.ip;
  }
  next();
}
