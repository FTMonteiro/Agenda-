"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { toast } from "sonner";

import {
  AlertCircle,
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Inbox,
  Landmark,
  RefreshCw,
  Search,
  Smartphone,
  UserRound,
  Wallet,
  X,
} from "lucide-react";

interface PaymentAppointment {
  id: string;
  date: string;

  client: {
    id: string;
    name: string;
  };

  professional: {
    id: string;
    name: string;
  };

  service: {
    id: string;
    name: string;
    price: number | string | null;
    duration: number;
  };

  payment: null;

  paymentAmount?: number | string | null;
  paymentMethod?: string | null;
}

type PaymentMethod =
  | "CASH"
  | "CARD"
  | "TRANSFER"
  | "MOBILE_MONEY";

interface ReceivePaymentProps {
  onPaymentCreated?: () => void;
}

/*
 * As cores usam as variáveis do tema (--surface, --border, ...)
 * em vez de bg-white / text-gray-*: o globals.css força essas
 * classes dentro de modais no modo escuro com !important.
 */

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    value: "CASH",
    label: "Dinheiro",
    description: "Em espécie",
    icon: <Banknote className="h-5 w-5" />,
  },
  {
    value: "CARD",
    label: "Cartão",
    description: "TPA / bancário",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    value: "TRANSFER",
    label: "Transferência",
    description: "Bancária",
    icon: <Landmark className="h-5 w-5" />,
  },
  {
    value: "MOBILE_MONEY",
    label: "Multicaixa Express",
    description: "Pagamento móvel",
    icon: <Smartphone className="h-5 w-5" />,
  },
];

const ANIMATION_MS = 200;

function getNumericPrice(
  value: number | string | null | undefined,
): number {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

function formatPrice(
  value: number | string | null | undefined,
): string {
  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(getNumericPrice(value));
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-AO", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatTime(value: string): string {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-AO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/* Antes da hora marcada não se recebe o pagamento (a API também o recusa). */
function isBeforeTime(value: string, now: number): boolean {
  const time = new Date(value).getTime();

  return !Number.isNaN(time) && now < time;
}

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function ReceivePayment({
  onPaymentCreated,
}: ReceivePaymentProps) {
  const [isOpen, setIsOpen] = useState(false);

  /* Controla a animação de entrada/saída. */
  const [isVisible, setIsVisible] =
    useState(false);

  const [appointments, setAppointments] =
    useState<PaymentAppointment[]>([]);

  const [
    selectedAppointmentId,
    setSelectedAppointmentId,
  ] = useState("");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("CASH");

  const [search, setSearch] = useState("");

  /* Valor entregue pelo cliente (só para dinheiro). */
  const [amountGiven, setAmountGiven] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] = useState("");

  const [isSuccess, setIsSuccess] =
    useState(false);

  const closeTimer = useRef<number | undefined>(undefined);

  /* Hora atual, para saber que agendamentos já chegaram à hora marcada. Com a janela
     aberta avança sozinha, e um agendamento desbloqueia no minuto em que começa. */
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isOpen) return;

    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 15_000);

    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [isOpen]);

  /* CARREGAR AGENDAMENTOS */

  async function loadAppointments() {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(
        "/api/appointments/payments",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível carregar os agendamentos.",
        );
      }

      setAppointments(
        Array.isArray(data?.appointments)
          ? data.appointments
          : [],
      );
    } catch (err) {
      console.error(
        "Erro ao carregar pagamentos:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar os agendamentos.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setError("");
    setIsSuccess(false);
    setSearch("");
    setAmountGiven("");
    setSelectedAppointmentId("");
    setPaymentMethod("CASH");
  }

  /* ABRIR / FECHAR */

  function handleOpen() {
    window.clearTimeout(closeTimer.current);

    resetForm();
    setIsOpen(true);

    loadAppointments();
  }

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    setIsVisible(false);

    closeTimer.current = window.setTimeout(() => {
      setIsOpen(false);
      resetForm();
    }, ANIMATION_MS);
  }

  /* Animação de entrada, Esc para fechar e bloqueio do scroll. */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frame = requestAnimationFrame(() =>
      setIsVisible(true),
    );

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow =
        previousOverflow;
      window.removeEventListener(
        "keydown",
        onKeyDown,
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isSubmitting]);

  useEffect(
    () => () =>
      window.clearTimeout(closeTimer.current),
    [],
  );

  /* DADOS DERIVADOS */

  const filteredAppointments = useMemo(() => {
    const term = normalize(search.trim());

    if (!term) {
      return appointments;
    }

    return appointments.filter((appointment) =>
      normalize(
        `${appointment.client.name} ${appointment.service.name} ${appointment.professional.name}`,
      ).includes(term),
    );
  }, [appointments, search]);

  const selectedAppointment = useMemo(
    () =>
      appointments.find(
        (appointment) =>
          appointment.id ===
          selectedAppointmentId,
      ) ?? null,
    [appointments, selectedAppointmentId],
  );

  const selectedPrice = getNumericPrice(
    selectedAppointment?.service?.price,
  );

  const givenValue = Number(amountGiven) || 0;

  const change = givenValue - selectedPrice;

  const isCashShort =
    paymentMethod === "CASH" &&
    givenValue > 0 &&
    change < 0;

  const canSubmit =
    !isSubmitting &&
    !!selectedAppointment &&
    !isBeforeTime(selectedAppointment.date, now) &&
    selectedPrice > 0 &&
    !isCashShort;

  /* ALTERAÇÕES */

  function handleAppointmentChange(
    appointmentId: string,
  ) {
    setSelectedAppointmentId(appointmentId);
    setAmountGiven("");
    setError("");
  }

  function handlePaymentMethodChange(
    method: PaymentMethod,
  ) {
    setPaymentMethod(method);
    setAmountGiven("");
    setError("");
  }

  /*
   * REGISTRAR PAGAMENTO
   *
   * Apenas faz POST para a API: não abre nova aba,
   * janela, recibo ou outra página.
   */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (!selectedAppointment) {
      setError("Selecione um agendamento.");
      return;
    }

    if (selectedPrice <= 0) {
      setError(
        `O serviço "${selectedAppointment.service.name}" está sem preço. Defina o preço em Serviços antes de receber o pagamento.`,
      );
      return;
    }

    if (isCashShort) {
      setError(
        "O valor entregue é inferior ao total a receber.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();

      formData.append(
        "appointmentId",
        selectedAppointment.id,
      );

      formData.append("method", paymentMethod);

      const response = await fetch(
        "/api/appointments/payments",
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível registrar o pagamento.",
        );
      }

      setIsSuccess(true);

      setAppointments((current) =>
        current.filter(
          (appointment) =>
            appointment.id !==
            selectedAppointment.id,
        ),
      );

      toast.success(
        `Pagamento de ${formatPrice(
          selectedPrice,
        )} recebido com sucesso.`,
      );

      onPaymentCreated?.();

      window.dispatchEvent(
        new Event("appointments:changed"),
      );

      closeTimer.current = window.setTimeout(
        () => {
          setIsVisible(false);

          closeTimer.current = window.setTimeout(
            () => {
              setIsOpen(false);
              resetForm();
            },
            ANIMATION_MS,
          );
        },
        1200,
      );
    } catch (err) {
      console.error(
        "Erro ao registrar pagamento:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível registrar o pagamento.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  /* INTERFACE */

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="group inline-flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:translate-y-0 sm:w-auto"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white transition group-hover:scale-105">
          <CreditCard className="h-4 w-4" />
        </span>
        Receber Pagamento
      </button>

      {isOpen && (
        <div
          className={`fixed inset-0 z-[9999] flex items-end justify-center bg-black/55 backdrop-blur-sm transition-opacity duration-200 sm:items-center sm:p-4 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleClose();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="receive-payment-title"
            className={`flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-[0_30px_100px_rgba(0,0,0,0.25)] transition-all duration-200 ease-out sm:rounded-3xl ${
              isVisible
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-6 scale-[0.98] opacity-0"
            }`}
          >
            {isSuccess ? (
              <SuccessView
                amount={formatPrice(selectedPrice)}
                method={
                  PAYMENT_METHODS.find(
                    (item) =>
                      item.value === paymentMethod,
                  )?.label ?? ""
                }
                change={
                  paymentMethod === "CASH" &&
                  change > 0
                    ? formatPrice(change)
                    : null
                }
              />
            ) : (
              <form
                onSubmit={handleSubmit}
                className="flex min-h-0 flex-1 flex-col"
              >
                {/* HEADER */}

                <header className="flex shrink-0 items-start justify-between gap-4 px-6 pb-4 pt-6">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Wallet className="h-5 w-5" />
                    </div>

                    <div>
                      <h2
                        id="receive-payment-title"
                        className="text-lg font-semibold tracking-tight"
                      >
                        Receber pagamento
                      </h2>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        Selecione o atendimento e o
                        método de pagamento.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    aria-label="Fechar"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)] disabled:opacity-40"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </header>

                {/* CONTEÚDO */}

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 pb-6">
                  {error && (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="flex-1">
                        {error}
                      </span>
                      {appointments.length === 0 &&
                        !isLoading && (
                          <button
                            type="button"
                            onClick={loadAppointments}
                            className="inline-flex items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Tentar novamente
                          </button>
                        )}
                    </div>
                  )}

                  {/* ATENDIMENTO */}

                  <section>
                    <SectionTitle
                      title="Atendimento"
                      aside={
                        !isLoading &&
                        appointments.length > 0
                          ? `${appointments.length} por pagar`
                          : undefined
                      }
                    />

                    {appointments.length > 3 && (
                      <FieldShell
                        icon={
                          <Search className="h-4 w-4" />
                        }
                        className="mb-3"
                      >
                        <input
                          type="search"
                          value={search}
                          onChange={(event) =>
                            setSearch(
                              event.target.value,
                            )
                          }
                          placeholder="Procurar cliente, serviço ou profissional"
                          className="h-11 w-full bg-transparent pl-10 pr-4 text-sm outline-none placeholder:text-[var(--muted)]"
                        />
                      </FieldShell>
                    )}

                    <div
                      role="radiogroup"
                      aria-label="Atendimento"
                      className="max-h-64 space-y-2 overflow-y-auto pr-0.5"
                    >
                      {isLoading ? (
                        Array.from({ length: 3 }).map(
                          (_, index) => (
                            <div
                              key={index}
                              className="h-[68px] animate-pulse rounded-2xl bg-[var(--surface-secondary)]"
                            />
                          ),
                        )
                      ) : filteredAppointments.length ===
                        0 ? (
                        <EmptyState
                          searching={!!search.trim()}
                        />
                      ) : (
                        filteredAppointments.map(
                          (appointment) => (
                            <AppointmentOption
                              key={appointment.id}
                              appointment={appointment}
                              selected={
                                appointment.id ===
                                selectedAppointmentId
                              }
                              disabled={isSubmitting}
                              tooEarly={isBeforeTime(
                                appointment.date,
                                now,
                              )}
                              onSelect={() =>
                                handleAppointmentChange(
                                  appointment.id,
                                )
                              }
                            />
                          ),
                        )
                      )}
                    </div>
                  </section>

                  {/* MÉTODO */}

                  <section>
                    <SectionTitle title="Método de pagamento" />

                    <div
                      role="radiogroup"
                      aria-label="Método de pagamento"
                      className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
                    >
                      {PAYMENT_METHODS.map(
                        (method) => (
                          <PaymentMethodCard
                            key={method.value}
                            selected={
                              paymentMethod ===
                              method.value
                            }
                            disabled={isSubmitting}
                            onClick={() =>
                              handlePaymentMethodChange(
                                method.value,
                              )
                            }
                            icon={method.icon}
                            title={method.label}
                            description={
                              method.description
                            }
                          />
                        ),
                      )}
                    </div>
                  </section>

                  {/* TROCO (DINHEIRO) */}

                  {paymentMethod === "CASH" &&
                    selectedPrice > 0 && (
                      <section className="animate-[fadeUp_0.25s_ease-out]">
                        <SectionTitle
                          title="Valor entregue"
                          aside="Opcional"
                        />

                        <div className="grid gap-3 sm:grid-cols-2">
                          <FieldShell
                            icon={
                              <span className="text-[11px] font-semibold">
                                Kz
                              </span>
                            }
                            invalid={isCashShort}
                          >
                            <input
                              inputMode="numeric"
                              value={amountGiven}
                              onChange={(event) =>
                                setAmountGiven(
                                  event.target.value.replace(
                                    /\D/g,
                                    "",
                                  ),
                                )
                              }
                              placeholder={String(
                                selectedPrice,
                              )}
                              disabled={isSubmitting}
                              className="h-11 w-full bg-transparent pl-10 pr-4 text-sm font-medium tabular-nums outline-none placeholder:text-[var(--muted)]"
                            />
                          </FieldShell>

                          <div
                            className={`flex h-11 items-center justify-between rounded-xl px-4 text-sm transition-colors ${
                              isCashShort
                                ? "bg-red-500/10 text-red-600 dark:text-red-300"
                                : "bg-[var(--surface-secondary)]"
                            }`}
                          >
                            <span className="text-[var(--muted)]">
                              {isCashShort
                                ? "Em falta"
                                : "Troco"}
                            </span>
                            <span className="font-semibold tabular-nums">
                              {givenValue > 0
                                ? formatPrice(
                                    Math.abs(change),
                                  )
                                : "—"}
                            </span>
                          </div>
                        </div>
                      </section>
                    )}
                </div>

                {/* RODAPÉ */}

                <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--surface-secondary)]/60 px-6 py-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                        Total a receber
                      </p>
                      <p
                        key={selectedPrice}
                        className="animate-[fadeUp_0.25s_ease-out] text-2xl font-bold tabular-nums tracking-tight"
                      >
                        {selectedAppointment
                          ? formatPrice(selectedPrice)
                          : "—"}
                      </p>
                    </div>

                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="h-11 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-semibold transition hover:bg-[var(--surface-secondary)] disabled:opacity-50 sm:flex-none"
                      >
                        Cancelar
                      </button>

                      <button
                        type="submit"
                        disabled={!canSubmit}
                        className="inline-flex h-11 flex-[2] items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm shadow-primary/30 transition-all hover:-translate-y-0.5 hover:brightness-110 hover:shadow-md active:translate-y-0 disabled:pointer-events-none disabled:opacity-40 sm:flex-none"
                      >
                        {isSubmitting ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            A registar...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Confirmar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </footer>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* TÍTULO DE SECÇÃO */

function SectionTitle({
  title,
  aside,
}: {
  title: string;
  aside?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold">
        {title}
      </h3>

      {aside && (
        <span className="rounded-full bg-[var(--surface-secondary)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--muted)]">
          {aside}
        </span>
      )}
    </div>
  );
}

/* CAMPO COM ÍCONE */

function FieldShell({
  icon,
  invalid = false,
  className = "",
  children,
}: {
  icon: ReactNode;
  invalid?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`relative flex items-center rounded-xl border bg-[var(--surface)] transition focus-within:ring-4 ${
        invalid
          ? "border-red-500/60 focus-within:ring-red-500/10"
          : "border-[var(--border)] hover:border-primary/40 focus-within:border-primary focus-within:ring-primary/10"
      } ${className}`}
    >
      <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 items-center text-[var(--muted)]">
        {icon}
      </span>
      {children}
    </div>
  );
}

/* OPÇÃO DE ATENDIMENTO */

function AppointmentOption({
  appointment,
  selected,
  disabled,
  tooEarly,
  onSelect,
}: {
  appointment: PaymentAppointment;
  selected: boolean;
  disabled: boolean;
  tooEarly: boolean;
  onSelect: () => void;
}) {
  const price = getNumericPrice(
    appointment.service.price,
  );

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled || tooEarly}
      title={
        tooEarly
          ? `O pagamento só pode ser feito a partir das ${formatTime(appointment.date)}.`
          : undefined
      }
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
        selected
          ? "border-primary bg-primary/[0.06] ring-4 ring-primary/10"
          : "border-[var(--border)] hover:border-primary/40 hover:bg-[var(--surface-secondary)]"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold transition-colors ${
          selected
            ? "bg-primary text-white"
            : "bg-[var(--surface-secondary)] text-[var(--muted)]"
        }`}
      >
        {getInitials(appointment.client.name)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {appointment.client.name}
        </span>

        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--muted)]">
          <span className="truncate">
            {appointment.service.name}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {formatDate(appointment.date)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(appointment.date)}
          </span>
          <span className="hidden items-center gap-1 sm:inline-flex">
            <UserRound className="h-3 w-3" />
            {appointment.professional.name}
          </span>
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={`text-sm font-semibold tabular-nums ${
            price <= 0
              ? "text-amber-600 dark:text-amber-400"
              : ""
          }`}
        >
          {price > 0
            ? formatPrice(price)
            : "Sem preço"}
        </span>

        {tooEarly && (
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
            A partir das {formatTime(appointment.date)}
          </span>
        )}

        <span
          className={`flex h-4 w-4 items-center justify-center rounded-full border transition-all ${
            selected
              ? "border-primary bg-primary text-white"
              : "border-[var(--border)]"
          }`}
        >
          {selected && (
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          )}
        </span>
      </span>
    </button>
  );
}

/* ESTADO VAZIO */

function EmptyState({
  searching,
}: {
  searching: boolean;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--border)] px-6 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-secondary)] text-[var(--muted)]">
        <Inbox className="h-5 w-5" />
      </span>

      <p className="mt-3 text-sm font-semibold">
        {searching
          ? "Nenhum resultado"
          : "Nada por receber"}
      </p>

      <p className="mt-1 max-w-xs text-xs text-[var(--muted)]">
        {searching
          ? "Tente procurar por outro nome ou serviço."
          : "Apenas atendimentos confirmados e ainda não pagos aparecem aqui."}
      </p>
    </div>
  );
}

/* MÉTODO DE PAGAMENTO */

interface PaymentMethodCardProps {
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  description: string;
}

function PaymentMethodCard({
  selected,
  disabled,
  onClick,
  icon,
  title,
  description,
}: PaymentMethodCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? "border-primary bg-primary/[0.06] ring-4 ring-primary/10"
          : "border-[var(--border)] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
      }`}
    >
      <span
        className={`absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white transition-all duration-150 ${
          selected
            ? "scale-100 opacity-100"
            : "scale-50 opacity-0"
        }`}
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>

      <span
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
          selected
            ? "bg-primary text-white"
            : "bg-[var(--surface-secondary)] text-[var(--muted)]"
        }`}
      >
        {icon}
      </span>

      <span className="text-[13px] font-semibold leading-tight">
        {title}
      </span>

      <span className="mt-0.5 text-[11px] text-[var(--muted)]">
        {description}
      </span>
    </button>
  );
}

/* SUCESSO */

function SuccessView({
  amount,
  method,
  change,
}: {
  amount: string;
  method: string;
  change: string | null;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="flex h-16 w-16 animate-[iconPop_0.4s_ease-out] items-center justify-center rounded-full bg-primary/10 text-primary">
        <CheckCircle2 className="h-8 w-8" />
      </span>

      <h2 className="mt-5 text-lg font-semibold">
        Pagamento registado
      </h2>

      <p className="mt-1 text-sm text-[var(--muted)]">
        {amount} · {method}
      </p>

      {change && (
        <p className="mt-4 rounded-full bg-[var(--surface-secondary)] px-4 py-1.5 text-sm">
          Troco a devolver:{" "}
          <span className="font-semibold">
            {change}
          </span>
        </p>
      )}
    </div>
  );
}
