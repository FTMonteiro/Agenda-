"use client";

import Link from "next/link";
import { CalendarDays, Hourglass, UsersRound, WalletCards, type LucideIcon } from "lucide-react";
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
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-secondary)]">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: `${received * 100}%` }}
              />
            </div>
            <p className="text-xs text-[var(--muted)]">
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

  const iconTone =
    tone === "warning"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : "bg-primary/10 text-primary";

  return (
    <Link
      href={href}
      style={{ animationDelay: `${80 + index * 70}ms` }}
      className={`finance-fade-up group relative flex flex-col rounded-xl border bg-[var(--surface)] p-5 shadow-sm transition-colors hover:border-[var(--border-strong)] ${
        highlight ? "border-primary/30" : "border-[var(--border)]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--muted)]">{title}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconTone}`}>
          <Icon size={18} />
        </div>
      </div>

      {loading ? (
        <div className="mt-3 h-8 w-28 animate-pulse rounded-lg bg-[var(--surface-secondary)]" />
      ) : (
        <p className="mt-2 truncate text-[26px] font-semibold leading-tight tracking-tight tabular-nums text-[var(--foreground)]">
          {shown}
        </p>
      )}

      <div className="mt-auto pt-3">{loading ? <div className="h-3 w-32 animate-pulse rounded bg-current opacity-10" /> : footer}</div>
    </Link>
  );
}
