"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  Smartphone,
  User,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  ReceiptDrawer,
  type ReceiptPreview,
} from "@/components/financeiro/ReceiptDrawer";

// ============================================================
// TIPOS
// ============================================================

type PaymentMethod =
  | "CASH"
  | "CARD"
  | "TRANSFER"
  | "MOBILE_MONEY"
  | string;

type PaymentStatus =
  | "PAID"
  | "PENDING"
  | "FAILED"
  | "CANCELLED"
  | string;

interface Payment {
  id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string | null;
  paidAt: string | null;
  appointmentId: string;
  receiptUrl: string | null;

  appointment?: {
    id: string;
    date: string;
    time: string;
    client: string;
    service: string;
    professional: string;
  };
}

// ============================================================
// HELPERS
// ============================================================

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-AO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getMethodLabel(method: string) {
  switch (method) {
    case "CASH":
      return "Dinheiro";

    case "CARD":
      return "Cartão";

    case "TRANSFER":
      return "Transferência";

    case "MOBILE_MONEY":
      return "Mobile Money";

    default:
      return method || "—";
  }
}

function getMethodIcon(method: string) {
  switch (method) {
    case "CASH":
      return Banknote;

    case "CARD":
      return CreditCard;

    case "TRANSFER":
      return Wallet;

    case "MOBILE_MONEY":
      return Smartphone;

    default:
      return Wallet;
  }
}

// O recibo aberto fica no endereço, para sobreviver a um refresh e poder ser partilhado.
function setReceiptParam(appointmentId: string | null) {
  const url = new URL(window.location.href);
  if (appointmentId) url.searchParams.set("receipt", appointmentId);
  else url.searchParams.delete("receipt");
  window.history.replaceState(window.history.state, "", url);
}

// ============================================================
// PÁGINA
// ============================================================

export default function PagamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ receipt?: string | string[] }>;
}) {
  const requestedReceipt = use(searchParams).receipt;

  const [payments, setPayments] = useState<Payment[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");

  // Agendamento cujo recibo está aberto (também lido de ?receipt=, vindo da agenda).
  const [receiptId, setReceiptId] = useState<string | null>(
    typeof requestedReceipt === "string" ? requestedReceipt : null,
  );

  const [receiptPreview, setReceiptPreview] =
    useState<ReceiptPreview | null>(null);

  // ==========================================================
  // CARREGAR PAGAMENTOS
  // ==========================================================

  const loadPayments = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await fetch("/api/appointments/payments", {
          method: "GET",
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Não foi possível carregar os pagamentos.",
          );
        }

        setPayments(
          Array.isArray(data?.payments)
            ? data.payments
            : [],
        );
      } catch (error) {
        console.error(
          "Erro ao carregar pagamentos:",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os pagamentos.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // ==========================================================
  // INIT
  // ==========================================================

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // ==========================================================
  // FILTRAGEM
  // ==========================================================

  const filteredPayments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const reference =
        payment.reference?.toLowerCase() ?? "";

      const client =
        payment.appointment?.client?.toLowerCase() ?? "";

      const service =
        payment.appointment?.service?.toLowerCase() ?? "";

      const professional =
        payment.appointment?.professional?.toLowerCase() ?? "";

      const matchesSearch =
        normalizedSearch.length === 0 ||
        reference.includes(normalizedSearch) ||
        client.includes(normalizedSearch) ||
        service.includes(normalizedSearch) ||
        professional.includes(normalizedSearch);

      const matchesMethod =
        methodFilter === "ALL" ||
        payment.method === methodFilter;

      return matchesSearch && matchesMethod;
    });
  }, [payments, search, methodFilter]);

  // ==========================================================
  // ESTATÍSTICAS
  // ==========================================================

  const paidPayments = useMemo(() => {
    return payments.filter(
      (payment) =>
        String(payment.status).toUpperCase() === "PAID",
    );
  }, [payments]);

  const totalReceived = useMemo(() => {
    return paidPayments.reduce(
      (total, payment) =>
        total + Number(payment.amount || 0),
      0,
    );
  }, [paidPayments]);

  const totalTransactions = paidPayments.length;

  // ==========================================================
  // RECIBO
  // ==========================================================

  const openReceipt = (payment: Payment) => {
    const appointmentId =
      payment.appointmentId ||
      payment.appointment?.id;

    if (!appointmentId) {
      toast.error(
        "Este pagamento não possui um agendamento associado.",
      );
      return;
    }

    setReceiptPreview({
      clientName: payment.appointment?.client ?? "Cliente",
      serviceName: payment.appointment?.service ?? "Serviço",
      amount: Number(payment.amount || 0),
    });
    setReceiptId(appointmentId);
    setReceiptParam(appointmentId);
  };

  const closeReceipt = useCallback(() => {
    setReceiptId(null);
    setReceiptPreview(null);
    setReceiptParam(null);
  }, []);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-full space-y-6">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Pagamentos
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Consulte e acompanhe todos os pagamentos
            recebidos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadPayments(true)}
          disabled={refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing ? "animate-spin" : ""
            }`}
          />

          Atualizar
        </button>
      </div>

      {/* ======================================================
          CARDS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* TOTAL RECEBIDO */}

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">
                Total recebido
              </p>

              <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                {formatCurrency(totalReceived)}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* TRANSAÇÕES */}

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">
                Pagamentos registrados
              </p>

              <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                {totalTransactions}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          FILTROS
      ====================================================== */}

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          {/* PESQUISA */}

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Pesquisar cliente, serviço, profissional ou referência..."
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100"
            />
          </div>

          {/* MÉTODO */}

          <select
            value={methodFilter}
            onChange={(event) =>
              setMethodFilter(event.target.value)
            }
            className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-700 outline-none transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100"
          >
            <option value="ALL">
              Todos os métodos
            </option>

            <option value="CASH">
              Dinheiro
            </option>

            <option value="CARD">
              Cartão
            </option>

            <option value="TRANSFER">
              Transferência
            </option>

            <option value="MOBILE_MONEY">
              Mobile Money
            </option>
          </select>
        </div>
      </div>

      {/* ======================================================
          TABELA
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {/* TÍTULO */}

        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-semibold text-zinc-950">
            Histórico de pagamentos
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            {filteredPayments.length} pagamento
            {filteredPayments.length === 1
              ? ""
              : "s"}{" "}
            encontrado
            {filteredPayments.length === 1
              ? ""
              : "s"}
            .
          </p>
        </div>

        {/* LOADING */}

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando pagamentos...
            </div>
          </div>
        ) : filteredPayments.length === 0 ? (
          /* VAZIO */

          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
              <Wallet className="h-5 w-5 text-zinc-500" />
            </div>

            <h3 className="mt-4 font-medium text-zinc-900">
              Nenhum pagamento encontrado
            </h3>

            <p className="mt-1 max-w-md text-sm text-zinc-500">
              {search || methodFilter !== "ALL"
                ? "Tente alterar os filtros de pesquisa."
                : "Os pagamentos registrados aparecerão aqui."}
            </p>
          </div>
        ) : (
          /* TABELA */

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/70">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Cliente
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Serviço
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Data
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Método
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Valor
                  </th>

                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Estado
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Ação
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.map((payment) => {
                  const MethodIcon = getMethodIcon(
                    payment.method,
                  );

                  const isPaid =
                    String(payment.status).toUpperCase() ===
                    "PAID";

                  return (
                    <tr
                      key={payment.id}
                      className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50"
                    >
                      {/* CLIENTE */}

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                            <User className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-900">
                              {payment.appointment?.client ??
                                "Cliente"}
                            </p>

                            {payment.reference && (
                              <p className="mt-0.5 truncate text-xs text-zinc-400">
                                {payment.reference}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SERVIÇO */}

                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-zinc-800">
                            {payment.appointment?.service ??
                              "Serviço"}
                          </p>

                          <p className="mt-0.5 text-xs text-zinc-400">
                            {payment.appointment
                              ?.professional ??
                              "Profissional"}
                          </p>
                        </div>
                      </td>

                      {/* DATA */}

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-zinc-600">
                          <CalendarDays className="h-4 w-4 text-zinc-400" />

                          <div>
                            <p>
                              {formatDate(
                                payment.paidAt,
                              )}
                            </p>

                            <p className="text-xs text-zinc-400">
                              {payment.appointment?.time ??
                                "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* MÉTODO */}

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-zinc-600">
                          <MethodIcon className="h-4 w-4 text-zinc-400" />

                          {getMethodLabel(
                            payment.method,
                          )}
                        </div>
                      </td>

                      {/* VALOR */}

                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-semibold text-zinc-950">
                          {formatCurrency(
                            Number(
                              payment.amount || 0,
                            ),
                          )}
                        </span>
                      </td>

                      {/* ESTADO */}

                      <td className="px-5 py-4 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Pago
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                            {payment.status}
                          </span>
                        )}
                      </td>

                      {/* AÇÃO */}

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            openReceipt(payment)
                          }
                          disabled={!isPaid}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Eye className="h-4 w-4" />
                          Recibo
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReceiptDrawer
        appointmentId={receiptId}
        preview={receiptPreview}
        onClose={closeReceipt}
      />
    </div>
  );
}