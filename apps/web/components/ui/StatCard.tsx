"use client";

import type { LucideIcon } from "lucide-react";
import { useCountUp } from "@/lib/use-count-up";

/*
 * Cartão de indicador comum às páginas do painel: número animado, ícone com a cor do
 * significado (marca, sucesso, atenção, perigo) e uma linha de contexto opcional.
 */

export type StatTone = "brand" | "success" | "warning" | "danger" | "neutral";

const TONES: Record<StatTone, { icon: string; glow: string }> = {
  brand: { icon: "bg-primary/10 text-primary", glow: "bg-primary/10" },
  success: { icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", glow: "bg-emerald-500/10" },
  warning: { icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400", glow: "bg-amber-500/10" },
  danger: { icon: "bg-red-500/10 text-red-600 dark:text-red-400", glow: "bg-red-500/10" },
  neutral: { icon: "bg-[var(--surface-secondary)] text-[var(--muted)]", glow: "bg-[var(--surface-secondary)]" },
};

type Props = {
  label: string;
  value: number;
  icon: LucideIcon;
  description?: string;
  tone?: StatTone;
  // Posição na grelha, para a entrada em cascata.
  index?: number;
};

export function StatCard({ label, value, icon: Icon, description, tone = "brand", index = 0 }: Props) {
  const animated = useCountUp(value);
  const colors = TONES[tone];

  return (
    <div
      style={{ animationDelay: `${index * 70}ms` }}
      className="finance-fade-up group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition duration-500 group-hover:opacity-100 ${colors.glow}`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-[var(--foreground)]">
            {Math.round(animated).toLocaleString("pt-AO")}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition duration-300 group-hover:scale-110 ${colors.icon}`}
        >
          <Icon size={21} />
        </div>
      </div>

      {description && <p className="relative mt-3 text-xs text-[var(--muted)]">{description}</p>}
    </div>
  );
}
