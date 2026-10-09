
"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Bell,
  BellOff,
  CheckCheck,
  Info,
  CircleCheck,
  TriangleAlert,
  CircleX,
} from "lucide-react";

import {
  useNotifications,
  type AppNotification,
} from "./NotificationsProvider";

/*ÍCONES*/

const ICONS = {
  INFO: Info,
  SUCCESS: CircleCheck,
  WARNING: TriangleAlert,
  ERROR: CircleX,
} as const;

/*
 CORES
*/

const TONES = {
  INFO: "bg-blue-50 text-blue-700",
  SUCCESS: "bg-emerald-50 text-emerald-700",
  WARNING: "bg-amber-50 text-amber-700",
  ERROR: "bg-red-50 text-red-700",
} as const;

/* COMPONENTE*/

export function NotificationsBell() {
  const {
    notifications,
    unreadCount,
    markAllAsRead,
    clearAll,
  } = useNotifications();

  const [open, setOpen] =
    useState(false);

  const containerRef =
    useRef<HTMLDivElement>(null);

  /* FECHAR AO CLICAR FORA*/

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(
      event: MouseEvent,
    ) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open]);

  /* ABRIR / FECHAR*/

  function handleToggle() {
    const next = !open;

    setOpen(next);
  }

  /* MARCAR TODAS COMO LIDAS*/

  async function handleMarkAllAsRead() {
    if (unreadCount === 0) {
      return;
    }

    await markAllAsRead();
  }

  /* LIMPAR*/

  async function handleClearAll() {
    await clearAll();
  }

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      {/*BOTÃO DO SINO */}

      <button
        type="button"
        onClick={handleToggle}
        aria-label={
          unreadCount > 0
            ? `Notificações (${unreadCount} não lidas)`
            : "Notificações"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted)] transition-all duration-200 hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)] active:scale-95"
      >
        <Bell size={19} />

        {unreadCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white ring-2 ring-[var(--surface)]"
          >
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {/*  POPUP*/}

      {open && (
        <div
          role="dialog"
          aria-label="Notificações"
          className="absolute right-0 z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        >
          {/*HEADER*/}

          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Notificações
              </p>

              {unreadCount > 0 && (
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {unreadCount === 1
                    ? "1 não lida"
                    : `${unreadCount} não lidas`}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={
                    handleMarkAllAsRead
                  }
                  className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck
                    size={14}
                  />

                  <span>
                    Marcar lidas
                  </span>
                </button>
              )}

              {notifications.length >
                0 && (
                <button
                  type="button"
                  onClick={
                    handleClearAll
                  }
                  className="text-xs font-medium text-[var(--muted)] underline transition-colors hover:text-[var(--foreground)]"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/*ESTADO VAZIO */}

          {notifications.length ===
          0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-secondary)]">
                <BellOff
                  size={22}
                  className="text-[var(--muted)]"
                />
              </div>

              <p className="text-sm font-medium text-[var(--foreground)]">
                Nenhuma notificação
              </p>

              <p className="mt-1 max-w-[260px] text-xs leading-5 text-[var(--muted)]">
                Quando acontecer alguma
                atividade no sistema,
                a notificação aparecerá
                aqui.
              </p>
            </div>
          ) : (
            /* LISTA*/

            <ul className="max-h-[420px] divide-y divide-[var(--border)] overflow-y-auto">
              {notifications.map(
                (item) => (
                  <NotificationItem
                    key={item.id}
                    item={item}
                  />
                ),
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ITEM*/

function NotificationItem({
  item,
}: {
  item: AppNotification;
}) {
  const Icon =
    ICONS[item.type];

  const tone =
    TONES[item.type];

  return (
    <li
      className={`flex gap-3 px-4 py-3 transition-colors ${
        item.read
          ? "bg-[var(--surface)]"
          : "bg-[var(--surface-secondary)]/50"
      }`}
    >
      {/*ÍCONE */}

      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}
      >
        <Icon size={17} />
      </span>

      {/*CONTEÚDO*/}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm ${
              item.read
                ? "font-medium"
                : "font-semibold"
            } text-[var(--foreground)]`}
          >
            {item.title}
          </p>

          {!item.read && (
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600"
              aria-label="Não lida"
            />
          )}
        </div>

        <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">
          {item.message}
        </p>

        <p className="mt-1.5 text-[11px] text-[var(--muted)]">
          {formatRelative(
            item.createdAt,
          )}
        </p>
      </div>
    </li>
  );
}

/*
 DATA
*/

function formatRelative(
  isoDate: string,
) {
  const date =
    new Date(isoDate);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const seconds = Math.max(
    0,
    Math.round(
      (Date.now() -
        date.getTime()) /
        1000,
    ),
  );

  if (seconds < 60) {
    return "agora mesmo";
  }

  const minutes = Math.round(
    seconds / 60,
  );

  if (minutes < 60) {
    return `há ${minutes} min`;
  }

  const hours = Math.round(
    minutes / 60,
  );

  if (hours < 24) {
    return `há ${hours} h`;
  }

  const days = Math.round(
    hours / 24,
  );

  if (days < 7) {
    return `há ${days} ${
      days === 1
        ? "dia"
        : "dias"
    }`;
  }

  return date.toLocaleDateString(
    "pt-PT",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

