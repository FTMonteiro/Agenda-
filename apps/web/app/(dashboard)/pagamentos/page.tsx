"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Smartphone,
  User,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

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

interface Receipt {
  title: string;
  type: string;

  payment: {
    id: string;
    reference: string | null;
    amount: number;
    method: string;
    status: string;
    paidAt: string;
    receivedById: string | null;
  };

  appointment: {
    id: string;
    date: string;
    status: string;
    notes: string | null;
  };

  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };

  professional: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    specialty: string | null;
  };

  service: {
    id: string;
    name: string;
    price: number;
    duration: number;
  };

  total: number;
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

function formatDateTime(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-AO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

// ============================================================
// PÁGINA
// ============================================================

export default function PagamentosPage() {
  const [payments, setPayments] = useState<Payment[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");

  const [selectedPayment, setSelectedPayment] =
    useState<Payment | null>(null);

  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const [loadingReceipt, setLoadingReceipt] = useState(false);

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
  // ABRIR RECIBO
  // ==========================================================

  const openReceipt = async (payment: Payment) => {
    try {
      setSelectedPayment(payment);
      setReceipt(null);
      setLoadingReceipt(true);

      const appointmentId =
        payment.appointmentId ||
        payment.appointment?.id;

      if (!appointmentId) {
        throw new Error(
          "Este pagamento não possui um agendamento associado.",
        );
      }

      const response = await fetch(
        `/api/appointments/payments/${appointmentId}/receipt`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível carregar o recibo.",
        );
      }

      if (!data?.receipt) {
        throw new Error(
          "O servidor não retornou os dados do recibo.",
        );
      }

      setReceipt(data.receipt);
    } catch (error) {
      console.error(
        "Erro ao carregar recibo:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o recibo.",
      );
    } finally {
      setLoadingReceipt(false);
    }
  };

  // ==========================================================
  // FECHAR RECIBO
  // ==========================================================

  const closeReceipt = () => {
    setSelectedPayment(null);
    setReceipt(null);
    setLoadingReceipt(false);
  };

  // ==========================================================
  // IMPRESSÃO
  // ==========================================================

  const printReceipt = () => {
    window.print();
  };

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

      {/* ======================================================
          MODAL DO RECIBO
      ====================================================== */}

      {selectedPayment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Recibo do pagamento"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-950">
                  Recibo do pagamento
                </h2>

                <p className="mt-0.5 text-xs text-zinc-500">
                  {selectedPayment.reference ??
                    selectedPayment.id}
                </p>
              </div>

              <button
                type="button"
                onClick={closeReceipt}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                aria-label="Fechar recibo"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* CONTEÚDO */}

            <div className="max-h-[calc(90vh-145px)] overflow-y-auto p-6">
              {loadingReceipt ? (
                <div className="flex min-h-[300px] items-center justify-center">
                  <div className="flex items-center gap-3 text-sm text-zinc-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Carregando recibo...
                  </div>
                </div>
              ) : receipt ? (
                <div
                  id="payment-receipt"
                  className="space-y-6"
                >
                  {/* CABEÇALHO DO RECIBO */}

                  <div className="flex items-start justify-between border-b border-zinc-200 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>

                      <div>
                        <h3 className="font-semibold text-zinc-950">
                          Agenda+
                        </h3>

                        <p className="text-xs text-zinc-500">
                          Recibo de pagamento
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      PAGO
                    </span>
                  </div>

                  {/* TOTAL */}

                  <div className="rounded-2xl bg-zinc-50 p-5">
                    <p className="text-sm text-zinc-500">
                      Total pago
                    </p>

                    <p className="mt-1 text-3xl font-bold tracking-tight text-zinc-950">
                      {formatCurrency(
                        Number(receipt.total || 0),
                      )}
                    </p>

                    <p className="mt-2 text-xs text-zinc-500">
                      {formatDateTime(
                        receipt.payment?.paidAt ??
                          null,
                      )}
                    </p>
                  </div>

                  {/* CLIENTE */}

                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-950">
                      Cliente
                    </h4>

                    <div className="rounded-xl border border-zinc-200 p-4">
                      <p className="font-medium text-zinc-900">
                        {receipt.client?.name ??
                          "Cliente"}
                      </p>

                      {receipt.client?.email && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                          <Mail className="h-4 w-4 shrink-0" />

                          <span>
                            {receipt.client.email}
                          </span>
                        </div>
                      )}

                      {receipt.client?.phone && (
                        <p className="mt-1 text-sm text-zinc-500">
                          {receipt.client.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* SERVIÇO */}

                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-950">
                      Serviço
                    </h4>

                    <div className="rounded-xl border border-zinc-200 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-zinc-900">
                            {receipt.service?.name ??
                              "Serviço"}
                          </p>

                          <p className="mt-1 text-sm text-zinc-500">
                            {receipt.service?.duration ??
                              0}{" "}
                            minutos
                          </p>
                        </div>

                        <p className="font-semibold text-zinc-950">
                          {formatCurrency(
                            Number(
                              receipt.service
                                ?.price || 0,
                            ),
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* PAGAMENTO */}

                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-950">
                      Pagamento
                    </h4>

                    <div className="space-y-3 rounded-xl border border-zinc-200 p-4">
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-zinc-500">
                          Método
                        </span>

                        <span className="font-medium text-zinc-900">
                          {getMethodLabel(
                            receipt.payment
                              ?.method ?? "",
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-zinc-500">
                          Referência
                        </span>

                        <span className="max-w-[60%] truncate text-right font-medium text-zinc-900">
                          {receipt.payment
                            ?.reference ?? "—"}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-zinc-500">
                          Estado
                        </span>

                        <span className="font-medium text-emerald-700">
                          Pago
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PROFISSIONAL */}

                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-950">
                      Profissional
                    </h4>

                    <div className="rounded-xl border border-zinc-200 p-4">
                      <p className="font-medium text-zinc-900">
                        {receipt.professional?.name ??
                          "Profissional"}
                      </p>

                      {receipt.professional
                        ?.specialty && (
                        <p className="mt-1 text-sm text-zinc-500">
                          {
                            receipt
                              .professional
                              .specialty
                          }
                        </p>
                      )}

                      {receipt.professional?.phone && (
                        <p className="mt-1 text-sm text-zinc-500">
                          {receipt.professional.phone}
                        </p>
                      )}

                      {receipt.professional?.email && (
                        <p className="mt-1 text-sm text-zinc-500">
                          {receipt.professional.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* AGENDAMENTO */}

                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-950">
                      Agendamento
                    </h4>

                    <div className="rounded-xl border border-zinc-200 p-4">
                      <div className="flex items-center gap-2 text-sm text-zinc-600">
                        <CalendarDays className="h-4 w-4 shrink-0 text-zinc-400" />

                        {formatDateTime(
                          receipt.appointment?.date ??
                            null,
                        )}
                      </div>

                      {receipt.appointment?.status && (
                        <p className="mt-2 text-sm text-zinc-500">
                          Estado:{" "}
                          <span className="font-medium text-zinc-700">
                            {receipt.appointment.status}
                          </span>
                        </p>
                      )}

                      {receipt.appointment?.notes && (
                        <p className="mt-3 border-t border-zinc-100 pt-3 text-sm text-zinc-500">
                          {receipt.appointment.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* RODAPÉ DO RECIBO */}

                  <div className="border-t border-zinc-200 pt-5 text-center">
                    <p className="text-xs text-zinc-400">
                      Obrigado pela preferência.
                    </p>

                    <p className="mt-1 text-xs text-zinc-400">
                      Agenda+
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[250px] items-center justify-center text-sm text-zinc-500">
                  Não foi possível carregar o
                  recibo.
                </div>
              )}
            </div>

            {/* FOOTER */}

            <div className="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50/50 px-6 py-4">
              <button
                type="button"
                onClick={closeReceipt}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Fechar
              </button>

              {receipt && (
                <button
                  type="button"
                  onClick={printReceipt}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  <Download className="h-4 w-4" />
                  Imprimir recibo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          ESTILOS DE IMPRESSÃO
      ====================================================== */}

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          #payment-receipt,
          #payment-receipt * {
            visibility: visible !important;
          }

          #payment-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 24px !important;
            background: white !important;
          }

          @page {
            margin: 12mm;
          }
        }
      `}</style>
    </div>
  );
}