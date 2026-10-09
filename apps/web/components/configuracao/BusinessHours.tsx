"use client";

import { Clock, CalendarDays, ScrollText } from "lucide-react";

export interface HoursForm {
  openingTime: string;
  closingTime: string;
  workingDays: number[];
  slotInterval: number;
  rules: string;
}

interface BusinessHoursProps {
  hours: HoursForm;
  setHours: React.Dispatch<
    React.SetStateAction<HoursForm>
  >;
}

/* Índices do getDay() do JavaScript: 0 = domingo. */
const DAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

const INTERVALS = [
  15, 20, 30, 45, 60,
];

export function BusinessHours({
  hours,
  setHours,
}: BusinessHoursProps) {
  function toggleDay(day: number) {
    setHours((current) => ({
      ...current,
      workingDays:
        current.workingDays.includes(day)
          ? current.workingDays.filter(
              (item) => item !== day,
            )
          : [
              ...current.workingDays,
              day,
            ].sort((a, b) => a - b),
    }));
  }

  const invalidRange =
    hours.openingTime &&
    hours.closingTime &&
    hours.openingTime >=
      hours.closingTime;

  return (
    <div className="space-y-6">
      {/* HORÁRIO */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-6 py-5">
          <Clock
            size={18}
            className="text-[var(--muted)]"
          />

          <div>
            <h2 className="text-lg font-semibold">
              Horário de funcionamento
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Define os horários aceites ao criar um agendamento.
            </p>
          </div>
        </div>

        <div className="grid gap-5 p-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="openingTime"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
            >
              Abertura
            </label>

            <input
              id="openingTime"
              type="time"
              value={hours.openingTime}
              onChange={(event) =>
                setHours((current) => ({
                  ...current,
                  openingTime:
                    event.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div>
            <label
              htmlFor="closingTime"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
            >
              Fecho
            </label>

            <input
              id="closingTime"
              type="time"
              value={hours.closingTime}
              onChange={(event) =>
                setHours((current) => ({
                  ...current,
                  closingTime:
                    event.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          {invalidRange && (
            <p className="text-sm text-red-600 sm:col-span-2">
              A hora de fecho tem de ser depois da hora de abertura.
            </p>
          )}

          <div className="sm:col-span-2">
            <label
              htmlFor="slotInterval"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
            >
              Intervalo entre agendamentos
            </label>

            <select
              id="slotInterval"
              value={hours.slotInterval}
              onChange={(event) =>
                setHours((current) => ({
                  ...current,
                  slotInterval: Number(
                    event.target.value,
                  ),
                }))
              }
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 sm:max-w-xs"
            >
              {INTERVALS.map(
                (interval) => (
                  <option
                    key={interval}
                    value={interval}
                  >
                    {interval} minutos
                  </option>
                ),
              )}
            </select>

            <p className="mt-2 text-xs text-[var(--muted)]">
              Os horários dos agendamentos têm de cair neste intervalo. Com 30
              minutos, 14:00 e 14:30 são aceites, 14:10 não.
            </p>
          </div>
        </div>
      </div>

      {/* DIAS */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-6 py-5">
          <CalendarDays
            size={18}
            className="text-[var(--muted)]"
          />

          <div>
            <h2 className="text-lg font-semibold">
              Dias de funcionamento
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Nos dias desligados não é possível agendar.
            </p>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const active =
                hours.workingDays.includes(
                  day.value,
                );

              return (
                <button
                  key={day.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    toggleDay(day.value)
                  }
                  className={`h-11 min-w-16 rounded-xl border px-4 text-sm font-medium transition ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-secondary)]"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>

          {hours.workingDays.length ===
            0 && (
            <p className="mt-3 text-sm text-red-600">
              Escolha pelo menos um dia, senão não será possível agendar.
            </p>
          )}
        </div>
      </div>

      {/* REGRAS */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-6 py-5">
          <ScrollText
            size={18}
            className="text-[var(--muted)]"
          />

          <div>
            <h2 className="text-lg font-semibold">
              Regras do estabelecimento
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Aparecem na modal de novo agendamento.
            </p>
          </div>
        </div>

        <div className="p-6">
          <label
            htmlFor="rules"
            className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
          >
            Regras
          </label>

          <textarea
            id="rules"
            rows={5}
            value={hours.rules}
            onChange={(event) =>
              setHours((current) => ({
                ...current,
                rules: event.target
                  .value,
              }))
            }
            placeholder={
              "Ex.: Tolerância de 10 minutos de atraso.\nCancelamentos com 24h de antecedência."
            }
            className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>
      </div>
    </div>
  );
}
