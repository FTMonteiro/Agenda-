"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, ChevronRight, Download, ReceiptText, Search, X } from "lucide-react";
import {
  METHOD_META,
  formatCurrency,
  formatTime,
  methodMeta,
  sumAmounts,
  type FinancePayment,
  type PaymentMethod,
} from "./finance-utils";

type Sort = "recent" | "oldest" | "highest" | "lowest";

const SORT_LABELS: Record<Sort, string> = {
  recent: "Mais recentes",
  oldest: "Mais antigos",
  highest: "Maior valor",
  lowest: "Menor valor",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

function dayHeading(value: string | null) {
  if (!value) return "Sem data";
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Hoje";
  if (date.toDateString() === yesterday.toDateString()) return "Ontem";

  return new Intl.DateTimeFormat("pt-AO", { weekday: "long", day: "2-digit", month: "long" }).format(date);
}

type Props = {
  payments: FinancePayment[];
  loading: boolean;
  method: PaymentMethod | "ALL";
  onMethodChange: (method: PaymentMethod | "ALL") => void;
  activeAppointmentId: string | null;
  // Pagamento a mostrar ao entrar (recibo aberto a partir da agenda): a página desce até ele.
  focusAppointmentId?: string | null;
  onFocused?: () => void;
  onOpenReceipt: (payment: FinancePayment) => void;
  onExport: () => void;
};

export function TransactionsPanel({
  payments,
  loading,
  method,
  onMethodChange,
  activeAppointmentId,
  focusAppointmentId,
  onFocused,
  onOpenReceipt,
  onExport,
}: Props) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("recent");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    const list = payments.filter((payment) => {
      if (method !== "ALL" && payment.method !== method) return false;
      if (!query) return true;
      return [payment.client.name, payment.service.name, payment.professional.name]
        .some((field) => field?.toLowerCase().includes(query));
    });

    const time = (payment: FinancePayment) => (payment.paidAt ? new Date(payment.paidAt).getTime() : 0);

    return list.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return time(a) - time(b);
        case "highest":
          return b.amount - a.amount;
        case "lowest":
          return a.amount - b.amount;
        default:
          return time(b) - time(a);
      }
    });
  }, [payments, search, method, sort]);

  // Por data, os pagamentos são agrupados por dia; por valor, a lista é única.
  const groups = useMemo(() => {
    if (sort === "highest" || sort === "lowest") {
      return [{ key: "all", heading: null as string | null, items: filtered }];
    }

    const map = new Map<string, { key: string; heading: string | null; items: FinancePayment[] }>();
    for (const payment of filtered) {
      const key = payment.paidAt ? new Date(payment.paidAt).toDateString() : "none";
      const group = map.get(key) ?? { key, heading: dayHeading(payment.paidAt), items: [] };
      group.items.push(payment);
      map.set(key, group);
    }
    return [...map.values()];
  }, [filtered, sort]);

  // Desce até à linha do pagamento assim que a lista a tiver; se não estiver neste mês, fica pelo painel.
  useEffect(() => {
    if (!focusAppointmentId || loading) return;
    const row = document.querySelector(`[data-appointment-id="${CSS.escape(focusAppointmentId)}"]`);
    const target = row ?? document.getElementById("transacoes");
    target?.scrollIntoView({ behavior: "smooth", block: row ? "center" : "start" });
    onFocused?.();
  }, [focusAppointmentId, loading, groups, onFocused]);

  const filteredTotal = sumAmounts(filtered);
  const hasFilters = search.trim().length > 0 || method !== "ALL";

  return (
    <section id="transacoes" className="scroll-mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      {/* CABEÇALHO */}
      <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Transações</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {loading ? (
              "A carregar..."
            ) : (
              <>
                {filtered.length} {filtered.length === 1 ? "pagamento" : "pagamentos"} ·{" "}
                <span className="font-semibold text-[var(--foreground)]">{formatCurrency(filteredTotal)}</span>
                {hasFilters && " filtrados"}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-72">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cliente, serviço ou profissional"
              aria-label="Pesquisar transações"
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] pl-9 pr-9 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-primary focus:bg-[var(--surface)] focus:ring-2 focus:ring-primary/15"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Limpar pesquisa"
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <label className="relative flex-1 sm:flex-none">
              <span className="sr-only">Ordenar</span>
              <ArrowDownUp size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                className="h-10 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-4 text-sm font-medium text-[var(--foreground)] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {(Object.keys(SORT_LABELS) as Sort[]).map((value) => (
                  <option key={value} value={value}>
                    {SORT_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={onExport}
              disabled={loading || payments.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={17} />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTRO POR MÉTODO */}
      <div className="finance-scroll flex gap-2 overflow-x-auto border-b border-[var(--border)] px-5 py-3">
        {(["ALL", ...(Object.keys(METHOD_META) as PaymentMethod[])] as const).map((value) => {
          const active = method === value;
          const label = value === "ALL" ? "Todos" : METHOD_META[value].label;
          const count = value === "ALL" ? payments.length : payments.filter((payment) => payment.method === value).length;
          if (value === "OTHER" && count === 0) return null;

          return (
            <button
              key={value}
              type="button"
              onClick={() => onMethodChange(value)}
              aria-pressed={active}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "border-primary bg-primary text-white"
                  : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {value !== "ALL" && (
                <span className="h-2 w-2 rounded-full" style={{ background: active ? "currentColor" : METHOD_META[value].color }} />
              )}
              {label}
              <span className={`tabular-nums ${active ? "text-white/80" : "text-[var(--muted)]"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* LISTA */}
      <div className="finance-scroll max-h-[620px] overflow-y-auto">
        {loading ? (
          <ul className="divide-y divide-[var(--border)]">
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index} className="flex items-center gap-4 px-5 py-4">
                <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--surface-secondary)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 animate-pulse rounded bg-[var(--surface-secondary)]" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--surface-secondary)]" />
                </div>
                <div className="h-4 w-20 animate-pulse rounded bg-[var(--surface-secondary)]" />
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-secondary)] text-[var(--muted)]">
              <ReceiptText size={24} />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-[var(--foreground)]">
              {hasFilters ? "Nenhuma transação encontrada" : "Nenhuma receita neste mês"}
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
              {hasFilters
                ? "Ajuste a pesquisa ou o método de pagamento."
                : "Quando um pagamento for recebido, aparece aqui automaticamente com o seu recibo."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  onMethodChange("ALL");
                }}
                className="mt-4 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-secondary)]"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.key}>
              {group.heading && (
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-secondary)]/95 px-5 py-2">
                  <span className="text-xs font-semibold capitalize text-[var(--foreground)]">{group.heading}</span>
                  <span className="text-xs tabular-nums text-[var(--muted)]">
                    {group.items.length} · {formatCurrency(sumAmounts(group.items))}
                  </span>
                </div>
              )}

              <ul className="divide-y divide-[var(--border)]">
                {group.items.map((payment) => {
                  const meta = methodMeta(payment.method);
                  const MethodIcon = meta.icon;
                  const active = activeAppointmentId === payment.appointment.id;

                  return (
                    <li key={payment.id} data-appointment-id={payment.appointment.id}>
                      <button
                        type="button"
                        onClick={() => onOpenReceipt(payment)}
                        className={`group flex w-full items-center gap-4 px-5 py-3.5 text-left transition ${
                          active ? "bg-primary/[0.07]" : "hover:bg-[var(--surface-secondary)]"
                        }`}
                      >
                        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {payment.client.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={payment.client.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            initials(payment.client.name)
                          )}
                          <span
                            className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full ring-2 ring-[var(--surface)]"
                            style={{ background: meta.color }}
                            title={meta.label}
                          >
                            <MethodIcon size={10} className="text-white" />
                          </span>
                        </span>

                        <span className="grid min-w-0 flex-1 gap-0.5 md:grid-cols-[1.2fr_1fr_1fr] md:items-center md:gap-4">
                          <span className="truncate text-sm font-medium text-[var(--foreground)]">{payment.client.name}</span>
                          <span className="truncate text-xs text-[var(--muted)] md:text-sm md:text-[var(--foreground)]">
                            {payment.service.name}
                            <span className="md:hidden"> · {payment.professional.name}</span>
                          </span>
                          <span className="hidden truncate text-sm text-[var(--muted)] md:block">{payment.professional.name}</span>
                        </span>

                        <span className="hidden w-32 shrink-0 items-center gap-2 text-xs text-[var(--muted)] lg:flex">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
                          <span className="truncate">{meta.label}</span>
                        </span>

                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-semibold tabular-nums text-[var(--foreground)]">
                            {formatCurrency(payment.amount)}
                          </span>
                          <span className="block text-xs tabular-nums text-[var(--muted)]">{formatTime(payment.paidAt)}</span>
                        </span>

                        <ChevronRight
                          size={18}
                          className={`shrink-0 transition ${
                            active ? "text-primary" : "text-[var(--muted)] opacity-0 group-hover:opacity-100"
                          } max-md:opacity-100`}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
