"use client";

import { useMemo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { DayProgress } from "@/components/dashboard/DayProgress";
import { HomeHero } from "@/components/dashboard/HomeHero";
import { HomeKpis } from "@/components/dashboard/HomeKpis";
import { RatingCard } from "@/components/dashboard/RatingCard";
import { TodayAgenda } from "@/components/dashboard/TodayAgenda";
import { WeekOutlook } from "@/components/dashboard/WeekOutlook";
import { countByStatus, dateKey, isOpen, minutesUntil, timeKey, upcomingDays } from "@/components/dashboard/home-utils";
import { useHomeData, useNow } from "@/components/dashboard/useHomeData";

/*
 * Home do painel: o dia do profissional num relance — próximo atendimento, indicadores,
 * agenda de hoje em linha do tempo, progresso do dia e os próximos 7 dias.
 */

export default function DashboardPage() {
  const { data, loading, error, appointmentsError, updatedAt, reload } = useHomeData();
  const now = useNow();
  const today = dateKey(now);

  const todayAppointments = useMemo(
    () => data.appointments.filter((item) => item.date === today).sort((a, b) => a.time.localeCompare(b.time)),
    [data.appointments, today],
  );

  const counts = useMemo(() => countByStatus(todayAppointments), [todayAppointments]);

  const derived = useMemo(() => {
    const planned = todayAppointments.filter((item) => item.status !== "cancelled");

    return {
      todayCount: planned.length,
      expectedToday: planned.reduce((sum, item) => sum + Number(item.price ?? 0), 0),
      // Pendentes de hoje em diante (os de dias passados já não se confirmam).
      pendingUpcoming: data.appointments.filter((item) => item.status === "pending" && item.date >= today).length,
      // O próximo é o primeiro em aberto que ainda não passou mais de 15 minutos da hora.
      next: todayAppointments.find((item) => isOpen(item) && minutesUntil(item, now) > -15) ?? null,
    };
  }, [data.appointments, todayAppointments, today, now]);

  const week = useMemo(() => upcomingDays(data.appointments, now), [data.appointments, now]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <HomeHero
        userName={data.userName}
        now={now}
        loading={loading}
        todayCount={derived.todayCount}
        pendingCount={counts.pending}
        next={derived.next}
        onPaymentCreated={() => void reload()}
      />

      {error && (
        <div className="finance-fade-in flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-[22px] w-[22px] shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Alguns dados não foram carregados.</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void reload()}
            className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-secondary)]"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
        </div>
      )}

      <HomeKpis
        loading={loading}
        revenueToday={data.revenueToday}
        paidToday={data.paidToday}
        expectedToday={derived.expectedToday}
        todayCount={derived.todayCount}
        completedToday={counts.completed}
        pendingUpcoming={derived.pendingUpcoming}
        clientCount={data.clientCount}
        activeServices={data.activeServices}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <TodayAgenda
          appointments={todayAppointments}
          now={now}
          loading={loading}
          error={appointmentsError}
          onRetry={() => void reload()}
        />

        <div className="flex flex-col gap-6">
          <DayProgress counts={counts} loading={loading} />
          <WeekOutlook days={week} loading={loading} />
          <RatingCard />
        </div>
      </div>

      {updatedAt && (
        <p className="flex items-center justify-center gap-1.5 pb-2 text-[11px] text-[var(--muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Atualizado às {timeKey(updatedAt)} · os dados atualizam-se sozinhos quando a agenda muda
        </p>
      )}
    </div>
  );
}
