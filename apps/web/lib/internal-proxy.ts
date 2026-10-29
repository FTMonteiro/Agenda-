import { createHmac } from "node:crypto";
import { isIP } from "node:net";

/*
 * Signs the requests this server forwards to the API with the end user's IP, so the API's
 * per-IP limits count each person separately instead of the whole dashboard as one client.
 * Same scheme as apps/api/src/shared/internalProxy.ts — keep both in step.
 *
 * Server-only settings (hosting panel, never NEXT_PUBLIC_*):
 *   INTERNAL_PROXY_SECRET      the same random secret (32+ chars) as the API's. Unset = no
 *                              signing; the API then sees every dashboard user as this server.
 *   TRUSTED_CLIENT_IP_HEADER   the header the platform in front of this app sets with the
 *                              user's IP and that clients can't forge (e.g. "x-real-ip" on
 *                              Vercel, or whatever nginx is configured to set). Unset = the IP
 *                              isn't reported and the API skips per-IP limits for these requests.
 */
export function clientIpFrom(headers: Headers): string | undefined {
  const name = process.env.TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase();
  if (!name) return undefined;

  // For a list (X-Forwarded-For), the last entry is the one the trusted proxy appended;
  // anything before it may have been sent by the client.
  const candidate = headers.get(name)?.split(",").map((part) => part.trim()).filter(Boolean).at(-1);
  return candidate && isIP(candidate) ? candidate : undefined;
}

export function internalProxyHeaders(clientIp?: string): Record<string, string> {
  const secret = process.env.INTERNAL_PROXY_SECRET;
  if (!secret) return {};

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const ip = clientIp ?? "";
  const signature = createHmac("sha256", secret).update(`agenda-proxy-v1\n${timestamp}\n${ip}`).digest("hex");
  return { "x-agenda-proxy-ts": timestamp, "x-agenda-client-ip": ip, "x-agenda-proxy-sig": signature };
}
