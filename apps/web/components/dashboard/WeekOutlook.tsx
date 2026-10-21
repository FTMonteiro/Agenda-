"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import type { upcomingDays } from "./home-utils";
import { formatPrice } from "./home-utils";

type Day = ReturnType<typeof upcomingDays>[number];

type Props = {
  days: Day[];
  loading: boolean;
};

// Atendimentos marcados para hoje e os 6 dias seguintes. Uma série, uma cor; o dia em
// destaque (rato por cima, ou hoje) mostra os detalhes por baixo do gráfico.
export function WeekOutlook({ days, loading }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  const max = Math.max(1, ...days.map((day) => day.count));
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const expected = days.reduce((sum, day) => sum + day.expected, 0);
  const busiest = days.reduce((best, day, index) => (day.count > (days[best]?.count ?? 0) ? index : best), 0);
  const focus = hovered ?? 0;
  const focused = days[focus];

  return (
    <section
      style={{ animationDelay: "480ms" }}
      className="finance-fade-up rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Próximos 7 dias</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {loading ? "A carregar…" : `${total} atendimentos · ${formatPrice(expected)} previstos`}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <TrendingUp size={20} />
        </div>
      </div>

      {loading ? (
        <div className="mt-6 flex h-32 items-end gap-2">
          {[40, 70, 55, 85, 30, 60, 45].map((height, index) => (
            <div
              key={index}
              className="flex-1 animate-pulse rounded-t bg-[var(--surface-secondary)]"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      ) : (
        <>
          <div className="relative mt-6 h-32" onMouseLeave={() => setHovered(null)}>
            {/* Linha de base */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-[var(--border)]" />

            <div className="absolute inset-0 flex items-end gap-2">
              {days.map((day, index) => {
                const height = (day.count / max) * 85;
                const active = index === focus;
                const labelled = day.count > 0 && (index === busiest || index === 0);

                return (
                  <button
                    key={day.key}
                    type="button"
                    onMouseEnter={() => setHovered(index)}
                    onFocus={() => setHovered(index)}
                    onBlur={() => setHovered(null)}
                    aria-label={`${day.label} ${day.day}: ${day.count} atendimentos, ${formatPrice(day.expected)} previstos`}
                    className="group relative flex h-full flex-1 flex-col items-center justify-end outline-none"
                  >
                    {labelled && (
                      <span className="mb-1 text-[11px] font-semibold tabular-nums text-[var(--muted)]">{day.count}</span>
                    )}
                    <span
                      className={`finance-grow w-full max-w-[28px] rounded-t-[4px] transition-opacity duration-200 ${
                        active ? "opacity-100" : "opacity-45 group-hover:opacity-80"
                      }`}
                      style={{
                        height: day.count ? `${Math.max(height, 4)}%` : "2px",
                        background: day.count ? "var(--chart-bar)" : "var(--border)",
                        animationDelay: `${520 + index * 50}ms`,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-2 flex gap-2">
            {days.map((day, index) => (
              <div key={day.key} className="flex-1 text-center">
                <p
                  className={`text-[11px] font-semibold capitalize ${
                    index === focus ? "text-[var(--foreground)]" : "text-[var(--muted)]"
                  }`}
                >
                  {day.label}
                </p>
                <p className="text-[11px] tabular-nums text-[var(--muted)]">{day.day}</p>
              </div>
            ))}
          </div>

          {focused && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--surface-secondary)]/60 px-3.5 py-3 text-xs">
              <span className="font-semibold capitalize text-[var(--foreground)]">
                {focused.label === "Hoje" ? "Hoje" : `${focused.label}, ${focused.day}`}
              </span>
              <span className="text-[var(--muted)]">
                <span className="font-semibold tabular-nums text-[var(--foreground)]">{focused.count}</span>{" "}
                {focused.count === 1 ? "atendimento" : "atendimentos"} ·{" "}
                <span className="font-semibold tabular-nums text-[var(--foreground)]">{formatPrice(focused.expected)}</span>
              </span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
