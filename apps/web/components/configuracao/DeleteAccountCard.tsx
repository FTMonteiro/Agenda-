"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const CONFIRM_WORD = "ELIMINAR";

// Deleting the owner's account for good — and with it the space, its services, team,
// clients, appointments and payments. Asked twice: open the dialog, then type the word.
export function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  function close() {
    if (deleting) return;
    setOpen(false);
    setTyped("");
  }

  async function handleDelete() {
    if (typed.trim().toUpperCase() !== CONFIRM_WORD) return;

    try {
      setDeleting(true);

      const response = await fetch("/api/profile/account", { method: "DELETE", credentials: "include" });
      const data = await response.json().catch(() => null);

      if (!response.ok) throw new Error(data?.error || "Não foi possível eliminar a conta.");

      window.location.href = "/login";
    } catch (error) {
      setDeleting(false);
      toast.error(error instanceof Error ? error.message : "Não foi possível eliminar a conta.");
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-red-500/30 bg-[var(--surface)]">
        <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-red-600">
              <Trash2 size={18} />
              Eliminar conta
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Apaga de vez a sua conta e o estabelecimento, com os serviços, a equipa, os clientes, os agendamentos e
              os pagamentos. O espaço deixa de aparecer na app. Não é possível desfazer.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Eliminar conta
          </button>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                  <AlertTriangle size={21} />
                </div>

                <h2 id="delete-account-title" className="text-base font-semibold text-[var(--foreground)]">
                  Eliminar a conta de vez?
                </h2>
              </div>

              <button
                type="button"
                onClick={close}
                disabled={deleting}
                aria-label="Fechar"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)] disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-6">
              <p className="text-sm leading-6 text-[var(--muted)]">
                Tudo o que está no painel é apagado, as contas dos funcionários também, e o espaço sai da app. Esta ação
                não pode ser desfeita.
              </p>

              <label className="block">
                <span className="mb-2 block text-sm">
                  Para confirmar, escreva <strong className="text-[var(--foreground)]">{CONFIRM_WORD}</strong>
                </span>
                <input
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  autoFocus
                  disabled={deleting}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none transition focus:border-red-500"
                />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={close}
                disabled={deleting}
                className="w-full rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-secondary)] disabled:opacity-50 sm:w-auto"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || typed.trim().toUpperCase() !== CONFIRM_WORD}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {deleting ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}
                {deleting ? "A eliminar..." : "Eliminar de vez"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
