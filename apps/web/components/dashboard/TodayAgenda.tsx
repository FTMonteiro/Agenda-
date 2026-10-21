"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarDays, CalendarPlus, Check, CheckCircle2, ChevronRight, Loader2, RefreshCw, XCircle } from "lucide-react";
import type { Appointment } from "@/types/appointment";
import { formatPrice, initials, isOpen, statusMeta, timeKey } from "./home-utils";

type Filter = "all" | "pending" | "confirmed" | "completed";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Aguardando" },
  { key: "confirmed", label: "Confirmados" },
  { key: "completed", label: "Concluídos" },
];

// Daqui só se confirma. Concluir não existe como ação: um agendamento fica concluído
// sozinho quando o pagamento é registado (na Agenda, "Receber pagamento").
type QuickStatus = "confirmed";

const QUICK_TEXT: Record<QuickStatus, { label: string; done: string; error: string }> = {
  confirmed: { label: "Confirmar", done: "Agendamento confirmado.", error: "Não foi possível confirmar o agendamento." },
};

type Props = {
  appointments: Appointment[];
  now: Date;
  loading: boolean;
  error: string;
  onRetry: () => void;
};

export function TodayAgenda({ appointments, now, loading, error, onRetry }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [changing, setChanging] = useState<string | null>(null);

  const counts: Record<Filter, number> = {
    all: appointments.length,
    pending: appointments.filter((item) => item.status === "pending").length,
    confirmed: appointments.filter((item) => item.status === "confirmed").length,
    completed: appointments.filter((item) => item.status === "completed").length,
  };

  const visible = filter === "all" ? appointments : appointments.filter((item) => item.status === filter);
  const nowTime = timeKey(now);
  // A linha "Agora" entra antes do primeiro atendimento que ainda não começou (ou no fim, se todos já começaram).
  const upcomingIndex = visible.findIndex((item) => item.time > nowTime);
  const nowIndex = upcomingIndex === -1 ? visible.length : upcomingIndex;

  async function changeStatus(appointment: Appointment, status: QuickStatus) {
    const text = QUICK_TEXT[status];
    setChanging(appointment.id);

    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: appointment.date, time: appointment.time, status }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? text.error);

      toast.success(text.done, { description: `${appointment.client} — ${appointment.time}` });
      window.dispatchEvent(new Event("appointments:changed"));
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : text.error);
    } finally {
      setChanging(null);
    }
  }

  return (
    <section
      style={{ animationDelay: "320ms" }}
      className="finance-fade-up flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"
    >
      <header className="flex flex-col gap-4 border-b border-[var(--border)] px-5 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="h-[22px] w-[22px]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Agenda de hoje</h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">Linha do tempo dos atendimentos</p>
            </div>
          </div>

          <Link
            href="/appointments"
            className="group inline-flex shrink-0 items-center gap-1 rounded-xl border border-[var(--border)] px-3.5 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-primary/40 hover:text-primary"
          >
            Ver agenda
            <ChevronRight className="h-[18px] w-[18px] transition" />
          </Link>
        </div>

        <div className="finance-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="tablist" aria-label="Filtrar por estado">
          {FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(item.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                    : "text-[var(--muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"
                }`}
              >
                {item.label}
                <span
                  className={`rounded-md px-1.5 text-[11px] tabular-nums ${
                    active ? "bg-[var(--background)]/20" : "bg-[var(--surface-secondary)]"
                  }`}
                >
                  {loading ? "–" : counts[item.key]}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {loading ? (
        <AgendaSkeleton />
      ) : error ? (
        <Placeholder
          icon={<XCircle className="h-6 w-6" />}
          tone="error"
          title="Não foi possível carregar os agendamentos."
          text={error}
          action={
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--foreground)] px-4 py-2.5 text-xs font-semibold text-[var(--background)] transition hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
          }
        />
      ) : visible.length === 0 ? (
        <Placeholder
          icon={<CalendarDays className="h-6 w-6" />}
          title={filter === "all" ? "Agenda livre" : "Nada nesta vista"}
          text={
            filter === "all"
              ? "Ainda não existem atendimentos programados para hoje."
              : "Não há atendimentos de hoje com este estado."
          }
          action={
            filter === "all" ? (
              <Link
                href="/appointments"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-primary-hover"
              >
                <CalendarPlus className="h-4 w-4" />
                Criar agendamento
              </Link>
            ) : null
          }
        />
      ) : (
        <ol className="finance-scroll relative max-h-[560px] overflow-y-auto px-3 py-3 sm:px-4">
          {visible.map((appointment, index) => (
            <Fragment key={appointment.id}>
              {index === nowIndex && index > 0 && <NowLine time={nowTime} />}
              <AgendaItem
                appointment={appointment}
                now={now}
                last={index === visible.length - 1}
                busy={changing === appointment.id}
                onChangeStatus={(status) => void changeStatus(appointment, status)}
              />
            </Fragment>
          ))}
          {nowIndex === visible.length && <NowLine time={nowTime} />}
        </ol>
      )}
    </section>
  );
}

function NowLine({ time }: { time: string }) {
  return (
    <li className="relative flex items-center gap-3 py-2 pl-[84px]" aria-label={`Agora, ${time}`}>
      <span className="absolute left-[67px] h-2.5 w-2.5 rounded-full bg-primary" />
      <span className="h-px flex-1 bg-primary/40" />
      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-[var(--brand-text)]">
        Agora · {time}
      </span>
    </li>
  );
}

function AgendaItem({
  appointment,
  now,
  last,
  busy,
  onChangeStatus,
}: {
  appointment: Appointment;
  now: Date;
  last: boolean;
  busy: boolean;
  onChangeStatus: (status: QuickStatus) => void;
}) {
  const meta = statusMeta(appointment.status);
  const StatusIcon = meta.icon;
  const done = !isOpen(appointment);
  const paid = appointment.payment === "paid";
  const action: QuickStatus | null = appointment.status === "pending" ? "confirmed" : null;

  return (
    <li className="group relative flex gap-3">
      {/* Hora + eixo da linha do tempo */}
      <div className="w-[52px] shrink-0 pt-4 text-right">
        <span className={`text-sm font-semibold tabular-nums ${done ? "text-[var(--muted)]" : "text-[var(--foreground)]"}`}>
          {appointment.time}
        </span>
      </div>

      <div className="relative flex w-4 shrink-0 justify-center">
        <span className={`absolute top-0 w-px bg-[var(--border)] ${last ? "h-6" : "bottom-0"}`} />
        <span className={`relative mt-[22px] h-2.5 w-2.5 rounded-full ring-4 ring-[var(--surface)] ${meta.dot}`} />
      </div>

      <div
        className={`mb-2 flex min-w-0 flex-1 flex-col gap-3 rounded-xl border border-transparent px-3 py-3 transition duration-200 group-hover:border-[var(--border)] group-hover:bg-[var(--surface-secondary)]/60 sm:flex-row sm:items-center ${
          done ? "opacity-70" : ""
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {initials(appointment.client)}
          </div>
          <div className="min-w-0">
            <p
              className={`truncate text-sm font-semibold text-[var(--foreground)] ${
                appointment.status === "cancelled" ? "line-through decoration-[var(--muted)]" : ""
              }`}
            >
              {appointment.client || "Cliente"}
            </p>
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
              {appointment.service}
              {appointment.professional && <> · {appointment.professional}</>}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pl-[52px] sm:justify-end sm:pl-0">
          {Number(appointment.price) > 0 && (
            <span className="text-xs font-semibold tabular-nums text-[var(--foreground)] sm:mr-1">
              {formatPrice(Number(appointment.price))}
            </span>
          )}

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.badge}`}>
              <StatusIcon className="h-4 w-4" />
              {meta.label}
            </span>

            {paid && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-500/25 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Pago
              </span>
            )}

            {action && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onChangeStatus(action)}
                title={`${QUICK_TEXT[action].label} o agendamento de ${appointment.client}`}
                className="inline-flex h-7 items-center gap-1 rounded-lg bg-primary px-2.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-primary-hover active:scale-95 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {QUICK_TEXT[action].label}
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function Placeholder({
  icon,
  title,
  text,
  action,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action: React.ReactNode;
  tone?: "error";
}) {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-12 text-center">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
          tone === "error" ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
        }`}
      >
        {icon}
      </div>
      <h3 className="mt-5 text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs leading-5 text-[var(--muted)]">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

function AgendaSkeleton() {
  return (
    <div className="space-y-2 px-4 py-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-2 py-3">
          <div className="h-4 w-11 animate-pulse rounded bg-[var(--surface-secondary)]" />
          <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--surface-secondary)]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 animate-pulse rounded bg-[var(--surface-secondary)]" />
            <div className="h-3 w-56 max-w-full animate-pulse rounded bg-[var(--surface-secondary)]" />
          </div>
          <div className="hidden h-6 w-24 animate-pulse rounded-full bg-[var(--surface-secondary)] sm:block" />
        </div>
      ))}
    </div>
  );
}
