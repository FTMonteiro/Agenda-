"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Appointment } from "@/types/appointment";

/*
 * Os dados da Home, pedidos em paralelo. Cada bloco falha sozinho: se o financeiro
 * não responder, a agenda continua a aparecer.
 */

export type HomeData = {
  userName: string;
  appointments: Appointment[];
  clientCount: number;
  activeServices: number;
  revenueToday: number;
  paidToday: number;
};

const EMPTY: HomeData = {
  userName: "",
  appointments: [],
  clientCount: 0,
  activeServices: 0,
  revenueToday: 0,
  paidToday: 0,
};

async function getJson(url: string, label: string) {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Erro ao carregar ${label} (${response.status}).`);
  }
  return data;
}

function listFrom(data: unknown, key: string): unknown[] {
  if (Array.isArray(data)) return data;
  const nested = (data as Record<string, unknown> | null)?.[key];
  return Array.isArray(nested) ? nested : [];
}

function finite(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

type HomeResult = {
  data: HomeData;
  error: string;
  appointmentsError: string;
};

async function fetchHome(): Promise<HomeResult> {
  const [me, appointments, clients, services, finance] = await Promise.allSettled([
    getJson("/api/auth/me", "o utilizador"),
    getJson("/api/appointments", "agendamentos"),
    getJson("/api/clients", "clientes"),
    getJson("/api/services", "serviços"),
    getJson("/api/financeiro", "financeiro"),
  ]);

  const data = { ...EMPTY };

  if (me.status === "fulfilled") data.userName = me.value?.user?.name ?? "";

  if (appointments.status === "fulfilled") {
    data.appointments = listFrom(appointments.value, "appointments") as Appointment[];
  }

  if (clients.status === "fulfilled") data.clientCount = listFrom(clients.value, "clients").length;

  if (services.status === "fulfilled") {
    data.activeServices = (listFrom(services.value, "services") as { active?: boolean }[]).filter(
      (service) => service.active !== false,
    ).length;
  }

  if (finance.status === "fulfilled") {
    const value = finance.value;
    data.revenueToday = finite(value?.revenueToday ?? value?.summary?.todayRevenue);
    data.paidToday = finite(value?.paidToday ?? value?.summary?.todayPayments);
  }

  const failed = [clients, services, finance].find((result) => result.status === "rejected");

  return {
    data,
    appointmentsError:
      appointments.status === "rejected"
        ? (appointments.reason?.message ?? "Não foi possível carregar os agendamentos.")
        : "",
    error:
      failed?.status === "rejected"
        ? (failed.reason?.message ?? "Não foi possível carregar alguns dados.")
        : "",
  };
}

export function useHomeData() {
  const [result, setResult] = useState<HomeResult>({ data: EMPTY, error: "", appointmentsError: "" });
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const mounted = useRef(true);

  const apply = useCallback((next: HomeResult) => {
    if (!mounted.current) return;
    setResult(next);
    setUpdatedAt(new Date());
    setLoading(false);
  }, []);

  const reload = useCallback(() => fetchHome().then(apply), [apply]);

  useEffect(() => {
    mounted.current = true;
    fetchHome().then(apply);

    const onChange = () => void reload();
    const events = ["appointments:changed", "payment:created", "payments:changed"];
    events.forEach((name) => window.addEventListener(name, onChange));

    return () => {
      mounted.current = false;
      events.forEach((name) => window.removeEventListener(name, onChange));
    };
  }, [apply, reload]);

  return { ...result, loading, updatedAt, reload };
}

// A hora atual, atualizada a cada 30 segundos (relógio, contagem para o próximo atendimento).
export function useNow(interval = 30_000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), interval);
    return () => window.clearInterval(timer);
  }, [interval]);

  return now;
}
