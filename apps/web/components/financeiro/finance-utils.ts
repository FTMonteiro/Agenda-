import {
  Banknote,
  CreditCard,
  Landmark,
  Smartphone,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/*
 * Tipos, formatação e cálculos da área de finanças. Os métodos já chegam no formato do
 * painel (fromApiMethod): BANK_TRANSFER → TRANSFER, MULTICAIXA → MOBILE_MONEY.
 */

export type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "MOBILE_MONEY" | "OTHER";

export type FinancePayment = {
  id: string;
  amount: number;
  method: PaymentMethod;
  status: "PAID";
  paidAt: string | null;
  client: { id: string; name: string };
  service: { id: string; name: string };
  professional: { id: string; name: string };
  appointment: { id: string; date: string; status: string };
};

export type FinanceResponse = {
  success: boolean;
  period?: { month: string; start: string; end: string };
  summary: {
    todayRevenue: number;
    monthlyRevenue: number;
    paymentsReceived: number;
    todayPayments: number;
  };
  paymentMethods: Partial<Record<PaymentMethod, number>>;
  payments: FinancePayment[];
};

type MethodMeta = {
  label: string;
  icon: LucideIcon;
  // Token CSS do método (globals.css), com tom próprio no modo escuro.
  color: string;
};

export const METHOD_META: Record<PaymentMethod, MethodMeta> = {
  CASH: { label: "Dinheiro", icon: Banknote, color: "var(--method-cash)" },
  CARD: { label: "Cartão", icon: CreditCard, color: "var(--method-card)" },
  TRANSFER: { label: "Transferência", icon: Landmark, color: "var(--method-transfer)" },
  MOBILE_MONEY: { label: "Multicaixa Express", icon: Smartphone, color: "var(--method-mobile)" },
  OTHER: { label: "Outro", icon: Wallet, color: "var(--method-other)" },
};

export const METHOD_ORDER: PaymentMethod[] = ["CASH", "CARD", "TRANSFER", "MOBILE_MONEY", "OTHER"];

export function methodMeta(method: string): MethodMeta {
  return METHOD_META[method as PaymentMethod] ?? METHOD_META.OTHER;
}

export const MONTHS = [
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

const currencyFormatter = new Intl.NumberFormat("pt-AO", {
  style: "currency",
  currency: "AOA",
  maximumFractionDigits: 0,
});

const preciseCurrencyFormatter = new Intl.NumberFormat("pt-AO", {
  style: "currency",
  currency: "AOA",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number, precise = false) {
  const amount = Number.isFinite(value) ? value : 0;
  return (precise ? preciseCurrencyFormatter : currencyFormatter).format(amount);
}

// 1 250 000 → "1,3 M Kz": cabe nos eixos e nas dicas do gráfico.
export function formatCompactCurrency(value: number) {
  return `${new Intl.NumberFormat("pt-AO", { notation: "compact", maximumFractionDigits: 1 }).format(value)} Kz`;
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | null | undefined) {
  const date = parseDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-AO", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function formatTime(value: string | null | undefined) {
  const date = parseDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-AO", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function formatDateTime(value: string | null | undefined) {
  const date = parseDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-AO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/* ============================================================
   MESES
============================================================ */

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(value: string, delta: number) {
  const [year, month] = value.split("-").map(Number);
  return monthKey(new Date(year, month - 1 + delta, 1));
}

export function monthLabel(value: string) {
  const [year, month] = value.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

export function daysInMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

// Os últimos 24 meses, do atual para trás.
export function availableMonths(count = 24) {
  const current = monthKey(new Date());
  return Array.from({ length: count }, (_, index) => shiftMonth(current, -index));
}

/* ============================================================
   CÁLCULOS
============================================================ */

export function sumAmounts(payments: FinancePayment[]) {
  return payments.reduce((total, payment) => total + Number(payment.amount || 0), 0);
}

// Variação percentual face ao período anterior; null quando não há base de comparação.
export function percentChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

// Receita e número de pagamentos por dia do mês (índice 0 = dia 1).
export function dailySeries(payments: FinancePayment[], month: string) {
  const days = Array.from({ length: daysInMonth(month) }, (_, index) => ({
    day: index + 1,
    total: 0,
    count: 0,
  }));

  for (const payment of payments) {
    const date = parseDate(payment.paidAt);
    if (!date || monthKey(date) !== month) continue;

    const entry = days[date.getDate() - 1];
    entry.total += Number(payment.amount || 0);
    entry.count += 1;
  }

  return days;
}

export type Ranking = { name: string; total: number; count: number };

export function rankBy(payments: FinancePayment[], pick: (payment: FinancePayment) => string, limit = 5) {
  const groups = new Map<string, Ranking>();

  for (const payment of payments) {
    const name = pick(payment) || "—";
    const entry = groups.get(name) ?? { name, total: 0, count: 0 };
    entry.total += Number(payment.amount || 0);
    entry.count += 1;
    groups.set(name, entry);
  }

  return [...groups.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

/* ============================================================
   EXPORTAÇÃO
============================================================ */

function csvCell(value: string | number) {
  const text = String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// CSV com ";" e BOM: abre direto no Excel em português com acentos e colunas certas.
export function downloadPaymentsCsv(payments: FinancePayment[], month: string) {
  const header = ["Data", "Hora", "Cliente", "Serviço", "Profissional", "Método", "Valor (Kz)"];
  const rows = payments.map((payment) => [
    formatDate(payment.paidAt),
    formatTime(payment.paidAt),
    payment.client.name,
    payment.service.name,
    payment.professional.name,
    methodMeta(payment.method).label,
    Number(payment.amount || 0).toFixed(2).replace(".", ","),
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `receitas-${month}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
