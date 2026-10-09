"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { toast } from "sonner";

import {
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Landmark,
  Scissors,
  Smartphone,
  UserRound,
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
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-AO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-AO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getPaymentMethodLabel(
  method?: string | null,
): string {
  switch (method) {
    case "CASH":
      return "Dinheiro";

    case "CARD":
      return "Cartão";

    case "TRANSFER":
      return "Transferência";

    case "MOBILE_MONEY":
      return "Multicaixa Express";

    default:
      return method || "—";
  }
}

function getPaymentMethodIcon(
  method: PaymentMethod,
): ReactNode {
  switch (method) {
    case "CASH":
      return <Banknote className="h-5 w-5" />;

    case "CARD":
      return <CreditCard className="h-5 w-5" />;

    case "TRANSFER":
      return <Landmark className="h-5 w-5" />;

    case "MOBILE_MONEY":
      return <Smartphone className="h-5 w-5" />;

    default:
      return <CreditCard className="h-5 w-5" />;
  }
}

export function ReceivePayment({
  onPaymentCreated,
}: ReceivePaymentProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [appointments, setAppointments] =
    useState<PaymentAppointment[]>([]);

  const [
    selectedAppointmentId,
    setSelectedAppointmentId,
  ] = useState("");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("CASH");

  const [isLoading, setIsLoading] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] =
    useState("");

  /* CARREGAR AGENDAMENTOS*/

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

      const list = Array.isArray(
        data?.appointments,
      )
        ? data.appointments
        : [];

      setAppointments(list);
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

  /* ABRIR MODAL*/

  function handleOpen() {
    setError("");
    setSuccess("");

    setSelectedAppointmentId("");
    setPaymentMethod("CASH");

    setIsOpen(true);

    loadAppointments();
  }

  /* FECHAR MODAL*/

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    setIsOpen(false);

    setError("");
    setSuccess("");

    setSelectedAppointmentId("");
    setPaymentMethod("CASH");
  }

  /*
   AGENDAMENTO SELECIONADO
   */

  const selectedAppointment = useMemo(() => {
    return (
      appointments.find(
        (appointment) =>
          appointment.id ===
          selectedAppointmentId,
      ) ?? null
    );
  }, [
    appointments,
    selectedAppointmentId,
  ]);

  /* PREÇO*/

  const selectedPrice = useMemo(() => {
    if (!selectedAppointment) {
      return 0;
    }

    return getNumericPrice(
      selectedAppointment.service?.price,
    );
  }, [selectedAppointment]);

  /*
   
    ALTERAR AGENDAMENTO
   
   */

  function handleAppointmentChange(
    appointmentId: string,
  ) {
    setSelectedAppointmentId(
      appointmentId,
    );

    setError("");
    setSuccess("");
  }

  /*
    ALTERAR MÉTODO DE PAGAMENTO
   
   */

  function handlePaymentMethodChange(
    method: PaymentMethod,
  ) {
    setPaymentMethod(method);

    setError("");
    setSuccess("");
  }

  /*
   
    REGISTRAR PAGAMENTO
   
   IMPORTANTE:
   
   NÃO abre:
   - nova aba
   - nova janela
   - outro navegador
   - recibo automaticamente
   - outra página
  
   Apenas faz POST para a API.
   
   */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedAppointment) {
      setError(
        "Selecione um agendamento.",
      );

      return;
    }

    if (
      !selectedPrice ||
      selectedPrice <= 0
    ) {
      setError(
        `O serviço "${selectedAppointment.service.name}" está sem preço. Defina o preço em Serviços antes de receber o pagamento.`,
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

      formData.append(
        "method",
        paymentMethod,
      );

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

      /* PAGAMENTO REGISTRADO
      
       
       Aqui NÃO existe:
       
       window.open()
       window.location.href
       window.location.assign()
       window.location.replace()
       target="_blank"
       iframe
       
       Portanto o pagamento é processado
       somente dentro desta aplicação.
       */

      setSuccess(
        "Pagamento registrado com sucesso.",
      );

      /* Remover o agendamento da lista*/

      setAppointments((current) =>
        current.filter(
          (appointment) =>
            appointment.id !==
            selectedAppointment.id,
        ),
      );

      /* Notificação
       */

      toast.success(
        `Pagamento de ${formatPrice(
          selectedPrice,
        )} recebido com sucesso.`,
      );

      /*
       * Atualizar outras partes do sistema
       */

      onPaymentCreated?.();

      window.dispatchEvent(
        new Event("appointments:changed"),
      );

      /*Limpar formulário*/

      setSelectedAppointmentId("");
      setPaymentMethod("CASH");

      /* Fechar modal depois da confirmação*/

      window.setTimeout(() => {
        setIsOpen(false);
        setSuccess("");
      }, 900);
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

  /* CARREGAR QUANDO O MODAL ABRIR */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    loadAppointments();
  }, [isOpen]);

  /* INTERFACE*/

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="
          group
          inline-flex
          w-full
          items-center
          justify-center
          gap-3
          rounded-xl
          border
          border-gray-200
          bg-white
          px-5
          py-3
          text-sm
          font-semibold
          text-gray-950
          shadow-sm
          transition-all
          duration-200
          hover:-translate-y-0.5
          hover:border-gray-300
          hover:shadow-md
          active:translate-y-0
          dark:border-gray-800
          dark:bg-gray-900
          dark:text-white
          sm:w-auto
        "
      >
        <span
          className="
            flex
            h-8
            w-8
            items-center
            justify-center
            rounded-lg
            bg-gray-950
            text-white
            transition
            group-hover:scale-105
            dark:bg-white
            dark:text-gray-950
          "
        >
          <CreditCard className="h-4 w-4" />
        </span>

        Receber Pagamento
      </button>

      {isOpen && (
        <div
          className="
            fixed
            inset-0
            z-[9999]
            flex
            items-center
            justify-center
            bg-black/60
            p-4
            backdrop-blur-md
          "
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !isSubmitting
            ) {
              handleClose();
            }
          }}
        >
          <div
            className="
              flex
              max-h-[94vh]
              w-full
              max-w-2xl
              flex-col
              overflow-hidden
              rounded-[28px]
              border
              border-gray-200
              bg-white
              shadow-[0_30px_100px_rgba(0,0,0,0.22)]
              dark:border-gray-800
              dark:bg-gray-950
            "
          >
            {/* HEADER */}

            <div
              className="
                flex
                shrink-0
                items-center
                justify-between
                border-b
                border-gray-100
                px-6
                py-5
                dark:border-gray-800
              "
            >
              <div className="flex items-center gap-3.5">
                <div
                  className="
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-2xl
                    bg-gray-950
                    text-white
                    shadow-sm
                    dark:bg-white
                    dark:text-gray-950
                  "
                >
                  <CreditCard className="h-5 w-5" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold tracking-tight text-gray-950 dark:text-white">
                      Receber pagamento
                    </h2>

                    <span
                      className="
                        rounded-full
                        bg-gray-100
                        px-2
                        py-0.5
                        text-[9px]
                        font-semibold
                        uppercase
                        tracking-wider
                        text-gray-500
                        dark:bg-gray-900
                        dark:text-gray-400
                      "
                    >
                      Caixa
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Registe o pagamento do atendimento.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                aria-label="Fechar"
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-transparent
                  text-gray-400
                  transition
                  hover:border-gray-200
                  hover:bg-gray-50
                  hover:text-gray-900
                  dark:hover:border-gray-800
                  dark:hover:bg-gray-900
                  dark:hover:text-white
                "
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* CONTEÚDO */}

            <div
              className="
                min-h-0
                flex-1
                overflow-y-auto
              "
            >
              <form
                onSubmit={handleSubmit}
                className="space-y-6 p-6"
              >
                {/* ERRO */}

                {error && (
                  <div
                    className="
                      flex
                      items-start
                      gap-3
                      rounded-2xl
                      border
                      border-red-200
                      bg-red-50
                      px-4
                      py-3.5
                      text-sm
                      text-red-700
                      dark:border-red-900/50
                      dark:bg-red-950/30
                      dark:text-red-300
                    "
                  >
                    <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />

                    <span>{error}</span>
                  </div>
                )}

                {/* SUCESSO */}

                {success && (
                  <div
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-2xl
                      border
                      border-gray-200
                      bg-gray-50
                      px-4
                      py-3.5
                      text-sm
                      font-medium
                      text-gray-900
                      dark:border-gray-800
                      dark:bg-gray-900
                      dark:text-white
                    "
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0" />

                    {success}
                  </div>
                )}

                {/* ATENDIMENTO */}

                <section>
                  <div className="mb-3 flex items-end justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="
                            flex
                            h-5
                            w-5
                            items-center
                            justify-center
                            rounded-md
                            bg-gray-950
                            text-[10px]
                            font-bold
                            text-white
                            dark:bg-white
                            dark:text-gray-950
                          "
                        >
                          1
                        </span>

                        <h3 className="text-sm font-semibold text-gray-950 dark:text-white">
                          Atendimento
                        </h3>
                      </div>

                      <p className="mt-1 pl-7 text-xs text-gray-500 dark:text-gray-400">
                        Selecione o atendimento que será liquidado.
                      </p>
                    </div>

                    {!isLoading &&
                      appointments.length > 0 && (
                        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                          {appointments.length}{" "}
                          disponível
                          {appointments.length !==
                          1
                            ? "s"
                            : ""}
                        </span>
                      )}
                  </div>

                  <div className="relative">
                    <select
                      value={
                        selectedAppointmentId
                      }
                      onChange={(event) =>
                        handleAppointmentChange(
                          event.target.value,
                        )
                      }
                      disabled={
                        isLoading ||
                        isSubmitting
                      }
                      required
                      className="
                        w-full
                        appearance-none
                        rounded-2xl
                        border
                        border-gray-200
                        bg-white
                        px-4
                        py-3.5
                        pr-11
                        text-sm
                        font-medium
                        text-gray-900
                        outline-none
                        transition
                        hover:border-gray-300
                        focus:border-gray-400
                        focus:ring-4
                        focus:ring-gray-950/5
                        disabled:cursor-not-allowed
                        disabled:bg-gray-50
                        dark:border-gray-800
                        dark:bg-gray-900
                        dark:text-white
                      "
                    >
                      <option value="">
                        {isLoading
                          ? "A carregar agendamentos..."
                          : appointments.length ===
                              0
                            ? "Nenhum agendamento disponível"
                            : "Selecione um agendamento"}
                      </option>

                      {appointments.map(
                        (appointment) => (
                          <option
                            key={
                              appointment.id
                            }
                            value={
                              appointment.id
                            }
                          >
                            {
                              appointment
                                .client
                                .name
                            }{" "}
                            —{" "}
                            {
                              appointment
                                .service
                                .name
                            }{" "}
                            —{" "}
                            {formatPrice(
                              appointment
                                .service
                                .price,
                            )}
                          </option>
                        ),
                      )}
                    </select>

                    <ChevronDown
                      className="
                        pointer-events-none
                        absolute
                        right-4
                        top-1/2
                        h-4
                        w-4
                        -translate-y-1/2
                        text-gray-400
                      "
                    />
                  </div>

                  {!isLoading &&
                    appointments.length ===
                      0 && (
                      <p className="mt-2.5 text-xs text-gray-500 dark:text-gray-400">
                        Apenas atendimentos confirmados e ainda não pagos aparecem nesta lista.
                      </p>
                    )}
                </section>

                {/* RESUMO */}

                {selectedAppointment && (
                  <section
                    className="
                      overflow-hidden
                      rounded-2xl
                      border
                      border-gray-200
                      dark:border-gray-800
                    "
                  >
                    <div
                      className="
                        border-b
                        border-gray-100
                        bg-gray-50/70
                        px-5
                        py-3
                        dark:border-gray-800
                        dark:bg-gray-900/60
                      "
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                        Resumo do atendimento
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2">
                      <InfoItem
                        icon={
                          <UserRound className="h-4 w-4" />
                        }
                        label="Cliente"
                        value={
                          selectedAppointment
                            .client
                            .name
                        }
                      />

                      <InfoItem
                        icon={
                          <Scissors className="h-4 w-4" />
                        }
                        label="Serviço"
                        value={
                          selectedAppointment
                            .service
                            .name
                        }
                      />

                      <InfoItem
                        icon={
                          <CalendarDays className="h-4 w-4" />
                        }
                        label="Data"
                        value={formatDate(
                          selectedAppointment.date,
                        )}
                      />

                      <InfoItem
                        icon={
                          <CalendarDays className="h-4 w-4" />
                        }
                        label="Hora"
                        value={formatTime(
                          selectedAppointment.date,
                        )}
                      />

                      <InfoItem
                        icon={
                          <UserRound className="h-4 w-4" />
                        }
                        label="Profissional"
                        value={
                          selectedAppointment
                            .professional
                            .name
                        }
                      />

                      <InfoItem
                        icon={
                          <Scissors className="h-4 w-4" />
                        }
                        label="Duração"
                        value={`${selectedAppointment.service.duration || 0} min`}
                      />
                    </div>
                  </section>
                )}

                {/* VALOR */}

                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className="
                        flex
                        h-5
                        w-5
                        items-center
                        justify-center
                        rounded-md
                        bg-gray-950
                        text-[10px]
                        font-bold
                        text-white
                        dark:bg-white
                        dark:text-gray-950
                      "
                    >
                      2
                    </span>

                    <h3 className="text-sm font-semibold text-gray-950 dark:text-white">
                      Valor do pagamento
                    </h3>
                  </div>

                  <div
                    className="
                      relative
                      overflow-hidden
                      rounded-2xl
                      border
                      border-gray-200
                      bg-gray-950
                      px-5
                      py-5
                      text-white
                      dark:border-gray-800
                    "
                  >
                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/45">
                          Total a receber
                        </p>

                        <p className="mt-2 text-3xl font-bold tracking-tight">
                          {selectedAppointment
                            ? formatPrice(
                                selectedPrice,
                              )
                            : "—"}
                        </p>

                        {selectedAppointment && (
                          <p className="mt-1 text-xs text-white/45">
                            {
                              selectedAppointment
                                .service
                                .name
                            }
                          </p>
                        )}
                      </div>

                      <div
                        className="
                          flex
                          h-12
                          w-12
                          items-center
                          justify-center
                          rounded-2xl
                          border
                          border-white/10
                          bg-white/10
                        "
                      >
                        <Banknote className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* MÉTODO */}

                <section>
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="
                          flex
                          h-5
                          w-5
                          items-center
                          justify-center
                          rounded-md
                          bg-gray-950
                          text-[10px]
                          font-bold
                          text-white
                          dark:bg-white
                          dark:text-gray-950
                        "
                      >
                        3
                      </span>

                      <h3 className="text-sm font-semibold text-gray-950 dark:text-white">
                        Método de pagamento
                      </h3>
                    </div>

                    <p className="mt-1 pl-7 text-xs text-gray-500 dark:text-gray-400">
                      Como o cliente efetuou o pagamento?
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <PaymentMethodCard
                      selected={
                        paymentMethod ===
                        "CASH"
                      }
                      disabled={isSubmitting}
                      onClick={() =>
                        handlePaymentMethodChange(
                          "CASH",
                        )
                      }
                      icon={
                        <Banknote className="h-5 w-5" />
                      }
                      title="Dinheiro"
                      description="Pagamento em espécie"
                    />

                    <PaymentMethodCard
                      selected={
                        paymentMethod ===
                        "CARD"
                      }
                      disabled={isSubmitting}
                      onClick={() =>
                        handlePaymentMethodChange(
                          "CARD",
                        )
                      }
                      icon={
                        <CreditCard className="h-5 w-5" />
                      }
                      title="Cartão"
                      description="Cartão bancário"
                    />

                    <PaymentMethodCard
                      selected={
                        paymentMethod ===
                        "TRANSFER"
                      }
                      disabled={isSubmitting}
                      onClick={() =>
                        handlePaymentMethodChange(
                          "TRANSFER",
                        )
                      }
                      icon={
                        <Landmark className="h-5 w-5" />
                      }
                      title="Transferência"
                      description="Transferência bancária"
                    />

                    <PaymentMethodCard
                      selected={
                        paymentMethod ===
                        "MOBILE_MONEY"
                      }
                      disabled={isSubmitting}
                      onClick={() =>
                        handlePaymentMethodChange(
                          "MOBILE_MONEY",
                        )
                      }
                      icon={
                        <Smartphone className="h-5 w-5" />
                      }
                      title="Multicaixa Express"
                      description="Pagamento móvel em Angola"
                    />
                  </div>
                </section>

                {/* TOTAL */}

                {selectedAppointment &&
                  selectedPrice > 0 && (
                    <div
                      className="
                        flex
                        items-center
                        justify-between
                        rounded-2xl
                        border
                        border-gray-200
                        bg-gray-50
                        px-5
                        py-4
                        dark:border-gray-800
                        dark:bg-gray-900
                      "
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="
                            flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-xl
                            bg-white
                            text-gray-700
                            shadow-sm
                            dark:bg-gray-800
                            dark:text-gray-300
                          "
                        >
                          {getPaymentMethodIcon(
                            paymentMethod,
                          )}
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gray-400">
                            Método selecionado
                          </p>

                          <p className="mt-0.5 text-sm font-semibold text-gray-950 dark:text-white">
                            {getPaymentMethodLabel(
                              paymentMethod,
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400">
                          Total
                        </p>

                        <p className="mt-0.5 text-base font-bold text-gray-950 dark:text-white">
                          {formatPrice(
                            selectedPrice,
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                {/* BOTÕES */}

                <div
                  className="
                    flex
                    flex-col-reverse
                    gap-3
                    border-t
                    border-gray-100
                    pt-5
                    dark:border-gray-800
                    sm:flex-row
                    sm:justify-end
                  "
                >
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="
                      w-full
                      rounded-xl
                      border
                      border-gray-200
                      bg-white
                      px-5
                      py-3
                      text-sm
                      font-semibold
                      text-gray-700
                      transition
                      hover:bg-gray-50
                      dark:border-gray-800
                      dark:bg-gray-950
                      dark:text-gray-300
                      sm:w-auto
                    "
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !selectedAppointmentId ||
                      selectedPrice <= 0
                    }
                    className="
                      inline-flex
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      bg-gray-950
                      px-6
                      py-3
                      text-sm
                      font-semibold
                      text-white
                      shadow-sm
                      transition-all
                      hover:-translate-y-0.5
                      hover:bg-gray-800
                      hover:shadow-lg
                      active:translate-y-0
                      dark:bg-white
                      dark:text-gray-950
                      dark:hover:bg-gray-100
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                      sm:w-auto
                    "
                  >
                    {isSubmitting ? (
                      <>
                        <span
                          className="
                            h-4
                            w-4
                            animate-spin
                            rounded-full
                            border-2
                            border-white/30
                            border-t-white
                            dark:border-gray-400/30
                            dark:border-t-gray-900
                          "
                        />

                        A registar...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />

                        Confirmar pagamento
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* INFO ITEM*/

interface InfoItemProps {
  icon: ReactNode;
  label: string;
  value: string;
}

function InfoItem({
  icon,
  label,
  value,
}: InfoItemProps) {
  return (
    <div
      className="
        flex
        min-w-0
        items-center
        gap-3
        border-b
        border-gray-100
        p-4
        dark:border-gray-800
      "
    >
      <div
        className="
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-xl
          bg-gray-50
          text-gray-600
          dark:bg-gray-900
          dark:text-gray-300
        "
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
          {label}
        </p>

        <p className="mt-0.5 truncate text-sm font-semibold text-gray-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

/*PAYMENT METHOD CARD*/

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
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`
        group
        relative
        min-h-[118px]
        rounded-2xl
        border
        p-4
        text-left
        transition-all
        duration-200

        ${
          selected
            ? `
              border-gray-950
              bg-gray-950
              text-white
              shadow-lg
              shadow-gray-950/10
              dark:border-white
              dark:bg-white
              dark:text-gray-950
            `
            : `
              border-gray-200
              bg-white
              text-gray-900
              hover:-translate-y-0.5
              hover:border-gray-300
              hover:shadow-md
              dark:border-gray-800
              dark:bg-gray-900
              dark:text-white
              dark:hover:border-gray-700
            `
        }

        disabled:cursor-not-allowed
        disabled:opacity-50
      `}
    >
      <div
        className={`
          absolute
          right-3
          top-3
          flex
          h-5
          w-5
          items-center
          justify-center
          rounded-full

          ${
            selected
              ? "bg-white text-gray-950 dark:bg-gray-950 dark:text-white"
              : "scale-75 bg-transparent opacity-0"
          }
        `}
      >
        <Check className="h-3 w-3" />
      </div>

      <div
        className={`
          mb-4
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-xl

          ${
            selected
              ? "bg-white/10 dark:bg-gray-950/10"
              : "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          }
        `}
      >
        {icon}
      </div>

      <p className="pr-6 text-sm font-semibold">
        {title}
      </p>

      <p
        className={`
          mt-1
          text-[11px]
          leading-4

          ${
            selected
              ? "text-white/55 dark:text-gray-500"
              : "text-gray-500 dark:text-gray-400"
          }
        `}
      >
        {description}
      </p>
    </button>
  );
}