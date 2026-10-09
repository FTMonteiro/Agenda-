"use client";

/*
 TIPOS
|
*/

export type NotificationType =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR";

export interface AppNotification {
  id: string;

  title: string;

  message: string;

  type: NotificationType;

  read: boolean;

  resourceId: string | null;

  resourceType: string | null;

  createdAt: string;

  readAt: string | null;
}

type Listener = () => void;

/* STORE*/

let items: AppNotification[] = [];

const listeners = new Set<Listener>();

const SERVER_SNAPSHOT: AppNotification[] = [];

/*
 EMIT
*/

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

/*
SUBSCRIBE
*/

export function subscribe(
  listener: Listener,
) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/*
SNAPSHOT
*/

export function getSnapshot() {
  return items;
}

export function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

/*
|
| DEFINIR NOTIFICAÇÕES
|
|
| Substitui completamente o estado local pelo estado vindo da API.
|
*/

export function setNotifications(
  notifications: AppNotification[],
) {
  items = notifications;

  emit();
}

/*
  
  ADICIONAR NOTIFICAÇÃO
|
*/

export function addNotification(
  notification: AppNotification,
) {
  const exists = items.some(
    (item) =>
      item.id === notification.id,
  );

  if (exists) {
    return;
  }

  items = [
    notification,
    ...items,
  ];

  emit();
}

/*
  
  CARREGAR NOTIFICAÇÕES DA API
|
*/

export async function loadNotifications() {
  try {
    const response =
      await fetch(
        "/api/notifications",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

    if (!response.ok) {
      return false;
    }

    const data =
      await response.json();

    if (
      !data.success ||
      !Array.isArray(
        data.notifications,
      )
    ) {
      return false;
    }

    setNotifications(
      data.notifications as AppNotification[],
    );

    return true;
  } catch (error) {
    console.error(
      "Erro ao carregar notificações:",
      error,
    );

    return false;
  }
}

/*
  
  HIDRATAR NOTIFICAÇÕES
|
|
| Mantemos esta função porque o NotificationsProvider
| chama hydrateNotifications().
|
*/

let hydrationStarted = false;

export function hydrateNotifications() {
  if (hydrationStarted) {
    return;
  }

  hydrationStarted = true;

  void loadNotifications();
}

/*
  
   MARCAR TODAS COMO LIDAS
|
*/

export async function markAllAsRead() {
  try {
    const response =
      await fetch(
        "/api/notifications/read-all",
        {
          method: "PATCH",
          credentials: "include",
        },
      );

    if (!response.ok) {
      return false;
    }

    /*
     * Actualização imediata da interface.
     */

    items = items.map(
      (item) => ({
        ...item,

        read: true,

        readAt:
          item.readAt ??
          new Date().toISOString(),
      }),
    );

    emit();

    return true;
  } catch (error) {
    console.error(
      "Erro ao marcar notificações como lidas:",
      error,
    );

    return false;
  }
}

/*
  
  LIMPAR TODAS
|
| Apaga definitivamente do PostgreSQL.
|
*/

export async function clearAll() {
  try {
    const response =
      await fetch(
        "/api/notifications",
        {
          method: "DELETE",
          credentials: "include",
        },
      );

    if (!response.ok) {
      return false;
    }

    items = [];

    emit();

    return true;
  } catch (error) {
    console.error(
      "Erro ao limpar notificações:",
      error,
    );

    return false;
  }
}