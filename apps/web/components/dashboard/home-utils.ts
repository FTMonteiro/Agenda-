import { CheckCircle2, CircleCheckBig, Clock3, UserX, XCircle, type LucideIcon } from "lucide-react";
import type { Appointment, AppointmentStatus } from "@/types/appointment";

/*
 * Formatação, estados e cálculos da Home do painel.
 */

const currencyFormatter = new Intl.NumberFormat("pt-AO", {
  style: "currency",
  currency: "AOA",
  maximumFractionDigits: 0,
});

export function formatPrice(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

// "2026-10-20": o mesmo formato das datas dos agendamentos (hora local).
export function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function timeKey(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("pt-AO", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

export function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 19) return "Boa tarde";
  return "Boa noite";
}

export function firstName(name: string | undefined | null) {
  return name?.trim().split(/\s+/)[0] ?? "";
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// Minutos entre agora e a hora marcada (negativo se já passou).
export function minutesUntil(appointment: Appointment, now: Date) {
  const [hours, minutes] = appointment.time.split(":").map(Number);
  const [year, month, day] = appointment.date.split("-").map(Number);
  const at = new Date(year, month - 1, day, hours, minutes);
  return Math.round((at.getTime() - now.getTime()) / 60000);
}

// 0 → "agora", 25 → "em 25 min", 70 → "em 1h 10min".
export function formatCountdown(minutes: number) {
  if (minutes <= 0) return "agora";
  if (minutes < 60) return `em ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `em ${hours}h ${rest}min` : `em ${hours}h`;
}

/* ============================================================
   ESTADOS

   Os mesmos nomes e cores da página Agenda, para o mesmo agendamento
   aparecer igual nos dois sítios.
============================================================ */

type StatusMeta = {
  label: string;
  icon: LucideIcon;
  badge: string;
  // Cor do ponto da linha do tempo e do segmento da barra de progresso.
  dot: string;
};

export const STATUS_META: Record<AppointmentStatus, StatusMeta> = {
  pending: {
    label: "Aguardando",
    icon: Clock3,
    badge: "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/25 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  confirmed: {
    label: "Confirmado",
    icon: CheckCircle2,
    badge: "bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/25 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  completed: {
    label: "Concluído",
    icon: CircleCheckBig,
    badge: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/25 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  cancelled: {
    label: "Cancelado",
    icon: XCircle,
    badge: "bg-red-500/10 text-red-700 ring-1 ring-red-500/25 dark:text-red-400",
    dot: "bg-red-500",
  },
  no_show: {
    label: "Não compareceu",
    icon: UserX,
    badge: "bg-gray-500/10 text-gray-600 ring-1 ring-gray-500/25 dark:text-gray-400",
    dot: "bg-gray-400",
  },
};

export function statusMeta(status: string) {
  return STATUS_META[status as AppointmentStatus] ?? STATUS_META.pending;
}

export function isOpen(appointment: Appointment) {
  return appointment.status === "pending" || appointment.status === "confirmed";
}

export function countByStatus(appointments: Appointment[]) {
  const counts: Record<AppointmentStatus, number> = {
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
  };
  for (const appointment of appointments) {
    if (appointment.status in counts) counts[appointment.status] += 1;
  }
  return counts;
}

/* ============================================================
   PRÓXIMOS DIAS
============================================================ */

const WEEKDAY = new Intl.DateTimeFormat("pt-AO", { weekday: "short" });

// Agendamentos (sem os cancelados) e receita prevista para cada um dos próximos dias, a começar hoje.
export function upcomingDays(appointments: Appointment[], now: Date, length = 7) {
  return Array.from({ length }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + index);
    const key = dateKey(date);
    const items = appointments.filter((item) => item.date === key && item.status !== "cancelled");

    return {
      key,
      label: index === 0 ? "Hoje" : WEEKDAY.format(date).replace(".", ""),
      day: date.getDate(),
      count: items.length,
      expected: items.reduce((sum, item) => sum + Number(item.price ?? 0), 0),
    };
  });
}
