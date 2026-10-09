
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ListChecks,
  Sparkles,
  UsersRound,
  WalletCards,
  XCircle,
} from "lucide-react";

import { ReceivePayment } from "@/components/appointments/ReceivePayment";
import { Appointment } from "@/types/appointment";

/*

 TIPOS

*/

interface ServiceRecord {
  id: string;
  name: string;
  price: number | string;
  active?: boolean;
}

interface FinanceSummary {
  revenueToday: number;
  paidToday: number;
}

/*

| FORMATADORES

*/

function formatPrice(value: number) {
  const safeValue = Number.isFinite(value)
    ? value
    : 0;

  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeValue);
}

function todayKey() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatToday() {
  return new Intl.DateTimeFormat("pt-AO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

/* STATUS*/

const STATUS_STYLES: Record<
  string,
  {
    label: string;
    badge: string;
    icon: typeof CheckCircle2;
  }
> = {
  confirmed: {
    label: "Confirmado",
    badge:
      "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400",
    icon: CheckCircle2,
  },

  pending: {
    label: "Aguardando",
    badge:
      "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400",
    icon: Clock3,
  },

  completed: {
    label: "Concluído",
    badge:
      "bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20 dark:text-blue-400",
    icon: CheckCircle2,
  },

  cancelled: {
    label: "Cancelado",
    badge:
      "bg-red-500/10 text-red-600 ring-1 ring-red-500/20 dark:text-red-400",
    icon: XCircle,
  },

  no_show: {
    label: "Não compareceu",
    badge:
      "bg-gray-500/10 text-gray-500 ring-1 ring-gray-500/20 dark:text-gray-400",
    icon: XCircle,
  },
};

/* DASHBOARD*/

export default function DashboardPage() {
  const router = useRouter();

  const [appointments, setAppointments] =
    useState<Appointment[]>([]);

  const [clientCount, setClientCount] =
    useState(0);

  const [services, setServices] =
    useState<ServiceRecord[]>([]);

  const [finance, setFinance] =
    useState<FinanceSummary>({
      revenueToday: 0,
      paidToday: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [appointmentsLoading, setAppointmentsLoading] =
    useState(true);

  const [financeLoading, setFinanceLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [appointmentsError, setAppointmentsError] =
    useState("");

  /*CARREGAR DADOS*/

  const load = useCallback(async () => {
    setLoading(true);
    setAppointmentsLoading(true);
    setFinanceLoading(true);

    setError("");
    setAppointmentsError("");

    /*APPOINTMENTS   */

    try {
      const response = await fetch(
        "/api/appointments",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const data =
        await response.json().catch(
          () => null,
        );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Erro ao carregar agendamentos (${response.status}).`,
        );
      }

      const list =
        Array.isArray(
          data?.appointments,
        )
          ? data.appointments
          : [];

      setAppointments(list);
    } catch (caught) {
      console.error(
        "Erro ao carregar agendamentos:",
        caught,
      );

      setAppointments([]);

      setAppointmentsError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar os agendamentos.",
      );
    } finally {
      setAppointmentsLoading(false);
    }

    /*
   
    | CLIENTES
  
    */

    try {
      const response = await fetch(
        "/api/clients",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const data =
        await response.json().catch(
          () => null,
        );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Erro ao carregar clientes (${response.status}).`,
        );
      }

      if (Array.isArray(data)) {
        setClientCount(data.length);
      } else if (
        Array.isArray(data?.clients)
      ) {
        setClientCount(
          data.clients.length,
        );
      } else {
        setClientCount(0);
      }
    } catch (caught) {
      console.error(
        "Erro ao carregar clientes:",
        caught,
      );

      setClientCount(0);

      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar os clientes.",
      );
    }

    /*
  
     SERVIÇOS
    
    */

    try {
      const response = await fetch(
        "/api/services",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const data =
        await response.json().catch(
          () => null,
        );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Erro ao carregar serviços (${response.status}).`,
        );
      }

      if (Array.isArray(data)) {
        setServices(data);
      } else if (
        Array.isArray(data?.services)
      ) {
        setServices(data.services);
      } else {
        setServices([]);
      }
    } catch (caught) {
      console.error(
        "Erro ao carregar serviços:",
        caught,
      );

      setServices([]);

      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar os serviços.",
      );
    }

    /*
  
    FINANÇA
    */

    try {
      const response = await fetch(
        "/api/financeiro",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const data =
        await response.json().catch(
          () => null,
        );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Erro ao carregar financeiro (${response.status}).`,
        );
      }

      const revenueToday = Number(
        data?.revenueToday ??
          data?.todayRevenue ??
          data?.summary?.revenueToday ??
          0,
      );

      const paidToday = Number(
        data?.paidToday ??
          data?.paymentsToday ??
          data?.summary?.paidToday ??
          0,
      );

      setFinance({
        revenueToday:
          Number.isFinite(
            revenueToday,
          )
            ? revenueToday
            : 0,

        paidToday:
          Number.isFinite(
            paidToday,
          )
            ? paidToday
            : 0,
      });
    } catch (caught) {
      console.error(
        "Erro ao carregar financeiro:",
        caught,
      );

      setFinance({
        revenueToday: 0,
        paidToday: 0,
      });

      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar o financeiro.",
      );
    } finally {
      setFinanceLoading(false);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function handleAppointmentsChanged() {
      void load();
    }

    function handlePaymentChanged() {
      void load();
    }

    window.addEventListener(
      "appointments:changed",
      handleAppointmentsChanged,
    );

    window.addEventListener(
      "payment:created",
      handlePaymentChanged,
    );

    window.addEventListener(
      "payments:changed",
      handlePaymentChanged,
    );

    return () => {
      window.removeEventListener(
        "appointments:changed",
        handleAppointmentsChanged,
      );

      window.removeEventListener(
        "payment:created",
        handlePaymentChanged,
      );

      window.removeEventListener(
        "payments:changed",
        handlePaymentChanged,
      );
    };
  }, [load]);

  const today = todayKey();

  const metrics = useMemo(() => {
    const completed =
      appointments.filter(
        (item) =>
          item.status === "completed",
      ).length;

    const activeServices =
      services.filter(
        (service) =>
          service.active !== false,
      ).length;

    return {
      clients: clientCount,
      appointments:
        appointments.length,
      completed,
      revenue:
        finance.revenueToday,
      paidCount:
        finance.paidToday,
      activeServices,
    };
  }, [
    appointments,
    clientCount,
    finance,
    services,
  ]);

  const todayAppointments =
    useMemo(() => {
      return appointments
        .filter(
          (item) =>
            item.date === today,
        )
        .sort((a, b) =>
          a.time.localeCompare(
            b.time,
          ),
        );
    }, [appointments, today]);

  const todaySummary =
    useMemo(() => {
      const count = (
        status: string,
      ) =>
        todayAppointments.filter(
          (item) =>
            item.status === status,
        ).length;

      return {
        total:
          todayAppointments.length,

        confirmed:
          count("confirmed"),

        pending:
          count("pending"),

        completed:
          count("completed"),

        cancelled:
          count("cancelled"),
      };
    }, [todayAppointments]);

  return (
    <main className="min-h-full bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
        <div className="space-y-7">

          {/* HERO */}

          <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_40px_rgba(15,23,42,0.045)] dark:shadow-none">

            <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[var(--surface-secondary)] blur-3xl" />

            <div className="pointer-events-none absolute bottom-[-140px] right-32 h-64 w-64 rounded-full bg-[var(--surface-secondary)] blur-3xl" />

            <div className="relative flex flex-col gap-7 px-5 py-6 sm:px-7 sm:py-8 lg:flex-row lg:items-center lg:justify-between lg:px-9">

              <div className="min-w-0">

                <div className="mb-4 flex items-center gap-2.5">

                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--foreground)] text-[var(--background)] shadow-sm">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                    Visão geral
                  </span>

                </div>

                <h1 className="text-2xl font-bold tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl lg:text-[36px]">
                  Home
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-[15px]">
                  Tudo o que precisa para acompanhar
                  a operação do seu negócio em um só lugar.
                </p>

                <div className="mt-4 flex items-center gap-2">

                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                  <p className="text-xs font-medium capitalize text-[var(--muted)]">
                    {formatToday()}
                  </p>

                </div>

              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:shrink-0">

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/appointments",
                    )
                  }
                  className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--foreground)] px-5 text-sm font-semibold text-[var(--background)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 sm:w-auto"
                >
                  <CalendarDays className="h-4 w-4" />

                  <span>
                    Novo Agendamento
                  </span>

                  <ArrowUpRight className="h-4 w-4 opacity-50 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </button>

                <ReceivePayment
                  onPaymentCreated={() => {
                    void load();
                  }}
                />

              </div>

            </div>
          </section>

          {/* ERRO */}

          {error && (
            <div className="flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] text-red-500">
                  <XCircle className="h-4 w-4" />
                </div>

                <div>

                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                    Não foi possível carregar alguns dados.
                  </p>

                  <p className="mt-0.5 text-xs text-red-500/80">
                    {error}
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={() => {
                  void load();
                }}
                className="w-fit rounded-lg bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-red-600 shadow-sm ring-1 ring-red-500/20 transition hover:bg-[var(--surface-secondary)] dark:text-red-400"
              >
                Tentar novamente
              </button>

            </div>
          )}

          {/* INDICADORES */}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <MetricCard
              label="Clientes"
              value={String(
                metrics.clients,
              )}
              description="clientes cadastrados"
              icon={
                <UsersRound className="h-5 w-5" />
              }
              loading={loading}
              href="/clientes"
            />

            <MetricCard
              label="Agendamentos"
              value={String(
                metrics.appointments,
              )}
              description="atendimentos registados"
              icon={
                <CalendarDays className="h-5 w-5" />
              }
              loading={loading}
              href="/appointments"
            />

            <MetricCard
              label="Serviços realizados"
              value={String(
                metrics.completed,
              )}
              description={`${metrics.activeServices} serviços ativos`}
              icon={
                <ListChecks className="h-5 w-5" />
              }
              loading={loading}
              href="/services"
            />

            <MetricCard
              label="Receita recebida"
              value={formatPrice(
                metrics.revenue,
              )}
              description={
                financeLoading
                  ? "A carregar..."
                  : metrics.paidCount === 1
                    ? "1 pagamento recebido hoje"
                    : `${metrics.paidCount} pagamentos recebidos hoje`
              }
              icon={
                <WalletCards className="h-5 w-5" />
              }
              loading={
                loading ||
                financeLoading
              }
              href="/financeiro"
              money
            />

          </section>

          {/* ÁREA PRINCIPAL */}

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">

            {/* AGENDA */}

            <div className="overflow-hidden rounded-[26px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_35px_rgba(15,23,42,0.04)] dark:shadow-none">

              <div className="flex flex-col gap-4 border-b border-[var(--border)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-[var(--muted)]">
                    <CalendarDays className="h-4 w-4" />
                  </div>

                  <div>

                    <h2 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
                      Agenda de hoje
                    </h2>

                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      Próximos atendimentos
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/appointments",
                    )
                  }
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-xs font-semibold text-[var(--foreground)] transition-all hover:bg-[var(--surface-secondary)]"
                >
                  Ver agenda

                  <ChevronRight className="h-3.5 w-3.5" />
                </button>

              </div>

              {appointmentsLoading ? (
                <AgendaSkeleton />
              ) : appointmentsError ? (
                <AppointmentError
                  error={
                    appointmentsError
                  }
                  onRetry={() => {
                    void load();
                  }}
                />
              ) : todayAppointments.length ===
                0 ? (
                <EmptyAgenda
                  onCreate={() =>
                    router.push(
                      "/appointments",
                    )
                  }
                />
              ) : (
                <div className="divide-y divide-[var(--border)]">

                  {todayAppointments.map(
                    (appointment) => (
                      <AppointmentRow
                        key={
                          appointment.id
                        }
                        appointment={
                          appointment
                        }
                      />
                    ),
                  )}

                </div>
              )}

            </div>

            {/* RESUMO DO DIA */}

            <div className="relative overflow-hidden rounded-[26px] border border-[var(--border)] bg-[var(--foreground)] text-[var(--background)] shadow-[0_15px_45px_rgba(15,23,42,0.16)] dark:shadow-none">

              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-current opacity-[0.045] blur-3xl" />

              <div className="pointer-events-none absolute -bottom-24 -left-20 h-60 w-60 rounded-full bg-current opacity-[0.025] blur-3xl" />

              <div className="relative p-6 sm:p-7">

                <div className="flex items-start justify-between">

                  <div>

                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">
                      Hoje
                    </span>

                    <h2 className="mt-2 text-lg font-semibold tracking-tight">
                      Resumo do dia
                    </h2>

                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-current opacity-10">
                    <CalendarDays className="h-4 w-4 opacity-80" />
                  </div>

                </div>

                <div className="mt-9">

                  <p className="text-5xl font-bold tracking-[-0.04em]">
                    {appointmentsLoading
                      ? "—"
                      : todaySummary.total}
                  </p>

                  <p className="mt-2 text-sm opacity-40">
                    atendimentos programados
                  </p>

                </div>

                <div className="my-7 h-px bg-current opacity-10" />

                <div className="space-y-4">

                  <DarkSummaryRow
                    label="Confirmados"
                    value={
                      todaySummary.confirmed
                    }
                    icon={
                      <CheckCircle2 className="h-4 w-4" />
                    }
                    loading={
                      appointmentsLoading
                    }
                  />

                  <DarkSummaryRow
                    label="Aguardando"
                    value={
                      todaySummary.pending
                    }
                    icon={
                      <Clock3 className="h-4 w-4" />
                    }
                    loading={
                      appointmentsLoading
                    }
                  />

                  <DarkSummaryRow
                    label="Concluídos"
                    value={
                      todaySummary.completed
                    }
                    icon={
                      <CheckCircle2 className="h-4 w-4" />
                    }
                    loading={
                      appointmentsLoading
                    }
                  />

                  <DarkSummaryRow
                    label="Cancelados"
                    value={
                      todaySummary.cancelled
                    }
                    icon={
                      <XCircle className="h-4 w-4" />
                    }
                    loading={
                      appointmentsLoading
                    }
                  />

                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/appointments",
                    )
                  }
                  className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--background)] px-4 text-sm font-semibold text-[var(--foreground)] transition-all hover:opacity-90 active:scale-[0.99]"
                >
                  Abrir agenda

                  <ArrowUpRight className="h-4 w-4" />
                </button>

              </div>
            </div>

          </section>

        </div>
      </div>
    </main>
  );
}

/*

| METRIC CARD

*/

function MetricCard({
  label,
  value,
  description,
  icon,
  loading,
  href,
  money = false,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  loading: boolean;
  href: string;
  money?: boolean;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() =>
        router.push(href)
      }
      className="group relative overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5 text-left shadow-[0_6px_25px_rgba(15,23,42,0.035)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-secondary)] hover:shadow-[0_14px_35px_rgba(15,23,42,0.07)] dark:shadow-none"
    >

      <div className="flex items-start justify-between gap-4">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-[var(--muted)] transition-all duration-200 group-hover:bg-[var(--foreground)] group-hover:text-[var(--background)]">
          {icon}
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] opacity-40 transition group-hover:bg-[var(--surface-secondary)] group-hover:opacity-100">
          <ArrowUpRight className="h-4 w-4" />
        </div>

      </div>

      <div className="mt-6">

        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
          {label}
        </p>

        <p
          className={`
            mt-2
            truncate
            font-bold
            tracking-[-0.03em]
            text-[var(--foreground)]
            ${
              money
                ? "text-xl sm:text-2xl"
                : "text-3xl"
            }
          `}
        >
          {loading
            ? "—"
            : value}
        </p>

        <p className="mt-2 text-xs text-[var(--muted)]">
          {description}
        </p>

      </div>

    </button>
  );
}

/* APPOINTMENT ERROR

*/

function AppointmentError({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-12 text-center">

      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
        <XCircle className="h-6 w-6" />
      </div>

      <h3 className="mt-5 text-sm font-semibold tracking-tight text-[var(--foreground)]">
        Não foi possível carregar os agendamentos.
      </h3>

      <p className="mt-1.5 max-w-md text-xs leading-5 text-[var(--muted)]">
        {error}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--foreground)] px-4 py-2.5 text-xs font-semibold text-[var(--background)] shadow-sm transition hover:opacity-90"
      >
        Tentar novamente
      </button>

    </div>
  );
}

/*

| APPOINTMENT ROW

*/

function AppointmentRow({
  appointment,
}: {
  appointment: Appointment;
}) {
  const style =
    STATUS_STYLES[
      appointment.status
    ] ?? STATUS_STYLES.pending;

  const StatusIcon = style.icon;

  return (
    <div className="group flex flex-col gap-4 px-5 py-5 transition-colors hover:bg-[var(--surface-secondary)] sm:flex-row sm:items-center sm:justify-between sm:px-7">

      <div className="flex min-w-0 items-center gap-4">

        <div className="flex h-12 w-[68px] shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--surface-secondary)] ring-1 ring-[var(--border)] transition group-hover:bg-[var(--surface)]">

          <Clock3 className="mb-1 h-3.5 w-3.5 text-[var(--muted)]" />

          <span className="text-xs font-bold tracking-tight text-[var(--foreground)]">
            {appointment.time}
          </span>

        </div>

        <div className="min-w-0">

          <p className="truncate text-sm font-semibold tracking-tight text-[var(--foreground)]">
            {appointment.client}
          </p>

          <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-[var(--muted)]">

            <ListChecks className="h-3.5 w-3.5 shrink-0" />

            <span className="truncate">
              {appointment.service}
            </span>

            <span className="opacity-40">
              •
            </span>

            <span className="truncate">
              {appointment.professional}
            </span>

          </div>

        </div>

      </div>

      <div className="flex items-center justify-between sm:justify-end">

        <span
          className={`
            inline-flex
            items-center
            gap-1.5
            rounded-full
            px-3
            py-1.5
            text-[11px]
            font-semibold
            ${style.badge}
          `}
        >
          <StatusIcon className="h-3.5 w-3.5" />

          {style.label}
        </span>

      </div>

    </div>
  );
}

/*

| DARK SUMMARY ROW

*/

function DarkSummaryRow({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between">

      <div className="flex items-center gap-3">

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-current opacity-10">
          <span className="opacity-70">
            {icon}
          </span>
        </div>

        <span className="text-sm opacity-50">
          {label}
        </span>

      </div>

      <span className="text-sm font-bold">
        {loading
          ? "—"
          : value}
      </span>

    </div>
  );
}

/*

| AGENDA VAZIA

*/

function EmptyAgenda({
  onCreate,
}: {
  onCreate: () => void;
}) {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-12 text-center">

      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-secondary)] text-[var(--muted)]">
        <CalendarDays className="h-6 w-6" />
      </div>

      <h3 className="mt-5 text-sm font-semibold tracking-tight text-[var(--foreground)]">
        Agenda livre
      </h3>

      <p className="mt-1.5 max-w-xs text-xs leading-5 text-[var(--muted)]">
        Ainda não existem atendimentos
        programados para hoje.
      </p>

      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--foreground)] px-4 py-2.5 text-xs font-semibold text-[var(--background)] shadow-sm transition hover:opacity-90"
      >
        <CalendarDays className="h-3.5 w-3.5" />

        Criar agendamento

        <ArrowUpRight className="h-3.5 w-3.5 opacity-50" />
      </button>

    </div>
  );
}

/*

| SKELETON

*/

function AgendaSkeleton() {
  return (
    <div className="divide-y divide-[var(--border)]">

      {Array.from({
        length: 4,
      }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 px-5 py-5 sm:px-7"
        >

          <div className="h-12 w-[68px] animate-pulse rounded-xl bg-[var(--surface-secondary)]" />

          <div className="flex-1 space-y-2">

            <div className="h-4 w-32 animate-pulse rounded bg-[var(--surface-secondary)]" />

            <div className="h-3 w-52 animate-pulse rounded bg-[var(--surface-secondary)]" />

          </div>

          <div className="h-7 w-24 animate-pulse rounded-full bg-[var(--surface-secondary)]" />

        </div>
      ))}

    </div>
  );
}

