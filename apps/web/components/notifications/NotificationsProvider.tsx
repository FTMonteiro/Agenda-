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
  addNotification,
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
  SOM DA NOTIFICAÇÃO — SINO

  Duas badaladas ("ding-dong") sintetizadas: cada uma é a soma dos parciais de um sino,
  que se apagam aos poucos. O navegador só deixa tocar som depois de a pessoa interagir
  com a página, por isso o AudioContext é criado (ou retomado) no primeiro clique/tecla e
  reaproveitado — assim o sino toca mesmo com o separador em segundo plano.
*/

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) return null;

  audioContext = new AudioContextClass();
  return audioContext;
}

function unlockAudio() {
  const context = getAudioContext();
  if (context?.state === "suspended") void context.resume();
}

const BELL_PARTIALS = [
  { ratio: 1, gain: 1, decay: 1.6 },
  { ratio: 2, gain: 0.5, decay: 1.1 },
  { ratio: 3, gain: 0.25, decay: 0.8 },
  { ratio: 4.2, gain: 0.15, decay: 0.5 },
  { ratio: 5.4, gain: 0.08, decay: 0.35 },
];

function strikeBell(context: AudioContext, frequency: number, at: number, volume: number) {
  for (const partial of BELL_PARTIALS) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency * partial.ratio, at);

    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume * partial.gain, at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + partial.decay);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(at);
    oscillator.stop(at + partial.decay + 0.05);
  }
}

function playNotificationSound() {
  try {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === "suspended") void context.resume();

    const now = context.currentTime + 0.02;
    strikeBell(context, 1046.5, now, 0.18);
    strikeBell(context, 784, now + 0.32, 0.16);
  } catch {
    /*
     * O navegador pode bloquear áudio.
     */
  }
}

/*
  TIPO DA API → GRAVIDADE DO SININHO (o mesmo que app/api/notifications/route.ts faz)
*/

function toSeverity(type: string): NotificationType {
  if (type === "ERROR") return "ERROR";
  if (/CANCEL|FAIL|REFUND|EXPIRED|WARNING/.test(type)) return "WARNING";
  if (/PAID|CONFIRMED|COMPLETED|SUCCESS/.test(type)) return "SUCCESS";
  return "INFO";
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
   TEMPO REAL

   Ligação permanente à API (/api/events): cada notificação nova (ex.: agendamento
   feito pela app) chega no instante em que é criada — vai para o sininho, toca o sino
   e aparece a mensagem no ecrã. Cada alteração num agendamento avisa as páginas abertas
   (agenda, home), que se atualizam sozinhas, sem indicador de carregamento.
   O EventSource volta a ligar-se sozinho se a ligação cair; a cada (re)ligação as
   notificações são relidas, para não se perder nada do tempo em que esteve em baixo.
  */

  useEffect(() => {
    const events = new EventSource("/api/events");

    const onReady = () => {
      void refreshNotifications();
      window.dispatchEvent(new Event("appointments:changed"));
    };

    const onNotification = (event: MessageEvent<string>) => {
      let incoming: { id: string; type: string; title: string; message: string; read: boolean; createdAt: string };
      try {
        incoming = JSON.parse(event.data);
      } catch {
        return;
      }

      if (previousIds.current.has(incoming.id)) return;
      previousIds.current.add(incoming.id);

      addNotification({
        id: incoming.id,
        title: incoming.title,
        message: incoming.message,
        type: toSeverity(incoming.type),
        read: incoming.read,
        resourceId: null,
        resourceType: null,
        createdAt: incoming.createdAt,
        readAt: null,
      });

      if (incoming.read || ownNotificationIds.has(incoming.id)) return;

      playNotificationSound();
      toast(incoming.title, { description: incoming.message, duration: 8000 });
    };

    const onAppointment = () => {
      window.dispatchEvent(new Event("appointments:changed"));
    };

    events.addEventListener("ready", onReady);
    events.addEventListener("notification", onNotification as EventListener);
    events.addEventListener("appointment", onAppointment);

    return () => {
      events.close();
    };
  }, [
    refreshNotifications,
  ]);

  /*
   DESBLOQUEAR O SOM no primeiro clique ou tecla (regra dos navegadores).
  */

  useEffect(() => {
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  /*
   RESERVA

   Se a ligação em tempo real não estiver disponível (proxy que a corta, rede instável),
   as notificações continuam a ser consultadas de 30 em 30 segundos.
  */

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          void refreshNotifications();
        },
        30000,
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