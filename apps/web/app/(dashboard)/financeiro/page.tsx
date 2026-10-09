"use client";

import {
  CalendarDays,
  ChevronDown,
  Clock3,
  CreditCard,
  ReceiptText,
  RefreshCw,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "MOBILE_MONEY";

type Payment = {
  id: string;
  amount: number;
  method: PaymentMethod;
  status: "PAID";
  paidAt: string | null;
  createdAt: string;
  reference: string;

  client: {
    id: string;
    name: string;
  };

  service: {
    id: string;
    name: string;
  };

  professional: {
    id: string;
    name: string;
  };

  appointment: {
    id: string;
    date: string;
    status: string;
  };
};

type FinanceResponse = {
  success: boolean;

  period: {
    month: string;
    start: string;
    end: string;
  };

  summary: {
    todayRevenue: number;
    monthlyRevenue: number;
    paymentsReceived: number;
    todayPayments: number;
  };

  paymentMethods: {
    CASH: number;
    CARD: number;
    TRANSFER: number;
    MOBILE_MONEY: number;
  };

  payments: Payment[];
};

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    maximumFractionDigits: 0,
  }).format(value);
}

function getCurrentMonth() {
  const date = new Date();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function getAvailableMonths() {
  const months: string[] = [];
  const date = new Date();

  for (let index = 0; index < 12; index++) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    months.push(`${year}-${String(month).padStart(2, "0")}`);

    date.setMonth(date.getMonth() - 1);
  }

  return months;
}

function getMonthLabel(value: string) {
  const [year, month] = value.split("-");

  return `${MONTHS[Number(month) - 1]} ${year}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-AO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getPaymentMethodLabel(method: PaymentMethod) {
  switch (method) {
    case "CASH":
      return "Dinheiro";

    case "CARD":
      return "Cartão";

    case "TRANSFER":
      return "Transferência";

    case "MOBILE_MONEY":
      return "Multicaixa Express";

    default:
      return method;
  }
}

function getPaymentMethodIcon(method: PaymentMethod) {
  switch (method) {
    case "CARD":
      return CreditCard;

    case "TRANSFER":
      return WalletCards;

    case "MOBILE_MONEY":
      return WalletCards;

    case "CASH":
    default:
      return ReceiptText;
  }
}

export default function FinanceiroPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const [data, setData] = useState<FinanceResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const availableMonths = useMemo(() => getAvailableMonths(), []);

  /*
   CARREGAR FINANCEIRO
  */

  const loadFinance = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const response = await fetch(`/api/financeiro?month=${selectedMonth}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const contentType = response.headers.get("content-type");

        if (!contentType?.includes("application/json")) {
          throw new Error("A API financeira não devolveu uma resposta válida.");
        }

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result?.error || "Não foi possível carregar o financeiro.",
          );
        }

        setData(result);
      } catch (err) {
        console.error("Erro ao carregar financeiro:", err);

        setData(null);

        setError(
          err instanceof Error
            ? err.message
            : "Erro ao carregar os dados financeiros.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedMonth],
  );

  /*
  CARREGAR AO ENTRAR / ALTERAR MÊS
  */

  useEffect(() => {
    loadFinance();
  }, [loadFinance]);

  /* DADOS*/

  const payments = data?.payments ?? [];

  const monthlyRevenue = data?.summary.monthlyRevenue ?? 0;

  const todayRevenue = data?.summary.todayRevenue ?? 0;

  const paymentsReceived = data?.summary.paymentsReceived ?? 0;

  const todayPayments = data?.summary.todayPayments ?? 0;

  const selectedMonthLabel = getMonthLabel(selectedMonth);

  /* MÉTODOS DE PAGAMENTO
  
  */

  const paymentMethods = data?.paymentMethods ?? {
    CASH: 0,
    CARD: 0,
    TRANSFER: 0,
    MOBILE_MONEY: 0,
  };

  /*RENDER*/

  return (
    <main className="space-y-8 p-6 md:p-8">
      {/* CABEÇALHO*/}

      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          

          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] md:text-3xl">
            Receitas
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
            Acompanhe o dinheiro recebido pelo seu espaço e consulte o
            faturamento por período.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* ATUALIZAR */}

          <button
            type="button"
            onClick={() => loadFinance(true)}
            disabled={loading || refreshing}
            aria-label="Atualizar financeiro"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
          </button>

          {/* SELETOR */}

          <div className="relative w-[200px]">
            <CalendarDays
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />

            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-10 pr-10 text-sm font-medium text-[var(--foreground)] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              aria-label="Selecionar mês"
            >
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {getMonthLabel(month)}
                </option>
              ))}
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />
          </div>
        </div>
      </header>

      {/*ERRO */}

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => loadFinance(true)}
            className="font-semibold underline underline-offset-2"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/*RESUMO */}

      <section className="grid gap-4 md:grid-cols-3">
        {/* HOJE */}

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--muted)]">
                Receita hoje
              </p>

              <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                {loading ? "..." : formatCurrency(todayRevenue)}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Clock3 size={19} />
            </div>
          </div>

          <p className="mt-3 text-xs text-[var(--muted)]">
            {todayPayments}{" "}
            {todayPayments === 1
              ? "pagamento recebido"
              : "pagamentos recebidos"}{" "}
            hoje
          </p>
        </div>

        {/* MÊS */}

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--muted)]">
                Receita do mês
              </p>

              <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                {loading ? "..." : formatCurrency(monthlyRevenue)}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp size={19} />
            </div>
          </div>

          <p className="mt-3 text-xs capitalize text-[var(--muted)]">
            {selectedMonthLabel}
          </p>
        </div>

        {/* PAGAMENTOS */}

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--muted)]">
                Pagamentos recebidos
              </p>

              <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                {loading ? "..." : paymentsReceived}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ReceiptText size={19} />
            </div>
          </div>

          <p className="mt-3 text-xs text-[var(--muted)]">
            No período selecionado
          </p>
        </div>
      </section>

      {/*MÉTODOS DE PAGAMENTO */}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Métodos de pagamento
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Distribuição das receitas recebidas em {selectedMonthLabel}.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.entries(paymentMethods) as [PaymentMethod, number][]).map(
            ([method, amount]) => {
              const Icon = getPaymentMethodIcon(method);

              return (
                <div
                  key={method}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface)] text-primary">
                      <Icon size={17} />
                    </div>

                    <span className="text-xs font-medium text-[var(--muted)]">
                      {getPaymentMethodLabel(method)}
                    </span>
                  </div>

                  <p className="mt-4 text-base font-semibold text-[var(--foreground)]">
                    {formatCurrency(amount)}
                  </p>
                </div>
              );
            },
          )}
        </div>
      </section>

      {/*RECEITAS*/}

      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="flex flex-col gap-2 border-b border-[var(--border)] px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Receitas recebidas
            </h2>

            <p className="mt-1 text-sm capitalize text-[var(--muted)]">
              {selectedMonthLabel}
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <WalletCards size={17} />

            {loading ? "..." : formatCurrency(monthlyRevenue)}
          </div>
        </div>

        {/* LOADING */}

        {loading ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
            <RefreshCw size={24} className="animate-spin text-primary" />

            <p className="mt-4 text-sm font-medium text-[var(--foreground)]">
              Carregando receitas...
            </p>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Estamos a consultar os pagamentos do seu espaço.
            </p>
          </div>
        ) : payments.length === 0 ? (
          /*VAZIO*/

          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-secondary)] text-[var(--muted)]">
              <ReceiptText size={24} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-[var(--foreground)]">
              Nenhuma receita recebida
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              Quando um pagamento for recebido e marcado como pago, ele
              aparecerá automaticamente nesta área.
            </p>
          </div>
        ) : (
          /* TABELA*/

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead>
                <tr className="border-b border-[var(--border)] text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Cliente
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Serviço
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Profissional
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Pagamento
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Data
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Valor
                  </th>
                </tr>
              </thead>

              <tbody>
                {payments.map((payment) => {
                  const MethodIcon = getPaymentMethodIcon(payment.method);

                  return (
                    <tr
                      key={payment.id}
                      className="border-b border-[var(--border)] last:border-0 transition hover:bg-[var(--surface-secondary)]"
                    >
                      {/* CLIENTE */}

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {payment.client.name}
                        </p>
                      </td>

                      {/* SERVIÇO */}

                      <td className="px-5 py-4">
                        <p className="text-sm text-[var(--foreground)]">
                          {payment.service.name}
                        </p>
                      </td>

                      {/* PROFISSIONAL */}

                      <td className="px-5 py-4">
                        <p className="text-sm text-[var(--muted)]">
                          {payment.professional.name}
                        </p>
                      </td>

                      {/* MÉTODO */}

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <MethodIcon size={15} />
                          </div>

                          <span className="text-sm text-[var(--muted)]">
                            {getPaymentMethodLabel(payment.method)}
                          </span>
                        </div>
                      </td>

                      {/* DATA */}

                      <td className="px-5 py-4 text-sm text-[var(--muted)]">
                        {formatDate(payment.paidAt)}
                      </td>

                      {/* VALOR */}

                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-semibold text-[var(--foreground)]">
                          {formatCurrency(payment.amount)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
