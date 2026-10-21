"use client";

import { FormEvent, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import type { UserProfile } from "./ProfileSettings";

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-60";

const labelClass = "mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]";

// The owner's own name and phone, editable. The email is how they sign in, so it is only
// shown.
export function OwnerProfileForm({
  profile,
  setProfile,
}: {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
}) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [saving, setSaving] = useState(false);

  const isDirty = name.trim() !== profile.name || phone.trim() !== profile.phone;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (name.trim().length < 2) return toast.error("O nome deve ter pelo menos 2 caracteres.");

    try {
      setSaving(true);

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, phone }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.profile) throw new Error(data?.error || "Não foi possível guardar o perfil.");

      setProfile(data.profile);
      setName(data.profile.name);
      setPhone(data.profile.phone);

      // Atualizar Header e Sidebar
      window.dispatchEvent(
        new CustomEvent("profile-updated", {
          detail: { avatar: data.profile.avatar, name: data.profile.name },
        }),
      );

      toast.success("Perfil atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível guardar o perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid flex-1 gap-5 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className={labelClass}>Nome</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="O seu nome"
          autoComplete="name"
          disabled={saving}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>Telefone</span>
        <input
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+244 923 000 000"
          autoComplete="tel"
          disabled={saving}
          className={inputClass}
        />
      </label>

      <div>
        <span className={labelClass}>E-mail</span>
        <p className="flex h-11 items-center gap-2 truncate rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 text-sm text-[var(--muted)]">
          <Mail size={16} className="shrink-0" />
          <span className="truncate">{profile.email}</span>
        </p>
      </div>

      <div className="flex justify-end sm:col-span-2">
        <button
          type="submit"
          disabled={saving || !isDirty}
          className="flex items-center gap-2 rounded-xl bg-[var(--foreground)] px-6 py-2.5 text-sm font-medium text-[var(--background)] shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Salvando..." : "Salvar perfil"}
        </button>
      </div>
    </form>
  );
}
