import { Router, type Request, type Response } from "express";
import { AppError } from "../../shared/errors";
import { authenticate } from "../../shared/middleware/authenticate";
import { realtimeHub } from "./realtime.hub";

export const realtimeRoutes = Router();

// Server-Sent Events: the dashboard and the app keep this open and get each new
// notification and appointment change the moment it happens, instead of polling.
// The token is only checked on connect; the client reconnects (with a fresh token) when
// the connection drops.
// A few tabs and a phone are normal; more than this from one account is a leak or abuse,
// and every open stream holds a socket and memory on the server.
const MAX_STREAMS_PER_USER = 10;

realtimeRoutes.get("/", authenticate, (req: Request, res: Response) => {
  if (realtimeHub.count(req.user!.id) >= MAX_STREAMS_PER_USER) {
    throw new AppError("TOO_MANY_STREAMS", "Demasiadas ligações abertas. Feche outros separadores e tente novamente.", 429);
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // Stops nginx-style proxies from buffering the stream.
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write("retry: 3000\n\n");
  res.write("event: ready\ndata: {}\n\n");

  const remove = realtimeHub.add(req.user!.id, res);

  // A comment line every 25s keeps proxies and load balancers from closing an idle stream.
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    remove();
  });
});
