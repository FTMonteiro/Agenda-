"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 pr-12 text-sm outline-none transition focus:border-primary disabled:opacity-60";

// The signed-in user's own password. An employee starts with the one generated when the
// owner created the account, and replaces it here.
export function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentPassword) return toast.error("Digite a senha atual.");
    if (newPassword.length < 8) return toast.error("A nova senha deve ter pelo menos 8 caracteres.");
    if (newPassword !== confirmPassword) return toast.error("As senhas não coincidem.");

    try {
      setSaving(true);

      const response = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) throw new Error(data?.error || "Não foi possível alterar a senha.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Senha alterada com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar a senha.");
    } finally {
      setSaving(false);
    }
  }

  const type = visible ? "text" : "password";

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <KeyRound size={18} />
            Alterar senha
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Troque a senha que recebeu ao ser cadastrado por uma só sua.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ocultar senhas" : "Mostrar senhas"}
          className="rounded-lg p-2 text-[var(--muted)] transition hover:bg-[var(--surface-secondary)]"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Senha atual</span>
            <input
              type={type}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="A senha que usa para entrar"
              autoComplete="current-password"
              disabled={saving}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Nova senha</span>
            <input
              type={type}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Mínimo de 8 caracteres"
              autoComplete="new-password"
              disabled={saving}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Confirmar nova senha</span>
            <input
              type={type}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Digite novamente"
              autoComplete="new-password"
              disabled={saving}
              className={inputClass}
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? "Salvando..." : "Alterar senha"}
          </button>
        </div>
      </form>
    </div>
  );
}
