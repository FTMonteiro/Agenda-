export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type AppointmentPayment =
  | "pending"
  | "partial"
  | "paid";

export type PaymentMethod =
  | "CASH"
  | "CARD"
  | "TRANSFER"
  | "MOBILE_MONEY"
  | null;

export interface Appointment {
  id: string;

  clientId: string;
  serviceId: string;
  professionalId: string;

  client: string;
  service: string;
  professional: string;

  date: string;
  time: string;

  price?: number;

  payment: AppointmentPayment;

  /*
   * Valor efetivamente recebido no pagamento.
   * Este é o campo usado pelo dashboard para calcular a receita.
   */
  paymentAmount?: number | null;

  /*
   * Mantido para compatibilidade com componentes antigos.
   */
  paidAmount?: number | null;

  paymentMethod?: PaymentMethod;

  paymentStatus?: string | null;

  paidAt?: string | null;

  status: AppointmentStatus;

  notes?: string | null;
}