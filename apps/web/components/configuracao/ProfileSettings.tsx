
"use client";

import { useRef, useState } from "react";
import {
  UserRound,
  Mail,
  Phone,
  BriefcaseBusiness,
  Camera,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { shrinkImage } from "@/lib/shrink-image";

import { ChangePasswordCard } from "./ChangePasswordCard";

// The signed-in person's own profile (owner or employee). The photo here is theirs — the
// one from Google, or one they pick — and is what the dashboard shows for them; the
// business logo stays in "Dados do estabelecimento" and is only shown in the app.
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  avatar: string | null;
  active: boolean;
}

interface ProfileSettingsProps {
  profile: UserProfile;
  setProfile: React.Dispatch<
    React.SetStateAction<UserProfile>
  >;
  isOwner: boolean;
}

export function ProfileSettings({
  profile,
  setProfile,
  isOwner,
}: ProfileSettingsProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);

  const [removing, setRemoving] = useState(false);

  function handleSelectPhoto() {
    inputRef.current?.click();
  }

  async function handlePhotoChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    
    // VALIDAR TIPO
    

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error(
        "Escolha uma imagem PNG, JPG ou WebP.",
      );

      event.target.value = "";

      return;
    }

    
    // VALIDAR TAMANHO


    if (file.size > 5 * 1024 * 1024) {
      toast.error(
        "A foto deve ter no máximo 5 MB.",
      );

      event.target.value = "";

      return;
    }

  
    // CONVERTER PARA BASE64
  

    const shrunk = await shrinkImage(file).catch(() => file);

    const reader = new FileReader();

    reader.onload = async () => {
      const result = reader.result;

      if (typeof result !== "string") {
        toast.error(
          "Não foi possível ler a imagem.",
        );

        return;
      }

      await savePhoto(result);
    };

    reader.onerror = () => {
      toast.error(
        "Não foi possível carregar a imagem.",
      );
    };

    reader.readAsDataURL(shrunk);
  }

  
  // SALVAR FOTO
  

  async function savePhoto(
    avatar: string,
  ) {
    try {
      setSaving(true);

      const response = await fetch(
        "/api/profile",
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            avatar,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível atualizar a foto.",
        );
      }

      if (!data.profile) {
        throw new Error(
          "A API não devolveu o perfil atualizado.",
        );
      }

      setProfile(data.profile);

      // Atualizar Header e Sidebar
      window.dispatchEvent(
        new CustomEvent(
          "profile-updated",
          {
            detail: {
              avatar:
                data.profile.avatar,
              name:
                data.profile.name,
            },
          },
        ),
      );

      toast.success(
        "Foto de perfil atualizada.",
      );
    } catch (error) {
      console.error(
        "Erro ao salvar foto:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a foto.",
      );
    } finally {
      setSaving(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  // REMOVER FOTO


  async function handleRemovePhoto() {
    if (!profile.avatar) {
      return;
    }

    try {
      setRemoving(true);

      const response = await fetch(
        "/api/profile",
        {
          method: "DELETE",

          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível remover a foto.",
        );
      }

      setProfile(data.profile);

      // Atualizar Header e Sidebar
      window.dispatchEvent(
        new CustomEvent(
          "profile-updated",
          {
            detail: {
              avatar:
                data.profile.avatar,
              name:
                data.profile.name,
            },
          },
        ),
      );

      toast.success(
        "Foto removida.",
      );
    } catch (error) {
      console.error(
        "Erro ao remover foto:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível remover a foto.",
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/*FOTO + PERFIL*/}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-6 py-5">
          <h2 className="text-lg font-semibold">
            {isOwner
              ? "Meu perfil"
              : "Meu perfil profissional"}
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            {isOwner
              ? "A sua foto e os dados da sua conta. A logo do estabelecimento fica em Dados do estabelecimento e só aparece na app."
              : "Gerencie a sua foto e consulte as informações associadas à sua conta profissional."}
          </p>
        </div>

        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          {/* FOTO*/}

          <div className="flex shrink-0 flex-col items-center gap-3">
            <div className="relative">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--surface-secondary)] bg-[var(--surface-secondary)] shadow-sm">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={`Foto de ${profile.name}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound
                    size={52}
                    strokeWidth={1.5}
                    className="text-[var(--muted)]"
                  />
                )}
              </div>

              {/* BOTÃO CÂMERA */}

              <button
                type="button"
                onClick={handleSelectPhoto}
                disabled={
                  saving || removing
                }
                aria-label="Alterar foto"
                className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full border-4 border-[var(--surface)] bg-primary text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Camera size={17} />
                )}
              </button>

              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleSelectPhoto}
                disabled={
                  saving || removing
                }
                className="text-sm font-semibold text-primary hover:underline disabled:opacity-50"
              >
                {saving
                  ? "Salvando..."
                  : "Alterar foto"}
              </button>

              <p className="mt-1 text-xs text-[var(--muted)]">
                PNG, JPG ou WebP · Máx. 5 MB
              </p>
            </div>

            {profile.avatar && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={
                  saving || removing
                }
                className="flex items-center gap-1.5 text-xs font-medium text-red-600 transition hover:text-red-700 disabled:opacity-50"
              >
                {removing ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                ) : (
                  <Trash2 size={14} />
                )}

                {removing
                  ? "Removendo..."
                  : "Remover foto"}
              </button>
            )}
          </div>

          {/*INFORMAÇÕES */}

          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <InfoField
              icon={
                <UserRound size={18} />
              }
              label="Nome"
              value={profile.name}
            />

            <InfoField
              icon={
                <Mail size={18} />
              }
              label="E-mail"
              value={profile.email}
            />

            <InfoField
              icon={
                <Phone size={18} />
              }
              label="Telefone"
              value={
                profile.phone ||
                "Não informado"
              }
            />

            {!isOwner && (
              <InfoField
                icon={
                  <BriefcaseBusiness
                    size={18}
                  />
                }
                label="Especialidade"
                value={
                  profile.specialty ||
                  "Não informada"
                }
              />
            )}
          </div>
        </div>
      </div>

      {/* SENHA */}

      <ChangePasswordCard
        description={
          isOwner
            ? "Mude a senha que usa para entrar no painel."
            : undefined
        }
      />
    </div>
  );
}


// CAMPO DE INFORMAÇÃO


function InfoField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {icon}

        {label}
      </div>

      <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

