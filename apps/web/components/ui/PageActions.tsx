import type { ReactNode } from "react";

/*
 * As ações principais de uma página do painel (novo agendamento, novo serviço…),
 * alinhadas à direita por baixo do header. O título já está no header.
 */

// O botão principal do sistema, no azul da marca.
export const brandButton =
  "brand-sheen inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_var(--brand)] transition duration-200 hover:-translate-y-0.5 hover:bg-primary-hover active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60";

export function PageActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">{children}</div>;
}
