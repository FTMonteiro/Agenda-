"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { MONTHS, formatCompactCurrency, formatCurrency, monthKey, type dailySeries } from "./finance-utils";

type Day = ReturnType<typeof dailySeries>[number];
type Measure = "total" | "count";

// Um máximo "redondo" para o eixo, para as linhas de grelha caírem em valores legíveis.
function niceMax(value: number) {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= value) ?? 10;
  return step * magnitude;
}

type Props = {
  days: Day[];
  month: string;
  loading: boolean;
};

export function RevenueChart({ days, month, loading }: Props) {
  const [measure, setMeasure] = useState<Measure>("total");
  const [hovered, setHovered] = useState<number | null>(null);

  const [year, monthNumber] = month.split("-").map(Number);
  const today = new Date();
  const todayIndex = monthKey(today) === month ? today.getDate() - 1 : -1;

  const { max, average, best, activeDays } = useMemo(() => {
    const values = days.map((day) => day[measure]);
    const withValue = values.filter((value) => value > 0);
    const peak = Math.max(0, ...values);

    return {
      max: niceMax(peak),
      average: withValue.length ? withValue.reduce((a, b) => a + b, 0) / withValue.length : 0,
      best: peak > 0 ? values.indexOf(peak) : -1,
      activeDays: withValue.length,
    };
  }, [days, measure]);

  const format = (value: number) => (measure === "total" ? formatCurrency(value) : value.toLocaleString("pt-AO"));
  const formatAxis = (value: number) =>
    measure === "total" ? formatCompactCurrency(value) : Math.round(value).toLocaleString("pt-AO");

  const gridLines = [1, 0.75, 0.5, 0.25, 0];
  const isEmpty = !loading && days.every((day) => day.count === 0);
  const hoveredDay = hovered !== null ? days[hovered] : null;
  const shortMonth = MONTHS[monthNumber - 1]?.slice(0, 3).toLowerCase();

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Evolução diária</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {loading
              ? "A calcular..."
              : activeDays === 0
                ? "Ainda sem movimento neste mês."
                : `${activeDays} ${activeDays === 1 ? "dia" : "dias"} com receita · média de ${format(average)} por dia ativo`}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Medida do gráfico"
          className="inline-flex shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-1"
        >
          {(
            [
              ["total", "Receita"],
              ["count", "Pagamentos"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={measure === value}
              onClick={() => setMeasure(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                measure === value
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-6">
        {loading ? (
          <div className="flex h-[240px] items-end gap-[2px] pl-12">
            {Array.from({ length: 30 }, (_, index) => (
              <div
                key={index}
                className="flex-1 animate-pulse rounded-t bg-[var(--surface-secondary)]"
                style={{ height: `${20 + ((index * 37) % 70)}%` }}
              />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-center">
            <BarChart3 size={22} className="text-[var(--muted)]" />
            <p className="mt-3 text-sm font-medium text-[var(--foreground)]">Sem receitas para mostrar</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Os pagamentos recebidos aparecem aqui dia a dia.</p>
          </div>
        ) : (
          <div className="flex h-[240px]">
            {/* EIXO Y */}
            <div className="relative w-12 shrink-0">
              {gridLines.map((ratio) => (
                <span
                  key={ratio}
                  className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-[var(--muted)]"
                  style={{ top: `${(1 - ratio) * 100}%` }}
                >
                  {formatAxis(max * ratio)}
                </span>
              ))}
            </div>

            <div className="relative flex-1" onMouseLeave={() => setHovered(null)}>
              {/* GRELHA */}
              {gridLines.map((ratio) => (
                <div
                  key={ratio}
                  className={`pointer-events-none absolute inset-x-0 border-t ${
                    ratio === 0 ? "border-[var(--border)]" : "border-dashed border-[var(--border)]/60"
                  }`}
                  style={{ top: `${(1 - ratio) * 100}%` }}
                />
              ))}

              {/* MÉDIA */}
              {average > 0 && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-dotted border-[var(--muted)]/50"
                  style={{ top: `${(1 - average / max) * 100}%` }}
                >
                  <span className="absolute -top-5 right-0 rounded bg-[var(--surface)] px-1 text-[10px] font-medium text-[var(--muted)]">
                    Média
                  </span>
                </div>
              )}

              {/* BARRAS */}
              <div className="absolute inset-0 flex items-end gap-[2px]">
                {days.map((day, index) => {
                  const value = day[measure];
                  const height = (value / max) * 100;
                  const isHovered = hovered === index;
                  const dimmed = hovered !== null && !isHovered;

                  return (
                    <button
                      key={day.day}
                      type="button"
                      aria-label={`${day.day} de ${MONTHS[monthNumber - 1]}: ${format(value)}`}
                      onMouseEnter={() => setHovered(index)}
                      onFocus={() => setHovered(index)}
                      onBlur={() => setHovered(null)}
                      className="group relative flex h-full flex-1 items-end outline-none"
                    >
                      {/* Coluna inteira é a área de toque; a barra é só a marca. */}
                      <span
                        className={`absolute inset-x-0 bottom-0 top-0 rounded-md transition ${
                          isHovered ? "bg-[var(--surface-secondary)]" : ""
                        }`}
                      />
                      <span
                        className="finance-grow relative w-full rounded-t-[4px] transition-opacity duration-200"
                        style={{
                          height: value > 0 ? `max(${height}%, 3px)` : 0,
                          background: "var(--chart-bar)",
                          opacity: dimmed ? 0.35 : index === todayIndex || isHovered ? 1 : 0.85,
                          animationDelay: `${index * 12}ms`,
                        }}
                      />
                    </button>
                  );
                })}
              </div>

              {/* DICA */}
              {hoveredDay && hovered !== null && (
                <div
                  className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-lg"
                  style={{
                    left: `clamp(70px, ${((hovered + 0.5) / days.length) * 100}%, calc(100% - 70px))`,
                    bottom: `calc(${Math.min((hoveredDay[measure] / max) * 100, 70)}% + 12px)`,
                  }}
                >
                  <p className="whitespace-nowrap text-[11px] font-medium text-[var(--muted)]">
                    {new Intl.DateTimeFormat("pt-AO", { weekday: "short", day: "2-digit", month: "short" }).format(
                      new Date(year, monthNumber - 1, hoveredDay.day),
                    )}
                    {hovered === todayIndex && " · hoje"}
                  </p>
                  <p className="mt-0.5 whitespace-nowrap text-sm font-semibold tabular-nums text-[var(--foreground)]">
                    {formatCurrency(hoveredDay.total)}
                  </p>
                  <p className="whitespace-nowrap text-[11px] text-[var(--muted)]">
                    {hoveredDay.count} {hoveredDay.count === 1 ? "pagamento" : "pagamentos"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* EIXO X */}
        {!loading && !isEmpty && (
          <div className="ml-12 mt-2 flex gap-[2px]">
            {days.map((day, index) => {
              const show = day.day === 1 || day.day % 5 === 0 || index === todayIndex || index === best;
              return (
                <span
                  key={day.day}
                  className={`flex-1 text-center text-[10px] tabular-nums ${
                    index === todayIndex ? "font-semibold text-primary" : "text-[var(--muted)]"
                  } ${show ? "" : "invisible"} ${day.day % 5 === 0 || day.day === 1 ? "" : "max-sm:invisible"}`}
                >
                  {day.day}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {!loading && best >= 0 && (
        <p className="mt-4 text-xs text-[var(--muted)]">
          Melhor dia:{" "}
          <span className="font-semibold text-[var(--foreground)]">
            {days[best].day} {shortMonth}
          </span>{" "}
          · {format(days[best][measure])}
        </p>
      )}
    </section>
  );
}
