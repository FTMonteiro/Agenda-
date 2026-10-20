import { apiProxyFetch } from "@/lib/api-proxy";

// The live channel (Server-Sent Events) of the API, relayed as-is: the session token
// lives in an httpOnly cookie, so the browser can't open the API's /events itself.
// Closing the tab aborts the upstream connection too.
export async function GET(request: Request) {
  const upstream = await apiProxyFetch("/events", {
    headers: { Accept: "text/event-stream" },
    signal: request.signal,
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(null, { status: upstream.status === 401 ? 401 : 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
