
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BrandIcon } from "@/components/brand/BrandLogo";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Mail,
  Phone,
  Receipt,
  Scissors,
  UserRound,
} from "lucide-react";

interface ReceiptData {
  title?: string;
  type?: string;

  payment?: {
    id?: string;
    reference?: string | null;
    amount?: number;
    method?: string;
    status?: string;
    paidAt?: string;
  };

  appointment?: {
    id?: string;
    date?: string;
    status?: string;
    notes?: string | null;
  };

  client?: {
    id?: string;
    name?: string;
    email?: string | null;
    phone?: string | null;
  };

  professional?: {
    id?: string;
    name?: string;
    email?: string | null;
    phone?: string | null;
    specialty?: string | null;
  };

  service?: {
    id?: string;
    name?: string;
    price?: number;
    duration?: number | null;
  };

  total?: number;
}

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();

  const appointmentId =
    typeof params.appointmentId === "string"
      ? params.appointmentId
      : "";

  const [receipt, setReceipt] =
    useState<ReceiptData | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    if (!appointmentId) {
      setLoading(false);
      return;
    }

    try {
      const stored =
        sessionStorage.getItem(
          `receipt:${appointmentId}`,
        );

      if (!stored) {
        setReceipt(null);
        return;
      }

      const parsed =
        JSON.parse(stored) as ReceiptData;

      setReceipt(parsed);
    } catch (error) {
      console.error(
        "Erro ao carregar recibo:",
        error,
      );

      setReceipt(null);
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  function formatMoney(
    value?: number | null,
  ) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
      return "0,00 Kz";
    }

    return `${amount.toLocaleString(
      "pt-AO",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    )} Kz`;
  }

  function formatDate(
    value?: string | null,
  ) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString(
      "pt-AO",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      },
    );
  }

  function formatDateTime(
    value?: string | null,
  ) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString(
      "pt-AO",
      {
        dateStyle: "medium",
        timeStyle: "short",
      },
    );
  }

  function getPaymentMethod(
    method?: string,
  ) {
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
        return method || "Não informado";
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />

          <p className="mt-4 text-sm text-gray-500">
            Carregando recibo...
          </p>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <Receipt className="h-7 w-7 text-gray-500" />
          </div>

          <h1 className="mt-5 text-xl font-semibold text-gray-950">
            Recibo indisponível
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Não foi possível carregar os
            dados deste recibo.
          </p>

          <button
            type="button"
            onClick={() => router.back()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const payment =
    receipt.payment;

  const client =
    receipt.client;

  const professional =
    receipt.professional;

  const service =
    receipt.service;

  const appointment =
    receipt.appointment;

  const total =
    receipt.total ??
    payment?.amount ??
    0;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6">
      {/* ======================================================
          AÇÕES
      ====================================================== */}

      <div className="mx-auto mb-6 flex w-full max-w-3xl items-center justify-between print:hidden">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
        >
          <Download className="h-4 w-4" />
          Imprimir / Guardar PDF
        </button>
      </div>

      {/* ======================================================
          RECIBO
      ====================================================== */}

      <main className="mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        {/* ====================================================
            CABEÇALHO
        ==================================================== */}

        <div className="border-b border-gray-100 px-6 py-8 sm:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <BrandIcon size={44} />

                <div>
                  <p className="text-lg font-bold tracking-tight text-gray-950">
                    Agenda+
                  </p>

                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    by NEVRIX
                  </p>
                </div>
              </div>

              <h1 className="mt-8 text-2xl font-bold text-gray-950 sm:text-3xl">
                Recibo do pagamento
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Comprovativo de pagamento
              </p>
            </div>

            <div className="sm:text-right">
              <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Pagamento confirmado
              </div>

              {payment?.reference && (
                <p className="mt-3 text-xs text-gray-400">
                  Referência
                </p>
              )}

              {payment?.reference && (
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {payment.reference}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ====================================================
            VALOR
        ==================================================== */}

        <div className="border-b border-gray-100 bg-gray-50/70 px-6 py-8 sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Total pago
          </p>

          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">
            {formatMoney(total)}
          </p>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
            <span className="inline-flex items-center gap-2">
              <CreditCard className="h-4 w-4" />

              {getPaymentMethod(
                payment?.method,
              )}
            </span>

            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />

              {formatDateTime(
                payment?.paidAt,
              )}
            </span>
          </div>
        </div>

        {/* ====================================================
            INFORMAÇÕES
        ==================================================== */}

        <div className="grid gap-8 px-6 py-8 sm:grid-cols-2 sm:px-10">
          {/* CLIENTE */}

          <section>
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-gray-400" />

              <h2 className="text-sm font-semibold text-gray-950">
                Cliente
              </h2>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-gray-900">
                {client?.name ||
                  "Não informado"}
              </p>

              {client?.email && (
                <p className="flex items-center gap-2 text-sm text-gray-500">
                  <Mail className="h-3.5 w-3.5" />
                  {client.email}
                </p>
              )}

              {client?.phone && (
                <p className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone className="h-3.5 w-3.5" />
                  {client.phone}
                </p>
              )}
            </div>
          </section>

          {/* PROFISSIONAL */}

          <section>
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-gray-400" />

              <h2 className="text-sm font-semibold text-gray-950">
                Profissional
              </h2>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-gray-900">
                {professional?.name ||
                  "Não informado"}
              </p>

              {professional?.specialty && (
                <p className="text-sm text-gray-500">
                  {professional.specialty}
                </p>
              )}

              {professional?.phone && (
                <p className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone className="h-3.5 w-3.5" />
                  {professional.phone}
                </p>
              )}
            </div>
          </section>
        </div>

        {/* ====================================================
            SERVIÇO
        ==================================================== */}

        <div className="border-t border-gray-100 px-6 py-8 sm:px-10">
          <div className="mb-4 flex items-center gap-2">
            <Scissors className="h-4 w-4 text-gray-400" />

            <h2 className="text-sm font-semibold text-gray-950">
              Serviço
            </h2>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900">
                  {service?.name ||
                    "Serviço"}
                </p>

                {service?.duration && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    {service.duration} minutos
                  </p>
                )}
              </div>

              <p className="font-bold text-gray-950">
                {formatMoney(
                  service?.price,
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ====================================================
            AGENDAMENTO
        ==================================================== */}

        <div className="border-t border-gray-100 px-6 py-8 sm:px-10">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gray-400" />

            <h2 className="text-sm font-semibold text-gray-950">
              Agendamento
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400">
                Data
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-900">
                {formatDate(
                  appointment?.date,
                )}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400">
                Estado do pagamento
              </p>

              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Pago
              </p>
            </div>
          </div>
        </div>

        {/* ====================================================
            TOTAL
        ==================================================== */}

        <div className="border-t border-gray-100 px-6 py-8 sm:px-10">
          <div className="ml-auto max-w-sm space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Serviço</span>

              <span>
                {formatMoney(
                  service?.price,
                )}
              </span>
            </div>

            <div className="border-t border-gray-200 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-gray-950">
                  Total pago
                </span>

                <span className="text-xl font-bold text-gray-950">
                  {formatMoney(total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================
            RODAPÉ
        ==================================================== */}

        <div className="border-t border-gray-100 bg-gray-50 px-6 py-6 text-center sm:px-10">
          <p className="text-sm font-semibold text-gray-900">
            Obrigado pela preferência.
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Este documento confirma que o
            pagamento foi registado com sucesso.
          </p>

          <p className="mt-4 text-xs font-medium text-gray-400">
            Agenda+ · NEVRIX
          </p>
        </div>
      </main>
    </div>
  );
}

