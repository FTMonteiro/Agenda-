"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  Clock,
  UserRound,
  Users,
  UsersRound,
  Scissors,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";

import { setBusinessCategory } from "@/lib/category-examples";

import { BusinessSettings } from "./BusinessSettings";
import {
  BusinessHours,
  type HoursForm,
} from "./BusinessHours";

import {
  ProfileSettings,
  type UserProfile,
} from "./ProfileSettings";

interface BusinessForm {
  name: string;
  category: string;
  phone: string;
  email: string;
  address: string;
  provincia: string;
  municipio: string;
  distrito: string;
  bairro: string;
  rua: string;
  latitude: number | null;
  longitude: number | null;
  logo: string;
}

interface BusinessCounts {
  clients: number;
  professionals: number;
  services: number;
  appointments: number;
}

const EMPTY_FORM: BusinessForm = {
  name: "",
  category: "",
  phone: "",
  email: "",
  address: "",
  provincia: "",
  municipio: "",
  distrito: "",
  bairro: "",
  rua: "",
  latitude: null,
  longitude: null,
  logo: "",
};

const EMPTY_HOURS: HoursForm = {
  openingTime: "",
  closingTime: "",
  workingDays: [1, 2, 3, 4, 5, 6],
  slotInterval: 30,
  rules: "",
};

const EMPTY_PROFILE: UserProfile = {
  id: "",
  name: "",
  email: "",
  phone: "",
  specialty: "",
  avatar: null,
  active: true,
};

type Tab = "dados" | "horario" | "perfil";

// "Meu perfil" no cabeçalho e o cartão da Sidebar abrem /configuracoes?tab=perfil.
// As abas só aparecem depois de carregar, por isso o servidor nunca as desenha.
function tabFromUrl(): Tab {
  if (typeof window === "undefined") {
    return "dados";
  }

  const tab = new URLSearchParams(
    window.location.search,
  ).get("tab");

  return tab === "horario" ||
    tab === "perfil"
    ? tab
    : "dados";
}

export function SettingsPage() {
  const [role, setRole] = useState<
    "OWNER" | "EMPLOYEE" | null
  >(null);

  const [business, setBusiness] =
    useState<BusinessForm>(EMPTY_FORM);

  const [saved, setSaved] =
    useState<BusinessForm>(EMPTY_FORM);

  const [profile, setProfile] =
    useState<UserProfile>(
      EMPTY_PROFILE,
    );

  const [hours, setHours] =
    useState<HoursForm>(EMPTY_HOURS);

  const [savedHours, setSavedHours] =
    useState<HoursForm>(EMPTY_HOURS);

  const [tab, setTab] =
    useState<Tab>(tabFromUrl);

  const [counts, setCounts] =
    useState<BusinessCounts | null>(null);

  const [createdAt, setCreatedAt] =
    useState<string | null>(null);

  const [updatedAt, setUpdatedAt] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | CARREGAR CONFIGURAÇÕES
  |--------------------------------------------------------------------------
  */

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/business",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      const contentType =
        response.headers.get(
          "content-type",
        );

      if (
        !contentType?.includes(
          "application/json",
        )
      ) {
        throw new Error(
          "A API /api/business não devolveu JSON.",
        );
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível carregar as configurações.",
        );
      }

      setRole(data.role);

      /*
      |--------------------------------------------------------------------------
      | PERFIL (OWNER E FUNCIONÁRIO)
      |--------------------------------------------------------------------------
      */

      const profileResponse =
        await fetch(
          "/api/profile",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          },
        );

      const profileData =
        await profileResponse
          .json()
          .catch(() => null);

      if (
        !profileResponse.ok ||
        !profileData?.profile
      ) {
        throw new Error(
          profileData?.error ||
            "Não foi possível carregar o perfil.",
        );
      }

      setProfile(profileData.profile);

      if (data.role === "EMPLOYEE") {
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | OWNER
      |--------------------------------------------------------------------------
      */

      const businessData =
        data.business;

      if (!businessData) {
        throw new Error(
          "Estabelecimento não encontrado.",
        );
      }

      const form: BusinessForm = {
        name:
          businessData.name ?? "",
        category:
          businessData.category ?? "",
        phone:
          businessData.phone ?? "",
        email:
          businessData.email ?? "",
        address:
          businessData.address ?? "",
        provincia:
          businessData.provincia ?? "",
        municipio:
          businessData.municipio ?? "",
        distrito:
          businessData.distrito ?? "",
        bairro:
          businessData.bairro ?? "",
        rua:
          businessData.rua ?? "",
        latitude:
          businessData.latitude ?? null,
        longitude:
          businessData.longitude ?? null,
        logo:
          businessData.logo ?? "",
      };

      const loadedHours: HoursForm = {
        openingTime:
          businessData.openingTime ?? "",

        closingTime:
          businessData.closingTime ?? "",

        workingDays:
          Array.isArray(
            businessData.workingDays,
          )
            ? businessData.workingDays
            : EMPTY_HOURS.workingDays,

        slotInterval:
          Number(
            businessData.slotInterval,
          ) ||
          EMPTY_HOURS.slotInterval,

        rules:
          businessData.rules ?? "",
      };

      setBusiness(form);
      setSaved(form);

      setHours(loadedHours);
      setSavedHours(loadedHours);

      setCounts(
        businessData._count ?? null,
      );

      setCreatedAt(
        businessData.createdAt ??
          null,
      );

      setUpdatedAt(
        businessData.updatedAt ??
          null,
      );

    } catch (caught) {
      console.error(
        "Erro ao carregar configurações:",
        caught,
      );

      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar as configurações.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /*
  |--------------------------------------------------------------------------
  | ROLE
  |--------------------------------------------------------------------------
  */

  const isOwner =
    role === "OWNER";

  const isEmployee =
    role === "EMPLOYEE";

  /*
  |--------------------------------------------------------------------------
  | ALTERAÇÕES DO OWNER
  |--------------------------------------------------------------------------
  */

  const isDirty =
    isOwner &&
    (JSON.stringify(business) !==
      JSON.stringify(saved) ||
      JSON.stringify(hours) !==
        JSON.stringify(savedHours));

  /*
  |--------------------------------------------------------------------------
  | SALVAR CONFIGURAÇÕES
  |--------------------------------------------------------------------------
  */

  async function handleSave() {
    if (!isOwner) {
      return;
    }

    if (!business.name.trim()) {
      toast.error(
        "O nome do estabelecimento é obrigatório.",
      );

      setTab("dados");

      return;
    }

    if (
      hours.openingTime &&
      hours.closingTime &&
      hours.openingTime >=
        hours.closingTime
    ) {
      toast.error(
        "A hora de fecho tem de ser depois da hora de abertura.",
      );

      setTab("horario");

      return;
    }

    if (
      hours.workingDays.length === 0
    ) {
      toast.error(
        "Escolha pelo menos um dia de funcionamento.",
      );

      setTab("horario");

      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch(
        "/api/business",
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            ...business,
            ...hours,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível salvar.",
        );
      }

      const businessData =
        data.business;

      setBusinessCategory(businessData.category ?? "");

      const form: BusinessForm = {
        name:
          businessData.name ?? "",
        category:
          businessData.category ?? "",
        phone:
          businessData.phone ?? "",
        email:
          businessData.email ?? "",
        address:
          businessData.address ?? "",
        provincia:
          businessData.provincia ?? "",
        municipio:
          businessData.municipio ?? "",
        distrito:
          businessData.distrito ?? "",
        bairro:
          businessData.bairro ?? "",
        rua:
          businessData.rua ?? "",
        latitude:
          businessData.latitude ?? null,
        longitude:
          businessData.longitude ?? null,
        logo:
          businessData.logo ?? "",
      };

      const savedFormHours: HoursForm = {
        openingTime:
          businessData.openingTime ?? "",

        closingTime:
          businessData.closingTime ?? "",

        workingDays:
          Array.isArray(
            businessData.workingDays,
          )
            ? businessData.workingDays
            : EMPTY_HOURS.workingDays,

        slotInterval:
          Number(
            businessData.slotInterval,
          ) ||
          EMPTY_HOURS.slotInterval,

        rules:
          businessData.rules ?? "",
      };

      setBusiness(form);
      setSaved(form);

      setHours(savedFormHours);
      setSavedHours(
        savedFormHours,
      );

      setUpdatedAt(
        businessData.updatedAt ??
          null,
      );


      toast.success(
        "Alterações salvas.",
      );

      // Sem tipo o resto fica guardado na mesma; o espaço só não entra nas categorias da app.
      if (!form.category) {
        toast.warning(
          "Falta escolher o tipo do espaço, para ele aparecer nas categorias da app.",
        );
      }
    } catch (caught) {
      console.error(
        "Erro ao salvar configurações:",
        caught,
      );

      toast.error(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl">

        {/* ERRO */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">
              {error}
            </p>

            <button
              type="button"
              onClick={load}
              className="mt-2 text-sm font-semibold text-red-900 underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* LOADING */}

        {loading ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted)]">
            Carregando configurações...
          </div>
        ) : isEmployee ? (

          /*
          |--------------------------------------------------------------------------
          | FUNCIONÁRIO
          |--------------------------------------------------------------------------
          */

          <ProfileSettings
            profile={profile}
            setProfile={setProfile}
            isOwner={false}
          />

        ) : (

          /*
          |--------------------------------------------------------------------------
          | OWNER
          |--------------------------------------------------------------------------
          */

          <>
            {counts && (
              <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <CountCard
                  label="Clientes"
                  value={counts.clients}
                  icon={
                    <Users size={20} />
                  }
                />

                <CountCard
                  label="Profissionais"
                  value={
                    counts.professionals
                  }
                  icon={
                    <UsersRound
                      size={20}
                    />
                  }
                />

                <CountCard
                  label="Serviços"
                  value={counts.services}
                  icon={
                    <Scissors size={20} />
                  }
                />

                <CountCard
                  label="Agendamentos"
                  value={
                    counts.appointments
                  }
                  icon={
                    <CalendarDays
                      size={20}
                    />
                  }
                />

              </div>
            )}

            {/* TABS */}

            <div className="mb-8 flex gap-1 overflow-x-auto border-b border-[var(--border)]">

              <TabButton
                active={
                  tab === "dados"
                }
                onClick={() =>
                  setTab("dados")
                }
                icon={
                  <Building2
                    size={19}
                  />
                }
                label="Dados do estabelecimento"
              />

              <TabButton
                active={
                  tab === "horario"
                }
                onClick={() =>
                  setTab("horario")
                }
                icon={
                  <Clock size={19} />
                }
                label="Horário e regras"
              />

              <TabButton
                active={
                  tab === "perfil"
                }
                onClick={() =>
                  setTab("perfil")
                }
                icon={
                  <UserRound
                    size={19}
                  />
                }
                label="Perfil"
              />

            </div>

            {tab === "dados" ? (
              <BusinessSettings
                business={business}
                setBusiness={
                  setBusiness
                }
              />
            ) : tab === "horario" ? (
              <BusinessHours
                hours={hours}
                setHours={setHours}
              />
            ) : (
              // A foto guarda-se logo ao ser escolhida; as datas e a barra de baixo são
              // só do estabelecimento.
              <ProfileSettings
                profile={profile}
                setProfile={setProfile}
                isOwner
              />
            )}

            {/* DATAS */}

            {tab !== "perfil" &&
              (createdAt ||
              updatedAt) && (
              <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">

                {createdAt && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Criado em
                    </dt>

                    <dd className="mt-1">
                      {formatDateTime(
                        createdAt,
                      )}
                    </dd>
                  </div>
                )}

                {updatedAt && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Última alteração
                    </dt>

                    <dd className="mt-1">
                      {formatDateTime(
                        updatedAt,
                      )}
                    </dd>
                  </div>
                )}

              </dl>
            )}

            {/* BARRA */}

            {tab !== "perfil" && (
            <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-[var(--border)] bg-[var(--surface)]/95 sm:-mx-6">
              <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

                <div className="text-sm text-[var(--muted)]">
                  {isDirty
                    ? "Há alterações não salvas"
                    : "Tudo salvo"}
                </div>

                <div className="flex items-center gap-3">

                  <button
                    type="button"
                    disabled={
                      !isDirty ||
                      isSaving
                    }
                    onClick={() => {
                      setBusiness(
                        saved,
                      );

                      setHours(
                        savedHours,
                      );
                    }}
                    className="rounded-xl px-5 py-2.5 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    disabled={
                      loading ||
                      isSaving ||
                      !isDirty
                    }
                    onClick={
                      handleSave
                    }
                    className="rounded-xl bg-[var(--foreground)] px-6 py-2.5 text-sm font-medium text-[var(--background)] shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving
                      ? "Salvando..."
                      : "Salvar alterações"}
                  </button>

                </div>
              </div>
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| TAB
|--------------------------------------------------------------------------
*/

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={
        active ? "page" : undefined
      }
      className={`flex shrink-0 items-center gap-2 border-b-2 px-5 pb-3 text-sm font-medium transition ${
        active
          ? "border-primary text-[var(--foreground)]"
          : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/*
|--------------------------------------------------------------------------
| COUNT CARD
|--------------------------------------------------------------------------
*/

function CountCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold">
            {value}
          </p>
        </div>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| DATA
|--------------------------------------------------------------------------
*/

function formatDateTime(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "pt-PT",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );
}