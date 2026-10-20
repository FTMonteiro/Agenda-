import { AppState, type AppStateStatus } from "react-native";
import { fetch } from "expo/fetch";
import type { NotificationDTO } from "@slotix/types";

import { getAccessToken, getApiUrl } from "./api-client";
import { setRealtimeActive, showLocalNotification } from "./push";

/*
 * Ligação em tempo real à API (Server-Sent Events, GET /events). Enquanto a app está aberta,
 * cada aviso do espaço (agendamento confirmado, cancelado...) chega no instante em que é
 * criado: aparece por cima do ecrã, com som, e as listas abertas atualizam-se sozinhas.
 * Com a app em segundo plano a ligação fecha e quem avisa é o push (push.ts).
 */

export interface AppointmentChangeEvent {
  id: string;
  businessId: string;
  status: string;
  scheduledAt: string;
  change: string;
}

type RealtimeEvents = {
  notification: NotificationDTO;
  appointment: AppointmentChangeEvent;
  // A ligação acabou de (re)abrir: o que estiver aberto relê os dados, para não perder o
  // que mudou enquanto esteve em baixo.
  resync: null;
};

type Listener<K extends keyof RealtimeEvents> = (payload: RealtimeEvents[K]) => void;

const listeners: { [K in keyof RealtimeEvents]: Set<Listener<K>> } = {
  notification: new Set(),
  appointment: new Set(),
  resync: new Set(),
};

export function onRealtime<K extends keyof RealtimeEvents>(event: K, listener: Listener<K>): () => void {
  listeners[event].add(listener);
  return () => {
    listeners[event].delete(listener);
  };
}

function emit<K extends keyof RealtimeEvents>(event: K, payload: RealtimeEvents[K]) {
  for (const listener of listeners[event]) listener(payload);
}

let controller: AbortController | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let wanted = false;
let attempt = 0;
let appStateSubscription: { remove: () => void } | null = null;

function dispatch(event: string, data: string) {
  let payload: unknown;
  try {
    payload = JSON.parse(data);
  } catch {
    return;
  }

  if (event === "notification") {
    const notification = payload as NotificationDTO;
    emit("notification", notification);
    if (!notification.read) void showLocalNotification(notification.title, notification.message);
  } else if (event === "appointment") {
    emit("appointment", payload as AppointmentChangeEvent);
  }
}

function scheduleReconnect() {
  if (!wanted || reconnectTimer) return;
  // 1s, 2s, 4s... até 30s entre tentativas.
  const delay = Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5));
  attempt++;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void open();
  }, delay);
}

async function open() {
  const token = getAccessToken();
  if (!wanted || !token || controller || AppState.currentState !== "active") return;

  const current = new AbortController();
  controller = current;

  try {
    const response = await fetch(`${getApiUrl()}/events`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
      signal: current.signal,
    });
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Cada evento termina numa linha em branco: "event: x\ndata: {...}\n\n".
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        let event = "message";
        let data = "";
        for (const line of frame.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) data += line.slice(5).trim();
        }

        if (event === "ready") {
          setRealtimeActive(true);
          attempt = 0;
          emit("resync", null);
        } else if (data) {
          dispatch(event, data);
        }
      }
    }
  } catch {
    // Rede em baixo, servidor reiniciado, token expirado: tenta de novo mais à frente.
  } finally {
    setRealtimeActive(false);
    if (controller === current) controller = null;
    if (!current.signal.aborted) scheduleReconnect();
  }
}

function close() {
  setRealtimeActive(false);
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  controller?.abort();
  controller = null;
}

function onAppStateChange(state: AppStateStatus) {
  if (state === "active") {
    attempt = 0;
    void open();
  } else {
    close();
  }
}

// Chamado quando há sessão iniciada (AuthContext).
export function startRealtime(): void {
  wanted = true;
  attempt = 0;
  appStateSubscription ??= AppState.addEventListener("change", onAppStateChange);
  void open();
}

// Ao sair da conta.
export function stopRealtime(): void {
  wanted = false;
  appStateSubscription?.remove();
  appStateSubscription = null;
  close();
}
