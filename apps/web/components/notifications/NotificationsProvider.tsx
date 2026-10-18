"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import {
  getServerSnapshot,
  getSnapshot,
  hydrateNotifications,
  loadNotifications,
  subscribe,
  setNotifications,
  markAllAsRead as markNotificationsAsRead,
  clearAll as clearNotifications,
  type AppNotification,
  type NotificationType,
} from "./notificationsStore";

/*
  
  EXPORTS
|
*/

export type {
  AppNotification,
  NotificationType,
};

/*
  
  TIPOS ANTIGOS
|
| O sistema de agendamentos usa:
|
| created
| updated
| deleted
|
| A base de dados usa:
|
| INFO
| SUCCESS
| WARNING
| ERROR
|
  
*/

export type NotificationKind =
  | "created"
  | "updated"
  | "deleted";

type NotifyInput = {
  kind: NotificationKind;

  title: string;

  description: string;

  resourceId?: string;

  resourceType?: string;
};

/*
  
  CONVERTER KIND → TYPE

*/

function getNotificationType(
  kind: NotificationKind,
): NotificationType {
  switch (kind) {
    case "created":
      return "SUCCESS";

    case "updated":
      return "INFO";

    case "deleted":
      return "WARNING";

    default:
      return "INFO";
  }
}

/*
  
  SOM DA NOTIFICAÇÃO

*/

function playNotificationSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const context =
      new AudioContextClass();

    const oscillator =
      context.createOscillator();

    const gain =
      context.createGain();

    oscillator.type =
      "sine";

    oscillator.frequency.setValueAtTime(
      880,
      context.currentTime,
    );

    oscillator.frequency.setValueAtTime(
      1174,
      context.currentTime + 0.08,
    );

    gain.gain.setValueAtTime(
      0.0001,
      context.currentTime,
    );

    gain.gain.exponentialRampToValueAtTime(
      0.15,
      context.currentTime + 0.01,
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + 0.25,
    );

    oscillator.connect(gain);

    gain.connect(
      context.destination,
    );

    oscillator.start();

    oscillator.stop(
      context.currentTime + 0.25,
    );

    oscillator.addEventListener(
      "ended",
      () => {
        void context.close();
      },
    );
  } catch {
    /*
     * O navegador pode bloquear áudio.
     */
  }
}

/*
  NOTIFICAÇÕES DESTA SESSÃO

  As que o próprio painel acabou de criar (a página já mostrou a mensagem): vão para o
  sininho, mas sem som nem mensagem repetida.
*/

const ownNotificationIds =
  new Set<string>();

/*
| PROVIDER

*/

export function NotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const firstLoad =
    useRef(true);

  const previousIds =
    useRef<Set<string>>(
      new Set(),
    );

  /*
  
   HIDRATAR

  */

  useEffect(() => {
    hydrateNotifications();
  }, []);

  /*
 
  STORE
 
  */

  const notifications =
    useSyncExternalStore(
      subscribe,
      getSnapshot,
      getServerSnapshot,
    );

  /*
 ACTUALIZAR NOTIFICAÇÕES
 
  */

  const refreshNotifications =
    useCallback(
      async () => {
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
            return;
          }

          const data =
            await response.json();

          if (
            !data.success ||
            !Array.isArray(
              data.notifications,
            )
          ) {
            return;
          }

          const incoming =
            data.notifications as AppNotification[];

          const incomingIds =
            new Set(
              incoming.map(
                (item) =>
                  item.id,
              ),
            );

          /* DETECTAR NOVA NOTIFICAÇÃO*/

          if (
            !firstLoad.current
          ) {
            const fresh =
              incoming.filter(
                (item) =>
                  !item.read &&
                  !ownNotificationIds.has(
                    item.id,
                  ) &&
                  !previousIds.current.has(
                    item.id,
                  ),
              );

            if (fresh.length > 0) {
              playNotificationSound();

              /* MENSAGEM NA TELA (ex.: novo agendamento feito pela app) */

              for (const item of fresh.slice(0, 3)) {
                toast(item.title, {
                  description:
                    item.message,
                  duration: 8000,
                });
              }
            }
          }

          /* GUARDAR IDS
*/

          previousIds.current =
            incomingIds;

          /* ACTUALIZAR STORE*/

          setNotifications(
            incoming,
          );

          firstLoad.current =
            false;
        } catch (error) {
          console.error(
            "Erro ao actualizar notificações:",
            error,
          );
        }
      },
      [],
    );

  /*
  PRIMEIRA CARGA
  */

  useEffect(() => {
    void refreshNotifications();
  }, [
    refreshNotifications,
  ]);

  /*
   POLLING
  Consulta o banco a cada 5 segundos.
  */

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          void refreshNotifications();
        },
        5000,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [
    refreshNotifications,
  ]);

  /*PROVIDER*/

  return (
    <>
      {children}
    </>
  );
}

/*HOOK*/

export function useNotifications() {
  const notifications =
    useSyncExternalStore(
      subscribe,
      getSnapshot,
      getServerSnapshot,
    );

  const unreadCount =
    notifications.filter(
      (item) =>
        !item.read,
    ).length;

  /* CRIAR NOTIFICAÇÃO*/

  const notify =
    useCallback(
      async ({
        kind,
        title,
        description,
        resourceId,
        resourceType,
      }: NotifyInput) => {
        try {
          const response =
            await fetch(
              "/api/notifications",
              {
                method: "POST",

                credentials:
                  "include",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body: JSON.stringify({
                  title,

                  message:
                    description,

                  type:
                    getNotificationType(
                      kind,
                    ),

                  resourceId:
                    resourceId ??
                    null,

                  resourceType:
                    resourceType ??
                    null,
                }),
              },
            );

          if (!response.ok) {
            const data =
              await response
                .json()
                .catch(
                  () => null,
                );

            console.error(
              "Erro ao criar notificação:",
              data,
            );

            return null;
          }

          const data =
            await response.json();

          if (
            !data.success ||
            !data.notification
          ) {
            return null;
          }

          ownNotificationIds.add(
            data.notification.id,
          );

          /* ACTUALIZAR STORE*/

          await refreshNotificationsDirectly();

          return data.notification;
        } catch (error) {
          console.error(
            "Erro ao criar notificação:",
            error,
          );

          return null;
        }
      },
      [],
    );

  /*MARCAR TODAS COMO LIDAS*/

  const markAllAsRead =
    useCallback(
      async () => {
        return await markNotificationsAsRead();
      },
      [],
    );

  /* LIMPAR TODAS*/

  const clearAll =
    useCallback(
      async () => {
        return await clearNotifications();
      },
      [],
    );

  return {
    notifications,

    unreadCount,

    notify,

    markAllAsRead,

    clearAll,
  };
}

/* ACTUALIZAR DIRECTAMENTE DO SERVIDOR*/

async function refreshNotificationsDirectly() {
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
      return;
    }

    const data =
      await response.json();

    if (
      !data.success ||
      !Array.isArray(
        data.notifications,
      )
    ) {
      return;
    }

    setNotifications(
      data.notifications as AppNotification[],
    );
  } catch (error) {
    console.error(
      "Erro ao actualizar notificações:",
      error,
    );
  }
}