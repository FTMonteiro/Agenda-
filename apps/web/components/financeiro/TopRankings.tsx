"use client";

import { useState } from "react";
import { Scissors, UserRound } from "lucide-react";
import { formatCurrency, type Ranking } from "./finance-utils";

type Tab = "services" | "professionals";

type Props = {
  services: Ranking[];
  professionals: Ranking[];
  loading: boolean;
};

export function TopRankings({ services, professionals, loading }: Props) {
  const [tab, setTab] = useState<Tab>("services");

  const items = tab === "services" ? services : professionals;
  const top = items[0]?.total ?? 0;
  const Icon = tab === "services" ? Scissors : UserRound;

  return (
    <section className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Mais rentáveis</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Quem e o quê gerou mais receita.</p>
        </div>

        <div className="inline-flex shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-1">
          {(
            [
              ["services", "Serviços"],
              ["professionals", "Equipa"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                tab === value
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex-1">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-2">
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-[var(--surface-secondary)]" />
                <div className="h-2 animate-pulse rounded-full bg-[var(--surface-secondary)]" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center text-center">
            <Icon size={20} className="text-[var(--muted)]" />
            <p className="mt-3 text-sm text-[var(--muted)]">Sem dados neste período.</p>
          </div>
        ) : (
          <ol key={tab} className="space-y-4">
            {items.map((item, index) => (
              <li key={item.name} className="finance-fade-up" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--surface-secondary)] text-[10px] font-bold text-[var(--muted)]">
                      {index + 1}
                    </span>
                    <span className="truncate text-sm font-medium text-[var(--foreground)]">{item.name}</span>
                  </span>

                  <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--foreground)]">
                    {formatCurrency(item.total)}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-secondary)]">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${top > 0 ? (item.total / top) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right text-[11px] text-[var(--muted)]">
                    {item.count}× {item.count === 1 ? "pago" : "pagos"}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
