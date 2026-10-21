"use client";

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
import { useCountUp } from "@/lib/use-count-up";
import { formatCurrency, percentChange } from "./finance-utils";

function Trend({ change, label }: { change: number | null; label: string }) {
  const text = "text-[var(--muted)]";

  if (change === null) {
    return <span className={`text-xs ${text}`}>Sem receita no {label}</span>;
  }

  const rounded = Math.round(change * 10) / 10;
  const direction = rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  const tone =
    direction === "up"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : direction === "down"
        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
        : "bg-[var(--surface-secondary)] text-[var(--muted)]";

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${text}`}>
      <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold ${tone}`}>
        <Icon size={13} strokeWidth={2.5} />
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
      className={`rounded-xl border bg-[var(--surface)] p-5 shadow-sm ${
        highlight ? "border-primary/30" : "border-[var(--border)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[var(--muted)]">{title}</p>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[var(--brand-text)]">
          <Icon size={18} />
        </div>
      </div>

      {loading ? (
        <div className="mt-3 h-8 w-36 animate-pulse rounded-lg bg-[var(--surface-secondary)]" />
      ) : (
        <p className="mt-2 text-[26px] font-semibold leading-tight tracking-tight tabular-nums text-[var(--foreground)]">
          {format(Math.round(animated))}
        </p>
      )}

      <div className="mt-3 min-h-5">
        {loading ? null : note !== undefined ? (
          <span className="text-xs text-[var(--muted)]">{note}</span>
        ) : (
          <Trend change={change ?? null} label="mês anterior" />
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
