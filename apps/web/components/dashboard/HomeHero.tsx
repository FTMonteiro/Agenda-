"use client";

import Link from "next/link";
import { CalendarCheck2, CalendarPlus, Clock3, Coffee, UserRound } from "lucide-react";
import { ReceivePayment } from "@/components/appointments/ReceivePayment";
import type { Appointment } from "@/types/appointment";
import { firstName, formatCountdown, formatLongDate, greeting, initials, minutesUntil, timeKey } from "./home-utils";

type Props = {
  userName: string;
  now: Date;
  loading: boolean;
  todayCount: number;
  pendingCount: number;
  next: Appointment | null;
  onPaymentCreated: () => void;
};

function summaryText(todayCount: number, pendingCount: number) {
  if (!todayCount) return "Não há atendimentos marcados para hoje. Bom momento para organizar a semana.";
  const total = todayCount === 1 ? "1 atendimento" : `${todayCount} atendimentos`;
  if (!pendingCount) return `Tem ${total} hoje, todos confirmados.`;
  const pending = pendingCount === 1 ? "1 aguarda confirmação" : `${pendingCount} aguardam confirmação`;
  return `Tem ${total} hoje — ${pending}.`;
}

export function HomeHero({ userName, now, loading, todayCount, pendingCount, next, onPaymentCreated }: Props) {
  const name = firstName(userName);

  return (
    <section className="finance-fade-up rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center lg:p-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            {loading ? "A carregar…" : <span className="capitalize">{formatLongDate(now)}</span>}
            {!loading && (
              <>
                <span className="opacity-40">•</span>
                <span className="tabular-nums">{timeKey(now)}</span>
              </>
            )}
          </div>

          {loading ? (
            <div className="mt-3 space-y-3">
              <div className="h-9 w-72 max-w-full animate-pulse rounded-xl bg-[var(--surface-secondary)]" />
              <div className="h-4 w-96 max-w-full animate-pulse rounded-lg bg-[var(--surface-secondary)]" />
            </div>
          ) : (
            <>
              <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-[var(--foreground)] sm:text-[28px]">
                {greeting(now)}
                {name && `, ${name}`}
              </h1>
              <p className="mt-1.5 max-w-xl text-[15px] leading-6 text-[var(--muted)]">
                {summaryText(todayCount, pendingCount)}
              </p>
            </>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/appointments"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
            >
              <CalendarPlus className="h-[18px] w-[18px]" />
              Novo agendamento
            </Link>

            <ReceivePayment onPaymentCreated={onPaymentCreated} />
          </div>
        </div>

        <NextUp next={next} now={now} loading={loading} />
      </div>
    </section>
  );
}

function NextUp({ next, now, loading }: { next: Appointment | null; now: Date; loading: boolean }) {
  if (loading) {
    return <div className="h-[184px] animate-pulse rounded-xl bg-[var(--surface-secondary)]" />;
  }

  if (!next) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-[var(--border-strong)] p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-secondary)] text-[var(--muted)]">
          <Coffee className="h-[22px] w-[22px]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Sem mais atendimentos hoje</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Os próximos atendimentos do dia aparecem aqui, com a contagem decrescente.
          </p>
        </div>
      </div>
    );
  }

  const minutes = minutesUntil(next, now);
  const soon = minutes <= 15;

  return (
    <Link
      href="/appointments"
      className="group block rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-5 transition-colors hover:border-[var(--border-strong)]"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--muted)]">Próximo atendimento</span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${
            soon
              ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
              : "bg-[var(--surface)] text-[var(--muted)] ring-1 ring-[var(--border)]"
          }`}
        >
          <Clock3 className="h-4 w-4" />
          {formatCountdown(minutes)}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-[var(--brand-text)]">
          {initials(next.client)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold leading-tight text-[var(--foreground)]">{next.client || "Cliente"}</p>
          <p className="mt-0.5 truncate text-sm text-[var(--muted)]">{next.service}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-sm">
        <span className="inline-flex items-center gap-1.5 text-[var(--muted)]">
          <CalendarCheck2 className="h-[18px] w-[18px]" />
          <span className="font-semibold tabular-nums text-[var(--foreground)]">{next.time}</span>
        </span>
        {next.professional && (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[var(--muted)]">
            <UserRound className="h-[18px] w-[18px] shrink-0" />
            <span className="truncate">{next.professional}</span>
          </span>
        )}
      </div>
    </Link>
  );
}
