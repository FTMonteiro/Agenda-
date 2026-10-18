
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Appointment } from "@/types/appointment";
import { useNotifications } from "@/components/notifications/NotificationsProvider";

import {
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  X,
  CalendarDays,
  Clock,
  UserRound,
  Scissors,
  Save,
  AlertTriangle,
  CreditCard,
  Banknote,
  CheckCircle2,
  Receipt,
  ExternalLink,
  UserX,
  XCircle,
} from "lucide-react";

/*TYPES*/

interface AppointmentListProps {
  appointments?: Appointment[];
  onDelete?: (id: string) => void;
  onEdit?: (appointment: Appointment) => void;
}

type AppointmentWithPayment = Appointment & {
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  paymentAmount?: number | null;
  paidAt?: string | null;
  receiptUrl?: string | null;

  paymentData?: {
    receiptUrl?: string | null;
  } | null;
};

type QuickStatus =
  | "confirmed"
  | "cancelled"
  | "no_show";

const QUICK_STATUS_TEXT: Record<
  QuickStatus,
  { title: string; done: string; error: string }
> = {
  confirmed: {
    title: "Agendamento confirmado",
    done: "Agendamento confirmado.",
    error: "Não foi possível confirmar o agendamento.",
  },
  cancelled: {
    title: "Agendamento cancelado",
    done: "Agendamento cancelado.",
    error: "Não foi possível cancelar o agendamento.",
  },
  no_show: {
    title: "Cliente não compareceu",
    done: "Marcado como não compareceu.",
    error: "Não foi possível marcar a falta.",
  },
};

/*COMPONENT*/

export function AppointmentList({
  appointments: externalAppointments,
  onDelete,
  onEdit,
}: AppointmentListProps) {
  const [appointments, setAppointments] = useState<
    AppointmentWithPayment[]
  >((externalAppointments as AppointmentWithPayment[]) ?? []);

  const [loading, setLoading] = useState(true);

  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentWithPayment | null>(null);

  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentWithPayment | null>(null);

  const [deletingAppointment, setDeletingAppointment] =
    useState<AppointmentWithPayment | null>(null);

  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [changingStatus, setChangingStatus] = useState<{
    id: string;
    status: QuickStatus;
  } | null>(null);

  const [validationError, setValidationError] = useState("");

  const [loadingReceipt, setLoadingReceipt] = useState<string | null>(
    null
  );

  const { notify } = useNotifications();

  /* 
     DATA DE HOJE

     IMPORTANTE:
     Usamos a data local do computador do proprietário.

     Exemplo:
     Hoje:      28/08/2026
     Ontem:     27/08/2026
     Amanhã:    29/08/2026
   */

  const today = useMemo(() => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, []);

  /* 
     VERIFICAR DATA PASSADA
   */

  function isPastDate(date?: string): boolean {
    if (!date) {
      return false;
    }

    return date < today;
  }

  /* 
     CARREGAR AGENDAMENTOS
  */

  async function loadAppointments() {
    try {
      setLoading(true);

      const response = await fetch("/api/appointments", {
        method: "GET",
        cache: "no-store",
      });

      const text = await response.text();

      let data: {
        appointments?: AppointmentWithPayment[];
        error?: string;
      } = {};

      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            "A API retornou uma resposta inválida."
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          data.error ?? "Erro ao carregar agendamentos."
        );
      }

      setAppointments(data.appointments ?? []);
    } catch (error) {
      console.error(
        "Erro ao buscar agendamentos:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar agendamentos."
      );
    } finally {
      setLoading(false);
    }
  }

  /* 
     PRIMEIRO CARREGAMENTO
   */

  useEffect(() => {
    loadAppointments();
  }, []);

  /* 
     ESCUTAR ALTERAÇÕES
   */

  useEffect(() => {
    function handleAppointmentsChanged() {
      loadAppointments();
    }

    window.addEventListener(
      "appointments:changed",
      handleAppointmentsChanged
    );

    return () => {
      window.removeEventListener(
        "appointments:changed",
        handleAppointmentsChanged
      );
    };
  }, []);

  /* 
     SINCRONIZAR PROPS
   */

  useEffect(() => {
    if (!externalAppointments) {
      return;
    }

    setAppointments(
      externalAppointments as AppointmentWithPayment[]
    );
  }, [externalAppointments]);

  /* 
     AGENDAMENTOS VISÍVEIS

     REGRA:

     HOJE       
     AMANHÃ     
     FUTURO     

     ONTEM      
     ANTEONTEM 
     PASSADO    

     O banco NÃO é apagado.

     Apenas não mostramos agendamentos antigos nesta tela.
  */

  const visibleAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      if (!appointment.date) {
        return false;
      }

      return !isPastDate(appointment.date);
    });
  }, [appointments, today]);

  /* 
     ORDENAÇÃO
   */

  const sortedAppointments = useMemo(() => {
    return [...visibleAppointments].sort((a, b) => {
      const dateTimeA = `${a.date ?? ""} ${a.time ?? ""}`;
      const dateTimeB = `${b.date ?? ""} ${b.time ?? ""}`;

      return dateTimeA.localeCompare(dateTimeB);
    });
  }, [visibleAppointments]);

  /* 
     PODE EDITAR?
   */

  function canEditAppointment(
    appointment: AppointmentWithPayment
  ): boolean {
    const status = String(
      appointment.status ?? ""
    ).toLowerCase();

    const payment = String(
      appointment.payment ?? ""
    ).toLowerCase();

    if (status === "completed") {
      return false;
    }

    if (payment === "paid") {
      return false;
    }

    if (isPastDate(appointment.date)) {
      return false;
    }

    return true;
  }

  /* 
     ABRIR RECIBO
   */

  function handleViewReceipt(
    appointment: AppointmentWithPayment
  ) {
    const payment = String(
      appointment.payment ?? ""
    ).toLowerCase();

    if (payment !== "paid") {
      toast.error(
        "O pagamento ainda não foi confirmado."
      );

      return;
    }

    try {
      setLoadingReceipt(appointment.id);

      const receiptPage =
        `/pagamentos?receipt=${encodeURIComponent(
          appointment.id
        )}`;

      const newWindow = window.open(
        receiptPage,
        "_blank",
        "noopener,noreferrer"
      );

      if (!newWindow) {
        toast.error(
          "O navegador bloqueou a abertura do recibo. Permita pop-ups para este sistema."
        );
      }
    } catch (error) {
      console.error(
        "Erro ao abrir recibo:",
        error
      );

      toast.error(
        "Não foi possível abrir o recibo."
      );
    } finally {
      setLoadingReceipt(null);
    }
  }

  /* 
     SOLICITAR EXCLUSÃO
   */

  function requestDelete(
    appointment: AppointmentWithPayment
  ) {
    setOpenMenu(null);
    setSelectedAppointment(null);
    setValidationError("");
    setDeletingAppointment(appointment);
  }

  /* 
     CONFIRMAR EXCLUSÃO
   */

  async function confirmDelete() {
    if (!deletingAppointment) {
      return;
    }

    try {
      setIsDeleting(true);
      setValidationError("");

      const response = await fetch(
        `/api/appointments/${deletingAppointment.id}`,
        {
          method: "DELETE",
        }
      );

      const text = await response.text();

      let data: {
        success?: boolean;
        error?: string;
      } = {};

      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            "A API retornou uma resposta inválida."
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Não foi possível excluir o agendamento."
        );
      }

      const deletedId = deletingAppointment.id;

      setAppointments((current) =>
        current.filter(
          (item) => item.id !== deletedId
        )
      );

      onDelete?.(deletedId);

      notify({
        kind: "deleted",
        title: "Agendamento apagado",
        description:
          `${deletingAppointment.client} — ` +
          `${formatDate(
            deletingAppointment.date
          )} às ${deletingAppointment.time}`,
      });

      toast.success(
        "Agendamento apagado."
      );

      window.dispatchEvent(
        new Event("appointments:changed")
      );

      setDeletingAppointment(null);
    } catch (error) {
      console.error(
        "Erro ao excluir:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Erro ao excluir agendamento.";

      setValidationError(message);

      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  /* 
     EDITAR
   */

  function handleEdit(
    appointment: AppointmentWithPayment
  ) {
    setOpenMenu(null);
    setSelectedAppointment(null);
    setValidationError("");

    if (!canEditAppointment(appointment)) {
      toast.error(
        "Este agendamento já foi pago, concluído ou pertence a uma data passada."
      );

      return;
    }

    setEditingAppointment({
      ...appointment,
    });
  }

  /* 
     SALVAR EDIÇÃO
   */

  async function saveEdit() {
    if (!editingAppointment) {
      return;
    }

    const status = String(
      editingAppointment.status ?? ""
    ).toLowerCase();

    const payment = String(
      editingAppointment.payment ?? ""
    ).toLowerCase();

    if (status === "completed") {
      setValidationError(
        "Este agendamento já foi concluído e não pode mais ser editado."
      );

      return;
    }

    if (payment === "paid") {
      setValidationError(
        "Este agendamento já foi pago e não pode mais ser editado."
      );

      return;
    }

    if (!editingAppointment.client?.trim()) {
      setValidationError(
        "Preencha o nome do cliente."
      );

      return;
    }

    if (!editingAppointment.service?.trim()) {
      setValidationError(
        "Preencha o serviço."
      );

      return;
    }

    if (!editingAppointment.professional?.trim()) {
      setValidationError(
        "Preencha o profissional."
      );

      return;
    }

    if (!editingAppointment.date) {
      setValidationError(
        "Selecione a data."
      );

      return;
    }

    if (!editingAppointment.time) {
      setValidationError(
        "Selecione o horário."
      );

      return;
    }

    /* 
       NÃO PERMITIR DATA PASSADA
   */

    if (
      isPastDate(
        editingAppointment.date
      )
    ) {
      setValidationError(
        "Não é possível colocar um agendamento em uma data que já passou."
      );

      return;
    }

    try {
      setIsSaving(true);
      setValidationError("");

      const response = await fetch(
        `/api/appointments/${editingAppointment.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            client:
              editingAppointment.client.trim(),

            service:
              editingAppointment.service.trim(),

            professional:
              editingAppointment.professional.trim(),

            date:
              editingAppointment.date,

            time:
              editingAppointment.time,

            status:
              editingAppointment.status,

            notes:
              editingAppointment.notes?.trim() ||
              null,
          }),
        }
      );

      const text = await response.text();

      let data: {
        appointment?: AppointmentWithPayment;
        error?: string;
      } = {};

      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            "A API retornou uma resposta inválida."
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Não foi possível atualizar o agendamento."
        );
      }

      const savedAppointment =
        data.appointment ??
        editingAppointment;

      setAppointments((current) =>
        current.map((item) =>
          item.id === savedAppointment.id
            ? savedAppointment
            : item
        )
      );

      window.dispatchEvent(
        new Event("appointments:changed")
      );

      onEdit?.(savedAppointment);

      notify({
        kind: "updated",
        title: "Agendamento editado",
        description:
          `${savedAppointment.client} — ` +
          `${formatDate(
            savedAppointment.date
          )} às ${savedAppointment.time}`,
      });

      toast.success(
        "Agendamento atualizado."
      );

      setEditingAppointment(null);
      setValidationError("");
    } catch (error) {
      console.error(
        "Erro ao editar:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Erro ao atualizar agendamento.";

      setValidationError(message);

      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  /*
     MUDAR STATUS RÁPIDO

     Confirmar, cancelar ou marcar falta direto
     do card ou dos detalhes, sem abrir o editar.
   */

  function isPendingStatus(
    status: Appointment["status"]
  ): boolean {
    return ![
      "confirmed",
      "completed",
      "cancelled",
      "no_show",
    ].includes(String(status ?? "").toLowerCase());
  }

  function isOpenStatus(
    status: Appointment["status"]
  ): boolean {
    return ["", "pending", "confirmed"].includes(
      String(status ?? "").toLowerCase()
    );
  }

  async function changeStatus(
    appointment: AppointmentWithPayment,
    status: QuickStatus
  ) {
    if (
      status === "cancelled" &&
      !window.confirm(
        `Cancelar o agendamento de ${appointment.client}?`
      )
    ) {
      return;
    }

    const messages = QUICK_STATUS_TEXT[status];

    try {
      setChangingStatus({
        id: appointment.id,
        status,
      });

      const response = await fetch(
        `/api/appointments/${appointment.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            date: appointment.date,
            time: appointment.time,
            status,
          }),
        }
      );

      const text = await response.text();

      let data: {
        appointment?: AppointmentWithPayment;
        error?: string;
      } = {};

      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            "A API retornou uma resposta inválida."
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          data.error ?? messages.error
        );
      }

      const savedAppointment =
        data.appointment ?? {
          ...appointment,
          status: status as Appointment["status"],
        };

      setAppointments((current) =>
        current.map((item) =>
          item.id === savedAppointment.id
            ? savedAppointment
            : item
        )
      );

      setSelectedAppointment((current) =>
        current?.id === savedAppointment.id
          ? savedAppointment
          : current
      );

      window.dispatchEvent(
        new Event("appointments:changed")
      );

      onEdit?.(savedAppointment);

      notify({
        kind: "updated",
        title: messages.title,
        description:
          `${savedAppointment.client} — ` +
          `${formatDate(
            savedAppointment.date
          )} às ${savedAppointment.time}`,
      });

      toast.success(messages.done);
    } catch (error) {
      console.error(
        "Erro ao mudar status:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : messages.error
      );
    } finally {
      setChangingStatus(null);
    }
  }

  /*
     STATUS
   */

  function getStatusLabel(
    status: Appointment["status"]
  ): string {
    switch (
      String(status ?? "").toLowerCase()
    ) {
      case "confirmed":
        return "Confirmado";

      case "completed":
        return "Concluído";

      case "cancelled":
        return "Cancelado";

      case "no_show":
        return "Não compareceu";

      default:
        return "Aguardando";
    }
  }

  function getStatusClass(
    status: Appointment["status"]
  ): string {
    switch (
      String(status ?? "").toLowerCase()
    ) {
      case "confirmed":
        return "bg-blue-50 text-blue-700";

      case "completed":
        return "bg-green-50 text-green-700";

      case "cancelled":
        return "bg-red-50 text-red-700";

      case "no_show":
        return "bg-gray-100 text-gray-700";

      default:
        return "bg-amber-50 text-amber-700";
    }
  }

  /* 
     PAGAMENTO
   */

  function getPaymentLabel(
    payment: Appointment["payment"]
  ): string {
    switch (
      String(payment ?? "").toLowerCase()
    ) {
      case "paid":
        return "Pago";

      case "partial":
        return "Parcial";

      default:
        return "Pendente";
    }
  }

  function getPaymentMethodLabel(
    method?: string | null
  ): string {
    switch (method) {
      case "CASH":
        return "Dinheiro";

      case "CARD":
        return "Cartão";

      case "TRANSFER":
        return "Transferência";

      case "MOBILE_MONEY":
        return "Mobile Money";

      default:
        return "Não informado";
    }
  }

  /* 
     PREÇO
   */

  function getAppointmentPrice(
    appointment: AppointmentWithPayment
  ): number {
    const price = Number(
      appointment.price
    );

    return Number.isFinite(price)
      ? price
      : 0;
  }

  function formatMoney(
    value?: number | null
  ): string {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
      return "0,00 Kz";
    }

    return `${amount.toLocaleString(
      "pt-AO",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )} Kz`;
  }

  /* 
     DATA
   */

  function formatDate(
    date?: string
  ): string {
    if (!date) {
      return "-";
    }

    const [
      year,
      month,
      day,
    ] = date.split("-");

    if (!year || !month || !day) {
      return date;
    }

    return `${day}/${month}/${year}`;
  }

  /* 
     LOADING
   */

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          Carregando agendamentos...
        </div>
      </div>
    );
  }

  /* 
     LISTA
   */

  return (
    <>
      {sortedAppointments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
            <CalendarDays className="h-6 w-6 text-gray-400" />
          </div>

          <h3 className="mt-4 text-sm font-semibold text-gray-900">
            Nenhum agendamento futuro
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Os agendamentos de hoje e dos
            próximos dias aparecerão aqui
            automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAppointments.map(
            (appointment) => {
              const canEdit =
                canEditAppointment(
                  appointment
                );

              const isOpeningReceipt =
                loadingReceipt ===
                appointment.id;

              const isPaid =
                String(
                  appointment.payment ?? ""
                ).toLowerCase() ===
                "paid";

              return (
                <div
                  key={appointment.id}
                  className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-gray-200 hover:shadow-md sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        setSelectedAppointment(
                          appointment
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();
                          setSelectedAppointment(
                            appointment
                          );
                        }
                      }}
                      className="min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-gray-950">
                          {appointment.client}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                            appointment.status
                          )}`}
                        >
                          {getStatusLabel(
                            appointment.status
                          )}
                        </span>

                        {isPaid && (
                          <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Pago
                          </span>
                        )}
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-gray-500 sm:grid-cols-2 xl:grid-cols-5">
                        <div className="flex items-center gap-2">
                          <Scissors className="h-4 w-4 shrink-0 text-gray-400" />

                          <span className="truncate">
                            {appointment.service}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <UserRound className="h-4 w-4 shrink-0 text-gray-400" />

                          <span className="truncate">
                            {appointment.professional}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" />

                          <span>
                            {formatDate(
                              appointment.date
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 shrink-0 text-gray-400" />

                          <span>
                            {appointment.time}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-semibold text-gray-700">
                          <Banknote className="h-4 w-4 shrink-0 text-gray-400" />

                          <span>
                            {formatMoney(
                              getAppointmentPrice(
                                appointment
                              )
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* AÇÕES: confirmar em cima, três pontinhos em baixo */}

                    <div className="flex shrink-0 flex-col items-end gap-2">
                    {canEdit &&
                      isPendingStatus(
                        appointment.status
                      ) && (
                        <button
                          type="button"
                          onClick={() =>
                            changeStatus(
                              appointment,
                              "confirmed"
                            )
                          }
                          disabled={
                            changingStatus?.id ===
                            appointment.id
                          }
                          className="flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {changingStatus?.id ===
                          appointment.id ? (
                            "Confirmando..."
                          ) : (
                            <>
                              Confirmar
                              <span className="hidden sm:inline">
                                {" "}agendamento
                              </span>
                            </>
                          )}
                        </button>
                      )}

                    {/* MENU */}

                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenu(
                            openMenu ===
                              appointment.id
                              ? null
                              : appointment.id
                          )
                        }
                        className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>

                      {openMenu ===
                        appointment.id && (
                        <div className="absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl">
                          {canEdit &&
                            isPendingStatus(
                              appointment.status
                            ) && (
                              <div className="border-b border-gray-100 px-2 pb-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenu(
                                      null
                                    );

                                    changeStatus(
                                      appointment,
                                      "confirmed"
                                    );
                                  }}
                                  disabled={
                                    changingStatus !==
                                    null
                                  }
                                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Confirmar agendamento
                                </button>
                              </div>
                            )}

                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenu(
                                null
                              );

                              setSelectedAppointment(
                                appointment
                              );
                            }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Eye className="h-4 w-4" />
                            Ver detalhes
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() =>
                                handleEdit(
                                  appointment
                                )
                              }
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Pencil className="h-4 w-4" />
                              Editar
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              requestDelete(
                                appointment
                              )
                            }
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* MODAL DE DETALHES*/}

      {selectedAppointment && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm"
          onClick={() =>
            setSelectedAppointment(null)
          }
        >
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {/* CABEÇALHO */}

            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Detalhes
                </p>

                <h2 className="mt-1 text-xl font-semibold text-gray-950">
                  Agendamento
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedAppointment(null)
                }
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* CONTEÚDO */}

            <div className="overflow-y-auto p-6">
              <div className="space-y-3">
                <Detail
                  icon={
                    <UserRound className="h-4 w-4" />
                  }
                  label="Cliente"
                  value={
                    selectedAppointment.client
                  }
                />

                <Detail
                  icon={
                    <Scissors className="h-4 w-4" />
                  }
                  label="Serviço"
                  value={
                    selectedAppointment.service
                  }
                />

                <Detail
                  icon={
                    <UserRound className="h-4 w-4" />
                  }
                  label="Profissional"
                  value={
                    selectedAppointment.professional
                  }
                />

                <Detail
                  icon={
                    <CalendarDays className="h-4 w-4" />
                  }
                  label="Data"
                  value={formatDate(
                    selectedAppointment.date
                  )}
                />

                <Detail
                  icon={
                    <Clock className="h-4 w-4" />
                  }
                  label="Horário"
                  value={
                    selectedAppointment.time
                  }
                />

                <Detail
                  icon={
                    <Banknote className="h-4 w-4" />
                  }
                  label="Preço"
                  value={formatMoney(
                    getAppointmentPrice(
                      selectedAppointment
                    )
                  )}
                />

                <Detail
                  icon={
                    <CreditCard className="h-4 w-4" />
                  }
                  label="Pagamento"
                  value={getPaymentLabel(
                    selectedAppointment.payment
                  )}
                />

                {String(
                  selectedAppointment.payment
                ).toLowerCase() === "paid" && (
                  <>
                    <Detail
                      icon={
                        <CheckCircle2 className="h-4 w-4" />
                      }
                      label="Valor pago"
                      value={formatMoney(
                        selectedAppointment.paymentAmount ??
                          getAppointmentPrice(
                            selectedAppointment
                          )
                      )}
                    />

                    <Detail
                      icon={
                        <CreditCard className="h-4 w-4" />
                      }
                      label="Método de pagamento"
                      value={getPaymentMethodLabel(
                        selectedAppointment.paymentMethod
                      )}
                    />

                    {selectedAppointment.paidAt && (
                      <Detail
                        icon={
                          <CalendarDays className="h-4 w-4" />
                        }
                        label="Pagamento recebido em"
                        value={new Date(
                          selectedAppointment.paidAt
                        ).toLocaleString(
                          "pt-AO",
                          {
                            dateStyle:
                              "short",
                            timeStyle:
                              "short",
                          }
                        )}
                      />
                    )}
                  </>
                )}

                {/* RECIBO */}

                {String(
                  selectedAppointment.payment
                ).toLowerCase() === "paid" && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm">
                          <Receipt className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Comprovativo
                          </p>

                          <p className="mt-1 truncate text-sm font-semibold text-gray-900">
                            Recibo do pagamento
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={
                          loadingReceipt ===
                          selectedAppointment.id
                        }
                        onClick={() =>
                          handleViewReceipt(
                            selectedAppointment
                          )
                        }
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isOpeningReceipt(
                          loadingReceipt,
                          selectedAppointment.id
                        ) ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Abrindo...
                          </>
                        ) : (
                          <>
                            <Receipt className="h-4 w-4" />
                            Ver recibo
                            <ExternalLink className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </div>

                    <p className="mt-3 text-xs leading-5 text-gray-500">
                      O recibo será apresentado
                      na página de pagamentos.
                    </p>
                  </div>
                )}

                {selectedAppointment.notes && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Observações
                    </p>

                    <p className="mt-2 text-sm leading-6 text-gray-700">
                      {
                        selectedAppointment.notes
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* STATUS */}

            {canEditAppointment(
              selectedAppointment
            ) &&
              isOpenStatus(
                selectedAppointment.status
              ) && (
                <div className="shrink-0 border-t border-gray-100 px-6 py-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Status:{" "}
                    <span className="text-gray-700">
                      {getStatusLabel(
                        selectedAppointment.status
                      )}
                    </span>
                  </p>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {isPendingStatus(
                      selectedAppointment.status
                    ) && (
                      <StatusButton
                        label="Confirmar"
                        busyLabel="Confirmando..."
                        icon={
                          <CheckCircle2 className="h-4 w-4" />
                        }
                        className="bg-blue-600 text-white hover:bg-blue-700"
                        busy={
                          changingStatus?.id ===
                            selectedAppointment.id &&
                          changingStatus.status ===
                            "confirmed"
                        }
                        disabled={
                          changingStatus !== null
                        }
                        onClick={() =>
                          changeStatus(
                            selectedAppointment,
                            "confirmed"
                          )
                        }
                      />
                    )}

                    <StatusButton
                      label="Não compareceu"
                      busyLabel="Salvando..."
                      icon={
                        <UserX className="h-4 w-4" />
                      }
                      className="border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      busy={
                        changingStatus?.id ===
                          selectedAppointment.id &&
                        changingStatus.status ===
                          "no_show"
                      }
                      disabled={
                        changingStatus !== null
                      }
                      onClick={() =>
                        changeStatus(
                          selectedAppointment,
                          "no_show"
                        )
                      }
                    />

                    <StatusButton
                      label="Cancelar"
                      busyLabel="Cancelando..."
                      icon={
                        <XCircle className="h-4 w-4" />
                      }
                      className="border border-red-200 bg-white text-red-600 hover:bg-red-50"
                      busy={
                        changingStatus?.id ===
                          selectedAppointment.id &&
                        changingStatus.status ===
                          "cancelled"
                      }
                      disabled={
                        changingStatus !== null
                      }
                      onClick={() =>
                        changeStatus(
                          selectedAppointment,
                          "cancelled"
                        )
                      }
                    />
                  </div>
                </div>
              )}

            {/* RODAPÉ */}

            <div className="shrink-0 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
              <button
                type="button"
                onClick={() =>
                  setSelectedAppointment(null)
                }
                className="w-full rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}

      {editingAppointment && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!isSaving) {
              setEditingAppointment(null);
              setValidationError("");
            }
          }}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {/* CABEÇALHO */}

            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Editar
                </p>

                <h2 className="mt-1 text-xl font-semibold text-gray-950">
                  Editar Agendamento
                </h2>
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setEditingAppointment(null);
                  setValidationError("");
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* CONTEÚDO */}

            <div className="overflow-y-auto p-6">
              {validationError && (
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                  <div>
                    <p className="text-sm font-semibold text-red-800">
                      Não foi possível salvar
                    </p>

                    <p className="mt-1 text-sm text-red-700">
                      {validationError}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <EditField
                  label="Cliente"
                  value={
                    editingAppointment.client
                  }
                  onChange={(value) => {
                    setValidationError("");

                    setEditingAppointment(
                      (current) =>
                        current
                          ? {
                              ...current,
                              client: value,
                            }
                          : null
                    );
                  }}
                />

                <EditField
                  label="Serviço"
                  value={
                    editingAppointment.service
                  }
                  onChange={(value) => {
                    setValidationError("");

                    setEditingAppointment(
                      (current) =>
                        current
                          ? {
                              ...current,
                              service: value,
                            }
                          : null
                    );
                  }}
                />

                <EditField
                  label="Profissional"
                  value={
                    editingAppointment.professional
                  }
                  onChange={(value) => {
                    setValidationError("");

                    setEditingAppointment(
                      (current) =>
                        current
                          ? {
                              ...current,
                              professional:
                                value,
                            }
                          : null
                    );
                  }}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <EditField
                    label="Data"
                    type="date"
                    value={
                      editingAppointment.date
                    }
                    onChange={(value) => {
                      setValidationError("");

                      setEditingAppointment(
                        (current) =>
                          current
                            ? {
                                ...current,
                                date: value,
                              }
                            : null
                      );
                    }}
                  />

                  <EditField
                    label="Horário"
                    type="time"
                    value={
                      editingAppointment.time
                    }
                    onChange={(value) => {
                      setValidationError("");

                      setEditingAppointment(
                        (current) =>
                          current
                            ? {
                                ...current,
                                time: value,
                              }
                            : null
                      );
                    }}
                  />
                </div>

                {/* PREÇO */}

                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                        Preço do serviço
                      </p>

                      <p className="mt-1 text-lg font-bold text-gray-950">
                        {formatMoney(
                          getAppointmentPrice(
                            editingAppointment
                          )
                        )}
                      </p>
                    </div>

                    <Banknote className="h-6 w-6 text-blue-600" />
                  </div>
                </div>

                {/* PAGAMENTO */}

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Pagamento
                      </p>

                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {getPaymentLabel(
                          editingAppointment.payment
                        )}
                      </p>
                    </div>

                    <CreditCard className="h-5 w-5 text-gray-400" />
                  </div>

                  {String(
                    editingAppointment.payment
                  ).toLowerCase() ===
                    "paid" && (
                    <div className="mt-3 space-y-1 border-t border-gray-200 pt-3 text-sm">
                      <p>
                        <span className="text-gray-500">
                          Valor:
                        </span>{" "}
                        <strong>
                          {formatMoney(
                            editingAppointment.paymentAmount ??
                              getAppointmentPrice(
                                editingAppointment
                              )
                          )}
                        </strong>
                      </p>

                      <p>
                        <span className="text-gray-500">
                          Método:
                        </span>{" "}
                        <strong>
                          {getPaymentMethodLabel(
                            editingAppointment.paymentMethod
                          )}
                        </strong>
                      </p>
                    </div>
                  )}
                </div>

                {/* OBSERVAÇÕES */}

                <EditField
                  label="Observações"
                  value={
                    editingAppointment.notes ??
                    ""
                  }
                  onChange={(value) => {
                    setValidationError("");

                    setEditingAppointment(
                      (current) =>
                        current
                          ? {
                              ...current,
                              notes: value,
                            }
                          : null
                    );
                  }}
                />
              </div>
            </div>

            {/* RODAPÉ */}

            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setEditingAppointment(null);
                  setValidationError("");
                }}
                className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={saveEdit}
                className="flex items-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />

                {isSaving
                  ? "Salvando..."
                  : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR */}
      
      {deletingAppointment && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!isDeleting) {
              setDeletingAppointment(null);
              setValidationError("");
            }
          }}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-gray-950">
                    Excluir agendamento?
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Tem certeza de que deseja
                    excluir este agendamento?
                    Esta ação não pode ser
                    desfeita.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-gray-50 p-4">
                <p className="font-semibold text-gray-900">
                  {
                    deletingAppointment.client
                  }
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {
                    deletingAppointment.service
                  }
                </p>

                <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />

                    {formatDate(
                      deletingAppointment.date
                    )}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />

                    {
                      deletingAppointment.time
                    }
                  </span>

                  <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                    <Banknote className="h-3.5 w-3.5" />

                    {formatMoney(
                      getAppointmentPrice(
                        deletingAppointment
                      )
                    )}
                  </span>
                </div>
              </div>

              {validationError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {validationError}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeletingAppointment(null);
                  setValidationError("");
                }}
                className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />

                {isDeleting
                  ? "Excluindo..."
                  : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* RECIBO — HELPER */

function isOpeningReceipt(
  loadingReceipt: string | null,
  appointmentId: string
): boolean {
  return loadingReceipt === appointmentId;
}

/* DETAIL */

/*BOTÃO DE STATUS*/

function StatusButton({
  label,
  busyLabel,
  icon,
  className,
  busy,
  disabled,
  onClick,
}: {
  label: string;
  busyLabel: string;
  icon: React.ReactNode;
  className: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {busy ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
      {busy ? busyLabel : label}
    </button>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-gray-400">
          {label}
        </p>

        <p className="mt-0.5 truncate text-sm font-medium text-gray-900">
          {value ?? "-"}
        </p>
      </div>
    </div>
  );
}

/* EDIT FIELD */

function EditField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-800">
        {label}
      </label>

      <input
        type={type}
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      />
    </div>
  );
}

