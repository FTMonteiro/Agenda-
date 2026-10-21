"use client";

import { Check } from "lucide-react";
import { METHOD_META, METHOD_ORDER, formatCurrency, type PaymentMethod } from "./finance-utils";

type Props = {
  totals: Partial<Record<PaymentMethod, number>>;
  counts: Partial<Record<PaymentMethod, number>>;
  loading: boolean;
  selected: PaymentMethod | "ALL";
  onSelect: (method: PaymentMethod | "ALL") => void;
};

export function MethodBreakdown({ totals, counts, loading, selected, onSelect }: Props) {
  const grandTotal = METHOD_ORDER.reduce((sum, method) => sum + (totals[method] ?? 0), 0);

  // "Outro" só aparece quando houver pagamentos com esse método.
  const methods = METHOD_ORDER.filter((method) => method !== "OTHER" || (totals.OTHER ?? 0) > 0);
  const share = (method: PaymentMethod) => (grandTotal > 0 ? ((totals[method] ?? 0) / grandTotal) * 100 : 0);

  return (
    <section className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Métodos de pagamento</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Clique num método para filtrar as transações.</p>
        </div>

        {selected !== "ALL" && (
          <button
            type="button"
            onClick={() => onSelect("ALL")}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
          >
            Limpar
          </button>
        )}
      </div>

      {/* BARRA EMPILHADA */}
      <div className="mt-5 flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-[var(--surface-secondary)]">
        {!loading &&
          methods.map((method) =>
            share(method) > 0 ? (
              <div
                key={method}
                className="h-full transition-all duration-700 first:rounded-l-full last:rounded-r-full"
                style={{
                  width: `${share(method)}%`,
                  background: METHOD_META[method].color,
                  opacity: selected === "ALL" || selected === method ? 1 : 0.3,
                }}
              />
            ) : null,
          )}
      </div>

      <ul className="mt-5 space-y-1">
        {methods.map((method) => {
          const meta = METHOD_META[method];
          const Icon = meta.icon;
          const active = selected === method;
          const count = counts[method] ?? 0;

          return (
            <li key={method}>
              <button
                type="button"
                onClick={() => onSelect(active ? "ALL" : method)}
                aria-pressed={active}
                disabled={loading}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  active ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-[var(--surface-secondary)]"
                }`}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `color-mix(in srgb, ${meta.color} 14%, transparent)`, color: meta.color }}
                >
                  {active ? <Check size={18} strokeWidth={2.5} /> : <Icon size={18} />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[var(--foreground)]">{meta.label}</span>
                  <span className="block text-xs text-[var(--muted)]">
                    {loading ? "—" : `${count} ${count === 1 ? "pagamento" : "pagamentos"}`}
                  </span>
                </span>

                <span className="text-right">
                  {loading ? (
                    <span className="block h-4 w-20 animate-pulse rounded bg-[var(--surface-secondary)]" />
                  ) : (
                    <>
                      <span className="block text-sm font-semibold tabular-nums text-[var(--foreground)]">
                        {formatCurrency(totals[method] ?? 0)}
                      </span>
                      <span className="block text-xs tabular-nums text-[var(--muted)]">
                        {share(method).toLocaleString("pt-AO", { maximumFractionDigits: 1 })}%
                      </span>
                    </>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
