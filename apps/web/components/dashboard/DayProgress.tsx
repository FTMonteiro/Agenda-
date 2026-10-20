"use client";

import { Gauge } from "lucide-react";
import type { AppointmentStatus } from "@/types/appointment";
import { useCountUp } from "@/lib/use-count-up";
import { STATUS_META } from "./home-utils";

const ORDER: AppointmentStatus[] = ["completed", "confirmed", "pending", "no_show", "cancelled"];

type Props = {
  counts: Record<AppointmentStatus, number>;
  loading: boolean;
};

// Quanto do dia já foi feito: concluídos sobre os atendimentos que contam (sem os cancelados).
export function DayProgress({ counts, loading }: Props) {
  const total = ORDER.reduce((sum, status) => sum + counts[status], 0);
  const planned = total - counts.cancelled;
  const percent = planned > 0 ? Math.round((counts.completed / planned) * 100) : 0;
  const animated = useCountUp(loading ? 0 : percent);

  return (
    <section
      style={{ animationDelay: "400ms" }}
      className="finance-fade-up rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Progresso do dia</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">Atendimentos concluídos</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Gauge size={18} />
        </div>
      </div>

      {loading ? (
        <div className="mt-5 space-y-4">
          <div className="h-10 w-24 animate-pulse rounded-lg bg-[var(--surface-secondary)]" />
          <div className="h-2.5 animate-pulse rounded-full bg-[var(--surface-secondary)]" />
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight tabular-nums text-[var(--foreground)]">
              {Math.round(animated)}%
            </span>
            <span className="text-sm text-[var(--muted)]">
              {counts.completed} de {planned}
            </span>
          </div>

          {/* Barra segmentada por estado, com 2px de intervalo entre segmentos */}
          <div
            className="mt-4 flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-[var(--surface-secondary)]"
            role="img"
            aria-label={ORDER.map((status) => `${STATUS_META[status].label}: ${counts[status]}`).join(", ")}
          >
            {total > 0 &&
              ORDER.filter((status) => counts[status] > 0).map((status) => (
                <div
                  key={status}
                  title={`${STATUS_META[status].label}: ${counts[status]}`}
                  className={`h-full transition-[flex-grow] duration-700 ease-out first:rounded-l-full last:rounded-r-full ${STATUS_META[status].dot}`}
                  style={{ flexGrow: counts[status], flexBasis: 0 }}
                />
              ))}
          </div>

          <ul className="mt-5 grid grid-cols-2 gap-2">
            {ORDER.map((status) => {
              const meta = STATUS_META[status];
              const Icon = meta.icon;
              return (
                <li
                  key={status}
                  className="flex items-center justify-between gap-2 rounded-xl bg-[var(--surface-secondary)]/60 px-3 py-2.5 last:col-span-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-xs text-[var(--muted)]">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{meta.label}</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-[var(--foreground)]">{counts[status]}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
