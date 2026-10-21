import type { ReactNode } from "react";

/*
 * As ações principais de uma página do painel (novo agendamento, novo serviço…),
 * alinhadas à direita por baixo do header. O título já está no header.
 */

// O botão principal do sistema, no azul da marca.
export const brandButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60";

export function PageActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">{children}</div>;
}
