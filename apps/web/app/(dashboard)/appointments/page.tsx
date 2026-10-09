"use client";

import { useEffect, useState } from "react";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";

import { useNotifications } from "@/components/notifications/NotificationsProvider";

import { AppointmentList } from "@/components/appointments/AppointmentList";
import { useCategoryExamples } from "@/lib/category-examples";
import { Appointment } from "@/types/appointment";

type Filter = "all" | "confirmed" | "pending" | "completed";

/*
 * Opção de dropdown. `label` é o que aparece na tela e `id` é o que vai para a
 * API — o agendamento passa a referenciar registros existentes por id, em vez
 * de criar cliente/serviço/profissional a partir de texto livre.
 */
type Option = {
  id: string;
  label: string;
};

/* Horário e regras vindos das Configurações. */
type BusinessRules = {
  openingTime: string | null;
  closingTime: string | null;
  workingDays: number[];
  slotInterval: number;
  rules: string | null;
};

const WEEKDAY_NAMES = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

export default function AppointmentsPage() {
  const { notify } = useNotifications();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [activeFilter, setActiveFilter] = useState<Filter>("all");

  const [search, setSearch] = useState("");

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [clientId, setClientId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const examples = useCategoryExamples();

  /*
   * Opções dos dropdowns, vindas do banco.
   */

  const [clients, setClients] = useState<Option[]>([]);

  const [services, setServices] = useState<Option[]>([]);

  const [professionals, setProfessionals] = useState<Option[]>([]);

  const [businessRules, setBusinessRules] = useState<BusinessRules | null>(
    null,
  );

  const [loadingOptions, setLoadingOptions] = useState(false);

  const [optionsError, setOptionsError] = useState("");

  const [formError, setFormError] = useState("");

  const [isCreating, setIsCreating] = useState(false);

  /* BUSCAR*/

  async function loadAppointments() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/appointments", {
        cache: "no-store",
      });

      const text = await response.text();

      let data: {
        appointments?: Appointment[];
        error?: string;
      } = {};

      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error("A API retornou uma resposta inválida.");
        }
      }

      if (!response.ok) {
        throw new Error(data.error || "Erro ao buscar agendamentos.");
      }

      setAppointments(data.appointments ?? []);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error ? error.message : "Erro ao buscar agendamentos.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  /* OPÇÕES DOS DROPDOWNS*/

  async function loadOptions() {
    try {
      setLoadingOptions(true);
      setOptionsError("");

      const [
        clientsResponse,
        professionalsResponse,
        servicesResponse,
        businessResponse,
      ] = await Promise.all([
        fetch("/api/clients", {
          cache: "no-store",
        }),
        fetch("/api/professionals", {
          cache: "no-store",
        }),
        fetch("/api/services", {
          cache: "no-store",
        }),
        fetch("/api/business", {
          cache: "no-store",
        }),
      ]);

      if (
        !clientsResponse.ok ||
        !professionalsResponse.ok ||
        !servicesResponse.ok
      ) {
        throw new Error(
          "Não foi possível carregar clientes, profissionais e serviços.",
        );
      }

      const [clientsData, professionalsData, servicesData] = await Promise.all([
        clientsResponse.json(),
        professionalsResponse.json(),
        servicesResponse.json(),
      ]);

      /*
       * O horário é informativo e não deve impedir o agendamento se falhar a
       * carregar — a API valida de qualquer forma.
       */
      if (businessResponse.ok) {
        const businessData = await businessResponse.json();

        setBusinessRules({
          openingTime: businessData.openingTime ?? null,
          closingTime: businessData.closingTime ?? null,
          workingDays: Array.isArray(businessData.workingDays)
            ? businessData.workingDays
            : [],
          slotInterval: Number(businessData.slotInterval) || 0,
          rules: businessData.rules ?? null,
        });
      }

      setClients(toOptions(clientsData, (item) => item.name));

      /*
       * Profissionais e serviços inativos continuam no banco pelo histórico,
       * mas não devem ser oferecidos para um novo agendamento.
       */

      setProfessionals(
        toOptions(
          professionalsData,
          (item) => item.name,
          (item) => item.active !== false,
        ),
      );

      setServices(
        toOptions(
          servicesData,
          (item) =>
            item.price != null
              ? `${item.name} — ${formatPrice(Number(item.price))}`
              : item.name,
          (item) => item.active !== false,
        ),
      );
    } catch (error) {
      console.error(error);

      setOptionsError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as opções.",
      );
    } finally {
      setLoadingOptions(false);
    }
  }

  /*
   * Recarrega a cada abertura da modal, para refletir cadastros feitos noutro
   * separador sem obrigar a recarregar a página.
   */

  function openModal() {
    setFormError("");
    setIsModalOpen(true);
    loadOptions();
  }

  /* CRIA  */

  async function handleCreateAppointment() {
    setFormError("");

    if (!clientId) {
      setFormError("Selecione o cliente.");
      return;
    }

    if (!serviceId) {
      setFormError("Selecione o serviço.");
      return;
    }

    if (!professionalId) {
      setFormError("Selecione o profissional.");
      return;
    }

    if (!date) {
      setFormError("Selecione a data.");
      return;
    }

    if (!time) {
      setFormError("Selecione o horário.");
      return;
    }

    /*
     * Mesmas regras que a API aplica. Aqui é só para dar resposta imediata —
     * a validação que conta é a do servidor.
     */
    if (businessRules) {
      const weekday = new Date(`${date}T00:00:00`).getDay();

      if (
        businessRules.workingDays.length > 0 &&
        !businessRules.workingDays.includes(weekday)
      ) {
        setFormError(
          `O estabelecimento não abre ${WEEKDAY_NAMES[weekday]}. Escolha outro dia.`,
        );
        return;
      }

      const requested = toMinutes(time);

      if (
        businessRules.openingTime &&
        requested < toMinutes(businessRules.openingTime)
      ) {
        setFormError(`O estabelecimento abre às ${businessRules.openingTime}.`);
        return;
      }

      if (
        businessRules.closingTime &&
        requested >= toMinutes(businessRules.closingTime)
      ) {
        setFormError(
          `O estabelecimento fecha às ${businessRules.closingTime}.`,
        );
        return;
      }

      if (
        businessRules.slotInterval > 0 &&
        requested % businessRules.slotInterval !== 0
      ) {
        setFormError(
          `Os agendamentos são de ${businessRules.slotInterval} em ${businessRules.slotInterval} minutos.`,
        );
        return;
      }
    }

    try {
      setIsCreating(true);

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId,
          serviceId,
          professionalId,
          date,
          time,
          notes: notes.trim(),
        }),
      });

      const text = await response.text();

      let data: {
        appointment?: Appointment;
        error?: string;
      } = {};

      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error("A API retornou uma resposta inválida.");
        }
      }

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível criar o agendamento.");
      }

      /*
       * ADICIONAR DIRETAMENTE NA INTERFACE
       */

      if (data.appointment) {
        setAppointments((current) => [data.appointment!, ...current]);
      } else {
        await loadAppointments();
      }

      /*
       * LIMPAR
       */

      setClientId("");
      setServiceId("");
      setProfessionalId("");
      setDate("");
      setTime("");
      setNotes("");
      setFormError("");

      /*
       * FECHAR
       */

      setIsModalOpen(false);

      const clientName =
        clients.find((item) => item.id === clientId)?.label ?? "Cliente";

      notify({
        kind: "created",
        title: "Agendamento criado",
        description: `${clientName} — ${date} às ${time}`,
      });

      toast.success("Agendamento criado.");
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);

      setFormError(
        error instanceof Error ? error.message : "Erro ao criar agendamento.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  /* EXCLUIR*/

  function handleDeleteAppointment(id: string) {
    setAppointments((current) =>
      current.filter((appointment) => appointment.id !== id),
    );
  }

  /* EDITAR*/

  function handleEditAppointment(updated: Appointment) {
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === updated.id ? updated : appointment,
      ),
    );
  }

  /* FILTROS*/

  const filteredAppointments = appointments.filter((appointment) => {
    const matchesFilter =
      activeFilter === "all" || appointment.status === activeFilter;

    const searchText = search.toLowerCase().trim();

    const matchesSearch =
      !searchText ||
      appointment.client.toLowerCase().includes(searchText) ||
      appointment.service.toLowerCase().includes(searchText) ||
      appointment.professional.toLowerCase().includes(searchText);

    return matchesFilter && matchesSearch;
  });

  /*CONTADORES*/

  const confirmedCount = appointments.filter(
    (item) => item.status === "confirmed",
  ).length;

  const pendingCount = appointments.filter(
    (item) => item.status === "pending",
  ).length;

  const completedCount = appointments.filter(
    (item) => item.status === "completed",
  ).length;

  const filters = [
    {
      value: "all" as const,
      label: "Todos",
      count: appointments.length,
    },
    {
      value: "confirmed" as const,
      label: "Confirmados",
      count: confirmedCount,
    },
    {
      value: "pending" as const,
      label: "Aguardando",
      count: pendingCount,
    },
    {
      value: "completed" as const,
      label: "Concluídos",
      count: completedCount,
    },
  ];

  return (
    <div className="min-h-full space-y-8">
      {/* HEADER */}

      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
            Agenda
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
            Organize os seus atendimentos, acompanhe os profissionais e mantenha
            a agenda sempre sob controlo.
          </p>
        </div>

        <button
          type="button"
          onClick={openModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
        >
          <Plus className="h-4 w-4" />
          Novo Agendamento
        </button>
      </section>

      {/* MÉTRICAS */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          title="Total"
          value={appointments.length}
          description="Agendamentos registados"
        />

        <Metric
          title="Confirmados"
          value={confirmedCount}
          description="Atendimentos confirmados"
        />

        <Metric
          title="Aguardando"
          value={pendingCount}
          description="Aguardam confirmação"
        />

        <Metric
          title="Concluídos"
          value={completedCount}
          description="Atendimentos concluídos"
        />
      </section>

      {/* FILTROS */}

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const active = activeFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium ${
                    active
                      ? "bg-gray-950 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {filter.label}

                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                      active
                        ? "bg-white/15 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full xl:max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar cliente, serviço..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>
      </section>

      {/* ERRO */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* RESULTADOS */}

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-950">Agendamentos</h2>

          <p className="mt-1 text-sm text-gray-500">
            {filteredAppointments.length} resultado
            {filteredAppointments.length === 1 ? "" : "s"} encontrado
            {filteredAppointments.length === 1 ? "" : "s"}
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-gray-500">Carregando agendamentos...</p>
          </div>
        ) : (
          <AppointmentList
            appointments={filteredAppointments}
            onDelete={handleDeleteAppointment}
            onEdit={handleEditAppointment}
          />
        )}
      </section>

      {/* MODAL CRIAR */}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!isCreating) {
              setIsModalOpen(false);
            }
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-gray-100 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                Novo atendimento
              </p>

              <h2 className="mt-1 text-xl font-semibold text-gray-950">
                Novo Agendamento
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Preencha os dados do atendimento.
              </p>
            </div>

            <div className="space-y-5 p-6">
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-800">
                    Não foi possível criar
                  </p>

                  <p className="mt-1 text-sm text-red-700">{formError}</p>
                </div>
              )}

              {optionsError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm text-amber-800">{optionsError}</p>

                  <button
                    type="button"
                    onClick={loadOptions}
                    className="mt-2 text-sm font-semibold text-amber-900 underline"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              <SelectField
                label="Cliente"
                value={clientId}
                onChange={setClientId}
                options={clients}
                loading={loadingOptions}
                placeholder="Selecione o cliente"
                emptyHint="Nenhum cliente cadastrado. Cadastre um em Clientes."
              />

              <SelectField
                label="Serviço"
                value={serviceId}
                onChange={setServiceId}
                options={services}
                loading={loadingOptions}
                placeholder="Selecione o serviço"
                emptyHint="Nenhum serviço ativo. Cadastre um em Serviços."
              />

              <SelectField
                label="Profissional"
                value={professionalId}
                onChange={setProfessionalId}
                options={professionals}
                loading={loadingOptions}
                placeholder="Selecione o profissional"
                emptyHint="Nenhum profissional ativo. Cadastre um em Equipe."
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Data"
                  type="date"
                  value={date}
                  onChange={setDate}
                />

                <Field
                  label="Horário"
                  type="time"
                  value={time}
                  onChange={setTime}
                  min={businessRules?.openingTime ?? undefined}
                  max={businessRules?.closingTime ?? undefined}
                  step={
                    businessRules?.slotInterval
                      ? businessRules.slotInterval * 60
                      : undefined
                  }
                />
              </div>

              {/* HORÁRIO E REGRAS DO ESTABELECIMENTO */}
              {businessRules &&
                (businessRules.openingTime ||
                  businessRules.workingDays.length > 0 ||
                  businessRules.rules) && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Funcionamento
                    </p>

                    {businessRules.openingTime && businessRules.closingTime && (
                      <p className="mt-2 text-sm text-[var(--foreground)]">
                        Aberto das {businessRules.openingTime} às{" "}
                        {businessRules.closingTime}
                        {businessRules.slotInterval > 0 && (
                          <>
                            , de {businessRules.slotInterval} em{" "}
                            {businessRules.slotInterval} minutos
                          </>
                        )}
                      </p>
                    )}

                    {businessRules.workingDays.length > 0 && (
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Dias:{" "}
                        {businessRules.workingDays
                          .map((day) => WEEKDAY_SHORT[day])
                          .join(", ")}
                      </p>
                    )}

                    {businessRules.rules && (
                      <p className="mt-2 whitespace-pre-line text-sm text-[var(--muted)]">
                        {businessRules.rules}
                      </p>
                    )}
                  </div>
                )}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-800">
                  Observações
                </label>

                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder={examples.appointmentNotes}
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isCreating}
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isCreating}
                onClick={handleCreateAppointment}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? "Criando..." : "Criar Agendamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/*

| MÉTRICA

*/

function Metric({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>

      <p className="mt-3 text-3xl font-bold text-gray-950">{value}</p>

      <p className="mt-4 text-xs text-gray-400">{description}</p>
    </div>
  );
}

/*

| OPÇÕES

*/

type ApiRecord = {
  id?: unknown;
  name?: unknown;
  price?: unknown;
  active?: unknown;
};

/*
 * As três APIs devolvem arrays de registos do Prisma. Normalizamos para
 * { id, label }, descartando o que não tem id ou nome utilizável — assim um
 * registo estranho no banco não quebra a modal inteira.
 */
function toOptions(
  data: unknown,
  toLabel: (item: { name: string; price?: unknown }) => string,
  filter?: (item: { active?: unknown }) => boolean,
): Option[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .filter((item): item is ApiRecord => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const record = item as ApiRecord;

      if (
        typeof record.id !== "string" ||
        typeof record.name !== "string" ||
        !record.name.trim()
      ) {
        return false;
      }

      return filter ? filter(record) : true;
    })
    .map((item) => ({
      id: item.id as string,
      label: toLabel({
        name: item.name as string,
        price: item.price,
      }),
    }));
}

function formatPrice(price: number) {
  if (!Number.isFinite(price)) {
    return "";
  }

  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    minimumFractionDigits: 2,
  }).format(price);
}

/*

| DROPDOWN

*/

function SelectField({
  label,
  value,
  onChange,
  options,
  loading,
  placeholder,
  emptyHint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  loading: boolean;
  placeholder: string;
  emptyHint: string;
}) {
  const isEmpty = !loading && options.length === 0;

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-800">
        {label}
      </label>

      <select
        value={value}
        disabled={loading || isEmpty}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
      >
        <option value="">
          {loading
            ? "Carregando..."
            : isEmpty
              ? "Nada disponível"
              : placeholder}
        </option>

        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>

      {isEmpty && <p className="mt-2 text-xs text-amber-700">{emptyHint}</p>}
    </div>
  );
}

/*

| CAMPO

*/

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: string;
  max?: string;
  step?: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-800">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      />
    </div>
  );
}
