"use client";

import type { LucideIcon } from "lucide-react";
import { useCountUp } from "@/lib/use-count-up";

/*
 * Cartão de indicador comum às páginas do painel: número animado, ícone com a cor do
 * significado (marca, sucesso, atenção, perigo) e uma linha de contexto opcional.
 */

export type StatTone = "brand" | "success" | "warning" | "danger" | "neutral";

const TONES: Record<StatTone, { icon: string }> = {
  brand: { icon: "bg-primary/10 text-[var(--brand-text)]" },
  success: { icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  warning: { icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  danger: { icon: "bg-red-500/10 text-red-600 dark:text-red-400" },
  neutral: { icon: "bg-[var(--surface-secondary)] text-[var(--muted)]" },
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
      className="finance-fade-up rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-[26px] font-semibold leading-tight tracking-tight tabular-nums text-[var(--foreground)]">
            {Math.round(animated).toLocaleString("pt-AO")}
          </p>
        </div>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colors.icon}`}
        >
          <Icon size={20} />
        </div>
      </div>

      {description && <p className="mt-3 text-xs text-[var(--muted)]">{description}</p>}
    </div>
  );
}
