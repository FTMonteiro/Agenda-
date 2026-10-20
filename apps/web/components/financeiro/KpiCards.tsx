"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  Minus,
  ReceiptText,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { formatCurrency, percentChange } from "./finance-utils";

// Anima o número do valor anterior até ao novo; sem animação se o sistema pedir movimento reduzido.
function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = target;

    if (from === target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function Trend({ change, label, inverted }: { change: number | null; label: string; inverted?: boolean }) {
  const text = inverted ? "text-white/80" : "text-[var(--muted)]";

  if (change === null) {
    return <span className={`text-xs ${text}`}>Sem receita no {label}</span>;
  }

  const rounded = Math.round(change * 10) / 10;
  const direction = rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  const tone = inverted
    ? "bg-white/15 text-white"
    : direction === "up"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : direction === "down"
        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
        : "bg-[var(--surface-secondary)] text-[var(--muted)]";

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${text}`}>
      <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold ${tone}`}>
        <Icon size={12} strokeWidth={2.5} />
        {Math.abs(rounded).toLocaleString("pt-AO")}%
      </span>
      vs. {label}
    </span>
  );
}

type CardProps = {
  title: string;
  value: number;
  format: (value: number) => string;
  icon: LucideIcon;
  // Variação face ao mês anterior (null = sem base) ou, em alternativa, uma nota.
  change?: number | null;
  note?: string;
  loading: boolean;
  highlight?: boolean;
};

function KpiCard({ title, value, format, icon: Icon, change, note, loading, highlight }: CardProps) {
  const animated = useCountUp(loading ? 0 : value);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md ${
        highlight
          ? "border-transparent bg-gradient-to-br from-[#009685] to-[#00695e] text-white"
          : "border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      {highlight && (
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
      )}

      <div className="relative flex items-start justify-between gap-3">
        <p className={`text-sm font-medium ${highlight ? "text-white/80" : "text-[var(--muted)]"}`}>{title}</p>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105 ${
            highlight ? "bg-white/15 text-white" : "bg-primary/10 text-primary"
          }`}
        >
          <Icon size={18} />
        </div>
      </div>

      {loading ? (
        <div className={`relative mt-3 h-8 w-36 animate-pulse rounded-lg ${highlight ? "bg-white/20" : "bg-[var(--surface-secondary)]"}`} />
      ) : (
        <p
          className={`relative mt-2 text-[26px] font-semibold leading-tight tracking-tight tabular-nums ${
            highlight ? "text-white" : "text-[var(--foreground)]"
          }`}
        >
          {format(Math.round(animated))}
        </p>
      )}

      <div className="relative mt-3 min-h-5">
        {loading ? null : note !== undefined ? (
          <span className={`text-xs ${highlight ? "text-white/80" : "text-[var(--muted)]"}`}>{note}</span>
        ) : (
          <Trend change={change ?? null} label="mês anterior" inverted={highlight} />
        )}
      </div>
    </div>
  );
}

type Props = {
  loading: boolean;
  monthlyRevenue: number;
  previousRevenue: number | null;
  paymentsCount: number;
  previousCount: number | null;
  todayRevenue: number;
  todayPayments: number;
};

export function KpiCards({
  loading,
  monthlyRevenue,
  previousRevenue,
  paymentsCount,
  previousCount,
  todayRevenue,
  todayPayments,
}: Props) {
  const average = paymentsCount > 0 ? monthlyRevenue / paymentsCount : 0;
  const previousAverage = previousRevenue !== null && previousCount ? previousRevenue / previousCount : 0;
  const currency = (value: number) => formatCurrency(value);

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        highlight
        title="Receita do mês"
        value={monthlyRevenue}
        format={currency}
        icon={TrendingUp}
        loading={loading}
        change={previousRevenue === null ? null : percentChange(monthlyRevenue, previousRevenue)}
      />

      <KpiCard
        title="Pagamentos recebidos"
        value={paymentsCount}
        format={(value) => value.toLocaleString("pt-AO")}
        icon={ReceiptText}
        loading={loading}
        change={previousCount === null ? null : percentChange(paymentsCount, previousCount)}
      />

      <KpiCard
        title="Ticket médio"
        value={average}
        format={currency}
        icon={Wallet}
        loading={loading}
        change={previousRevenue === null ? null : percentChange(average, previousAverage)}
      />

      <KpiCard
        title="Receita hoje"
        value={todayRevenue}
        format={currency}
        icon={Clock3}
        loading={loading}
        note={todayPayments === 1 ? "1 pagamento recebido hoje" : `${todayPayments} pagamentos recebidos hoje`}
      />
    </section>
  );
}
