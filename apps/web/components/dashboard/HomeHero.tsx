"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarCheck2, CalendarPlus, Clock3, Coffee, UserRound } from "lucide-react";
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
    <section className="finance-fade-up relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      {/* Fundo: brilho da marca e grelha discreta */}
      <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl nevrx-glow" />
      <div className="pointer-events-none absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]"
        style={{
          backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center lg:p-9">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-3 py-1 text-xs font-medium text-[var(--muted)] backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            {loading ? "A carregar…" : <span className="capitalize">{formatLongDate(now)}</span>}
            {!loading && (
              <>
                <span className="opacity-40">•</span>
                <span className="tabular-nums">{timeKey(now)}</span>
              </>
            )}
          </div>

          {loading ? (
            <div className="mt-5 space-y-3">
              <div className="h-9 w-72 max-w-full animate-pulse rounded-xl bg-[var(--surface-secondary)]" />
              <div className="h-4 w-96 max-w-full animate-pulse rounded-lg bg-[var(--surface-secondary)]" />
            </div>
          ) : (
            <>
              <h1 className="mt-5 text-[28px] font-bold leading-tight tracking-[-0.03em] text-[var(--foreground)] sm:text-4xl">
                {greeting(now)}
                {name && (
                  <>
                    , <span className="text-primary">{name}</span>
                  </>
                )}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)] sm:text-[15px]">
                {summaryText(todayCount, pendingCount)}
              </p>
            </>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/appointments"
              className="brand-sheen group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_var(--brand)] transition duration-200 hover:-translate-y-0.5 hover:bg-primary-hover active:translate-y-0"
            >
              <CalendarPlus className="h-4 w-4" />
              Novo agendamento
              <ArrowUpRight className="h-4 w-4 opacity-70 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
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
    return <div className="h-[184px] animate-pulse rounded-2xl bg-[var(--surface-secondary)]" />;
  }

  if (!next) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/70 p-6 backdrop-blur">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-[var(--muted)]">
          <Coffee className="h-5 w-5" />
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
      className="group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-deep p-6 text-white shadow-[0_20px_40px_-20px_var(--brand)] transition duration-300 hover:-translate-y-0.5"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent nevrx-light-line" />

      <div className="relative flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
          </span>
          Próximo atendimento
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
            soon ? "bg-mint text-blue-950" : "bg-white/15 text-white"
          }`}
        >
          <Clock3 className="h-3.5 w-3.5" />
          {formatCountdown(minutes)}
        </span>
      </div>

      <div className="relative mt-5 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-base font-bold ring-1 ring-white/20">
          {initials(next.client)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold leading-tight">{next.client || "Cliente"}</p>
          <p className="mt-0.5 truncate text-sm text-white/75">{next.service}</p>
        </div>
      </div>

      <div className="relative mt-5 flex items-center justify-between border-t border-white/15 pt-4 text-sm">
        <span className="inline-flex items-center gap-1.5 text-white/80">
          <CalendarCheck2 className="h-4 w-4" />
          <span className="font-semibold tabular-nums text-white">{next.time}</span>
        </span>
        {next.professional && (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-white/80">
            <UserRound className="h-4 w-4 shrink-0" />
            <span className="truncate">{next.professional}</span>
          </span>
        )}
      </div>
    </Link>
  );
}
