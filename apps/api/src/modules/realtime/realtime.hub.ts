import type { Response } from "express";

// Every open live connection, per user. A user can have several at once (the dashboard
// in two tabs, the app on a phone), and every one of them receives each event.
// In-memory: fine while the API runs as a single process; several instances would need a
// shared channel (e.g. Postgres LISTEN/NOTIFY) to fan out between them.
const connections = new Map<string, Set<Response>>();

export type RealtimeEvent =
  | { type: "notification"; data: { id: string; type: string; title: string; message: string; read: boolean; createdAt: string } }
  | { type: "appointment"; data: { id: string; businessId: string; status: string; scheduledAt: string; change: string } };

export const realtimeHub = {
  count(userId: string): number {
    return connections.get(userId)?.size ?? 0;
  },

  add(userId: string, res: Response): () => void {
    let set = connections.get(userId);
    if (!set) {
      set = new Set();
      connections.set(userId, set);
    }
    set.add(res);

    return () => {
      set.delete(res);
      if (set.size === 0) connections.delete(userId);
    };
  },

  send(userIds: Iterable<string>, event: RealtimeEvent): void {
    const frame = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
    for (const userId of new Set(userIds)) {
      for (const res of connections.get(userId) ?? []) res.write(frame);
    }
  },
};
