"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarDays, Hourglass, UsersRound, WalletCards, type LucideIcon } from "lucide-react";
import { useCountUp } from "@/lib/use-count-up";
import { formatPrice } from "./home-utils";

type Props = {
  loading: boolean;
  revenueToday: number;
  paidToday: number;
  expectedToday: number;
  todayCount: number;
  completedToday: number;
  pendingUpcoming: number;
  clientCount: number;
  activeServices: number;
};

export function HomeKpis(props: Props) {
  const { loading } = props;
  const received = props.expectedToday > 0 ? Math.min(props.revenueToday / props.expectedToday, 1) : 0;
  const plural = (count: number, one: string, many: string) => (count === 1 ? one : `${count} ${many}`);

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi
        index={0}
        href="/financeiro"
        title="Receita de hoje"
        icon={WalletCards}
        value={props.revenueToday}
        format={formatPrice}
        loading={loading}
        highlight
        footer={
          <div className="space-y-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-mint transition-[width] duration-700 ease-out"
                style={{ width: `${received * 100}%` }}
              />
            </div>
            <p className="text-xs text-white/80">
              {plural(props.paidToday, "1 pagamento", "pagamentos")}
              {props.expectedToday > 0 && <> · previsto {formatPrice(props.expectedToday)}</>}
            </p>
          </div>
        }
      />

      <Kpi
        index={1}
        href="/appointments"
        title="Atendimentos hoje"
        icon={CalendarDays}
        value={props.todayCount}
        loading={loading}
        footer={
          <p className="text-xs text-[var(--muted)]">
            <span className="font-semibold text-[var(--foreground)]">{props.completedToday}</span> concluídos ·{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {Math.max(props.todayCount - props.completedToday, 0)}
            </span>{" "}
            por fazer
          </p>
        }
      />

      <Kpi
        index={2}
        href="/appointments"
        title="Aguardando confirmação"
        icon={Hourglass}
        value={props.pendingUpcoming}
        loading={loading}
        tone={props.pendingUpcoming > 0 ? "warning" : undefined}
        footer={
          <p className="text-xs text-[var(--muted)]">
            {props.pendingUpcoming > 0 ? "Hoje e nos próximos dias" : "Tudo confirmado"}
          </p>
        }
      />

      <Kpi
        index={3}
        href="/clientes"
        title="Clientes"
        icon={UsersRound}
        value={props.clientCount}
        loading={loading}
        footer={
          <p className="text-xs text-[var(--muted)]">
            {plural(props.activeServices, "1 serviço ativo", "serviços ativos")}
          </p>
        }
      />
    </section>
  );
}

type KpiProps = {
  index: number;
  href: string;
  title: string;
  icon: LucideIcon;
  value: number;
  format?: (value: number) => string;
  loading: boolean;
  footer: React.ReactNode;
  highlight?: boolean;
  tone?: "warning";
};

function Kpi({ index, href, title, icon: Icon, value, format, loading, footer, highlight, tone }: KpiProps) {
  const animated = useCountUp(loading ? 0 : value);
  const shown = format ? format(animated) : Math.round(animated).toLocaleString("pt-AO");

  const iconTone = highlight
    ? "bg-white/15 text-white"
    : tone === "warning"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : "bg-primary/10 text-primary";

  return (
    <Link
      href={href}
      style={{ animationDelay: `${80 + index * 70}ms` }}
      className={`finance-fade-up group relative flex flex-col overflow-hidden rounded-2xl border p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg ${
        highlight
          ? "border-transparent bg-gradient-to-br from-primary to-primary-deep text-white"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-primary/30"
      }`}
    >
      {highlight && <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />}
      {tone === "warning" && (
        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />
      )}

      <div className="relative flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition duration-300 group-hover:scale-110 ${iconTone}`}>
          <Icon size={19} />
        </div>
        <ArrowUpRight
          size={16}
          className={`opacity-0 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100 ${
            highlight ? "text-white/80" : "text-[var(--muted)]"
          }`}
        />
      </div>

      <p className={`relative mt-5 text-sm font-medium ${highlight ? "text-white/80" : "text-[var(--muted)]"}`}>{title}</p>

      {loading ? (
        <div className={`relative mt-2 h-8 w-28 animate-pulse rounded-lg ${highlight ? "bg-white/20" : "bg-[var(--surface-secondary)]"}`} />
      ) : (
        <p
          className={`relative mt-1 truncate text-[28px] font-semibold leading-tight tracking-tight tabular-nums ${
            highlight ? "text-white" : "text-[var(--foreground)]"
          }`}
        >
          {shown}
        </p>
      )}

      <div className="relative mt-auto pt-4">{loading ? <div className="h-3 w-32 animate-pulse rounded bg-current opacity-10" /> : footer}</div>
    </Link>
  );
}
