import type {
  AppointmentDTO,
  ClientDTO,
  PaymentDTO,
  PaymentMethod,
  ProfessionalDTO,
  ServiceDTO,
  WalkInClientDTO,
} from "@slotix/types";
import { apiProxyFetch } from "./api-proxy";

// Shared plumbing for the app/api/** routes that translate between the shapes the
// dashboard pages were written against (the old Next.js + Prisma backend) and the ones
// apps/api actually returns. The pages themselves are untouched by the migration.

export class ApiCallError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

// Unwraps the API's { success, data } envelope, throwing ApiCallError (with the API's own
// status, code and message) on anything else.
export async function apiCall<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiProxyFetch(path, init);
  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) {
    throw new ApiCallError(
      response.ok ? 502 : response.status,
      json?.error?.code ?? "API_ERROR",
      json?.error?.message ?? "A API não respondeu como esperado.",
    );
  }

  return json.data as T;
}

export function jsonBody(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

export function errorJson(message: string, status: number, extra: Record<string, unknown> = {}): Response {
  return Response.json({ error: message, ...extra }, { status });
}

// Maps whatever a route's try block threw to the { error } + status shape the pages read.
export function errorResponse(error: unknown, fallback: string): Response {
  if (error instanceof Error && error.message === "UNAUTHORIZED") return errorJson("Não autenticado.", 401);
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return errorJson("Não tem permissão para esta ação.", 403, { code: "FORBIDDEN" });
  }
  if (error instanceof ApiCallError) return errorJson(error.message, error.status, { code: error.code });

  console.error(fallback, error);
  return errorJson(fallback, 500);
}

// The dashboard still speaks the old payment method names.
const METHOD_TO_API: Record<string, PaymentMethod> = {
  CASH: "CASH",
  CARD: "CARD",
  TRANSFER: "BANK_TRANSFER",
  MOBILE_MONEY: "MULTICAIXA",
  BANK_TRANSFER: "BANK_TRANSFER",
  MULTICAIXA: "MULTICAIXA",
  OTHER: "OTHER",
};

export function toApiMethod(method: string): PaymentMethod | null {
  return METHOD_TO_API[method.trim().toUpperCase()] ?? null;
}

export function fromApiMethod(method: PaymentMethod): string {
  if (method === "BANK_TRANSFER") return "TRANSFER";
  if (method === "MULTICAIXA") return "MOBILE_MONEY";
  return method;
}

// The appointment forms send and show a separate date and time with no timezone. Both
// directions go through this server's local time, so what was typed is what is shown.
function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function localDate(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function localTime(value: Date): string {
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function parseLocalDateTime(date: string, time: string): Date | null {
  // nosemgrep: ajinabraham.njsscan.dos.regex_dos.regex_dos -- regex ancoradas e de comprimento fixo: sem retrocesso.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;

  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export interface ClientSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  // Só quem tem conta na app tem foto.
  avatarUrl?: string | null;
}

export interface BusinessLookups {
  services: Map<string, ServiceDTO>;
  professionals: Map<string, ProfessionalDTO>;
  clients: Map<string, ClientSummary>;
  payments: Map<string, PaymentDTO>;
}

// Everything needed to turn the API's id-only AppointmentDTO back into the denormalised
// rows the pages expect (client/service/professional names, payment state). If the
// registered-clients or payments list fails, it comes back empty rather than failing the
// whole request.
export async function loadLookups(businessId: string): Promise<BusinessLookups> {
  const query = `businessId=${encodeURIComponent(businessId)}`;

  const [services, professionals, walkIns, registered, payments] = await Promise.all([
    apiCall<ServiceDTO[]>(`/services?${query}`),
    apiCall<ProfessionalDTO[]>(`/professionals?${query}`),
    apiCall<WalkInClientDTO[]>(`/clients/walk-in?${query}`),
    // Também quem marcou sem se tornar cliente: as marcações precisam do nome de todos.
    apiCall<ClientDTO[]>(`/clients?${query}&includeBookers=true`).catch(() => [] as ClientDTO[]),
    apiCall<PaymentDTO[]>(`/payments?${query}`).catch(() => [] as PaymentDTO[]),
  ]);

  const clients = new Map<string, ClientSummary>();
  for (const client of walkIns) clients.set(client.id, client);
  for (const client of registered) clients.set(client.userId, { id: client.userId, name: client.name, email: client.email, phone: client.phone, avatarUrl: client.avatarUrl });

  return {
    services: new Map(services.map((service) => [service.id, service])),
    professionals: new Map(professionals.map((professional) => [professional.id, professional])),
    clients,
    payments: new Map(payments.map((payment) => [payment.appointmentId, payment])),
  };
}

export function clientOf(appointment: AppointmentDTO, lookups: BusinessLookups): ClientSummary | null {
  return lookups.clients.get(appointment.walkInClientId ?? appointment.clientId ?? "") ?? null;
}

export function formatAppointment(appointment: AppointmentDTO, lookups: BusinessLookups) {
  const client = clientOf(appointment, lookups);
  const service = lookups.services.get(appointment.serviceId);
  const professional = lookups.professionals.get(appointment.professionalId);
  const payment = lookups.payments.get(appointment.id) ?? null;
  const scheduledAt = new Date(appointment.scheduledAt);

  return {
    id: appointment.id,
    client: client?.name ?? "",
    clientId: client?.id ?? null,
    clientEmail: client?.email ?? null,
    clientPhone: client?.phone ?? null,
    service: service?.name ?? "",
    serviceId: appointment.serviceId,
    price: appointment.price,
    duration: service?.duration ?? 0,
    professional: professional?.name ?? "",
    professionalId: appointment.professionalId,
    professionalEmail: null,
    professionalPhone: null,
    specialty: professional?.specialty ?? null,
    date: localDate(scheduledAt),
    time: localTime(scheduledAt),
    dateTime: appointment.scheduledAt,
    status: appointment.status.toLowerCase(),
    notes: appointment.notes ?? "",
    payment: payment?.status === "PAID" ? "paid" : "pending",
    paymentId: payment?.id ?? null,
    paymentAmount: payment ? payment.amount : null,
    paymentMethod: payment ? fromApiMethod(payment.method) : null,
    paymentStatus: payment?.status ?? null,
    paidAt: payment?.paidAt ?? null,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  };
}

// ProfessionalDTO carries no contact details (they live on the linked User, which the
// API doesn't expose), so email and phone are blank unless the caller already knows them.
export function formatProfessional(professional: ProfessionalDTO, contact: { email?: string; phone?: string } = {}) {
  return {
    id: professional.id,
    name: professional.name,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    specialty: professional.specialty ?? "",
    photo: professional.imageUrl,
    active: professional.active,
    emailVerified: false,
    businessId: professional.businessId,
    userId: professional.userId,
    createdAt: professional.createdAt,
    updatedAt: professional.updatedAt,
  };
}

// Services and professionals referenced by an appointment can't be deleted (the database
// refuses). Checked up front so the pages get the old, explanatory 409 — with the
// `reason` they key on — instead of a generic server error.
export async function historyConflict(businessId: string, field: "serviceId" | "professionalId", id: string, label: string): Promise<Response | null> {
  const appointments = await apiCall<AppointmentDTO[]>(`/appointments?businessId=${encodeURIComponent(businessId)}`);
  const count = appointments.filter((appointment) => appointment[field] === id).length;
  if (count === 0) return null;

  const records = count === 1 ? "1 agendamento registrado" : `${count} agendamentos registrados`;
  return errorJson(`Este ${label} possui ${records}. Desative-o em vez de excluir, para preservar o histórico.`, 409, {
    reason: "has_appointments",
  });
}
