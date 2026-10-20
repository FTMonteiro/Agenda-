"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { KpiCards } from "@/components/financeiro/KpiCards";
import { MethodBreakdown } from "@/components/financeiro/MethodBreakdown";
import { ReceiptDrawer, type ReceiptPreview } from "@/components/financeiro/ReceiptDrawer";
import { RevenueChart } from "@/components/financeiro/RevenueChart";
import { TopRankings } from "@/components/financeiro/TopRankings";
import { TransactionsPanel } from "@/components/financeiro/TransactionsPanel";
import {
  METHOD_ORDER,
  availableMonths,
  dailySeries,
  downloadPaymentsCsv,
  monthKey,
  monthLabel,
  rankBy,
  shiftMonth,
  type FinancePayment,
  type FinanceResponse,
  type PaymentMethod,
} from "@/components/financeiro/finance-utils";

async function fetchFinance(month: string, signal?: AbortSignal): Promise<FinanceResponse> {
  const response = await fetch(`/api/financeiro?month=${month}`, {
    credentials: "include",
    cache: "no-store",
    signal,
  });

  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("A API financeira não devolveu uma resposta válida.");
  }

  const result = await response.json();
  if (!response.ok) throw new Error(result?.error || "Não foi possível carregar o financeiro.");

  return result;
}

// O recibo aberto fica no endereço (?receipt=<agendamento>): pode ser partilhado e sobrevive a um refresh.
function setReceiptParam(appointmentId: string | null) {
  const url = new URL(window.location.href);
  if (appointmentId) url.searchParams.set("receipt", appointmentId);
  else url.searchParams.delete("receipt");
  window.history.replaceState(window.history.state, "", url);
}

type Loaded = {
  key: string;
  month: string;
  data: FinanceResponse | null;
  previous: FinanceResponse | null;
  error: string | null;
};

export default function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ receipt?: string | string[] }>;
}) {
  // ?receipt=<agendamento> abre o recibo à entrada (vindo da agenda ou de um link partilhado).
  const requestedReceipt = use(searchParams).receipt;

  const currentMonth = monthKey(new Date());
  const months = useMemo(() => availableMonths(), []);

  const [month, setMonth] = useState(currentMonth);
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  const [method, setMethod] = useState<PaymentMethod | "ALL">("ALL");
  const [receiptId, setReceiptId] = useState<string | null>(
    typeof requestedReceipt === "string" ? requestedReceipt : null,
  );
  const [receiptPreview, setReceiptPreview] = useState<ReceiptPreview | null>(null);

  // O pedido atual ainda sem resposta: noutro mês mostra o esqueleto; no mesmo mês
  // (atualizar) os dados anteriores ficam visíveis enquanto o ícone gira.
  const requestKey = `${month}#${reloadKey}`;
  const pending = loaded?.key !== requestKey;
  const sameMonth = loaded?.month === month;
  const loading = pending && !sameMonth;
  const refreshing = pending && sameMonth;

  const data = sameMonth ? (loaded?.data ?? null) : null;
  const previous = sameMonth ? (loaded?.previous ?? null) : null;
  const error = !pending ? (loaded?.error ?? null) : null;

  useEffect(() => {
    const controller = new AbortController();

    // O mês anterior é só para comparar: se falhar, os cartões mostram "sem dados".
    Promise.all([
      fetchFinance(month, controller.signal),
      fetchFinance(shiftMonth(month, -1), controller.signal).catch(() => null),
    ])
      .then(([current, prior]) => {
        setLoaded({ key: requestKey, month, data: current, previous: prior, error: null });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error("Erro ao carregar financeiro:", err);
        setLoaded({
          key: requestKey,
          month,
          data: null,
          previous: null,
          error: err instanceof Error ? err.message : "Erro ao carregar os dados financeiros.",
        });
      });

    return () => controller.abort();
  }, [month, requestKey]);

  const changeMonth = (next: string) => {
    if (next > currentMonth) return;
    setMethod("ALL");
    setMonth(next);
  };

  const refresh = () => setReloadKey((key) => key + 1);

  const openReceipt = useCallback((payment: FinancePayment) => {
    setReceiptPreview({ clientName: payment.client.name, serviceName: payment.service.name, amount: payment.amount });
    setReceiptId(payment.appointment.id);
    setReceiptParam(payment.appointment.id);
  }, []);

  const closeReceipt = useCallback(() => {
    setReceiptId(null);
    setReceiptPreview(null);
    setReceiptParam(null);
  }, []);

  /* DADOS DERIVADOS */

  const payments = useMemo(() => data?.payments ?? [], [data]);
  const days = useMemo(() => dailySeries(payments, month), [payments, month]);
  const topServices = useMemo(() => rankBy(payments, (payment) => payment.service.name), [payments]);
  const topProfessionals = useMemo(() => rankBy(payments, (payment) => payment.professional.name), [payments]);

  const methodCounts = useMemo(() => {
    const counts: Partial<Record<PaymentMethod, number>> = {};
    for (const payment of payments) counts[payment.method] = (counts[payment.method] ?? 0) + 1;
    return counts;
  }, [payments]);

  const methodTotals = useMemo(() => {
    const totals: Partial<Record<PaymentMethod, number>> = {};
    for (const key of METHOD_ORDER) totals[key] = data?.paymentMethods[key] ?? 0;
    return totals;
  }, [data]);

  const isCurrentMonth = month === currentMonth;
  const busy = loading || refreshing;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      {/* CABEÇALHO */}
      <header className="finance-fade-up flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Finanças</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)] md:text-3xl">
            Visão financeira
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-[var(--muted)]">
            Receitas, métodos de pagamento e recibos de {monthLabel(month)}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <button
              type="button"
              onClick={() => changeMonth(shiftMonth(month, -1))}
              disabled={busy || month <= months[months.length - 1]}
              aria-label="Mês anterior"
              className="flex h-10 w-10 items-center justify-center rounded-l-xl text-[var(--muted)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)] disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <label className="relative border-x border-[var(--border)]">
              <span className="sr-only">Selecionar mês</span>
              <CalendarDays size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <select
                value={month}
                onChange={(event) => changeMonth(event.target.value)}
                className="h-10 w-[170px] appearance-none bg-transparent pl-9 pr-8 text-sm font-semibold text-[var(--foreground)] outline-none"
              >
                {months.map((value) => (
                  <option key={value} value={value}>
                    {monthLabel(value)}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            </label>

            <button
              type="button"
              onClick={() => changeMonth(shiftMonth(month, 1))}
              disabled={busy || isCurrentMonth}
              aria-label="Mês seguinte"
              className="flex h-10 w-10 items-center justify-center rounded-r-xl text-[var(--muted)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)] disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {!isCurrentMonth && (
            <button
              type="button"
              onClick={() => changeMonth(currentMonth)}
              className="hidden h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-secondary)] sm:block"
            >
              Mês atual
            </button>
          )}

          <button
            type="button"
            onClick={refresh}
            disabled={busy}
            aria-label="Atualizar"
            title="Atualizar"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] shadow-sm transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)] disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* ERRO */}
      {error && (
        <div className="finance-fade-up flex items-center justify-between gap-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          <span className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </span>
          <button type="button" onClick={refresh} className="shrink-0 font-semibold underline underline-offset-2">
            Tentar novamente
          </button>
        </div>
      )}

      <div className="finance-fade-up" style={{ animationDelay: "60ms" }}>
        <KpiCards
          loading={loading}
          monthlyRevenue={data?.summary.monthlyRevenue ?? 0}
          previousRevenue={previous ? previous.summary.monthlyRevenue : null}
          paymentsCount={data?.summary.paymentsReceived ?? 0}
          previousCount={previous ? previous.summary.paymentsReceived : null}
          todayRevenue={data?.summary.todayRevenue ?? 0}
          todayPayments={data?.summary.todayPayments ?? 0}
        />
      </div>

      <div className="finance-fade-up grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]" style={{ animationDelay: "120ms" }}>
        <RevenueChart days={days} month={month} loading={loading} />
        <MethodBreakdown
          totals={methodTotals}
          counts={methodCounts}
          loading={loading}
          selected={method}
          onSelect={setMethod}
        />
      </div>

      <div className="finance-fade-up grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]" style={{ animationDelay: "180ms" }}>
        <TransactionsPanel
          payments={payments}
          loading={loading}
          method={method}
          onMethodChange={setMethod}
          activeAppointmentId={receiptId}
          onOpenReceipt={openReceipt}
          onExport={() => downloadPaymentsCsv(payments, month)}
        />
        <TopRankings services={topServices} professionals={topProfessionals} loading={loading} />
      </div>

      <ReceiptDrawer appointmentId={receiptId} preview={receiptPreview} onClose={closeReceipt} />
    </div>
  );
}
