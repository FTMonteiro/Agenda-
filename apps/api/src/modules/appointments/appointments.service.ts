import type { AppointmentDTO } from "@slotix/types";
import type { CreateAppointmentInput, RescheduleAppointmentInput } from "@slotix/validation";
import type { CreateWalkInAppointmentInput } from "./appointments.schema";
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from "../../shared/errors";
import { domainEvents } from "../../shared/events/domainEvents";
import { isSlotAvailable, resolveDayHours, type TimeWindow } from "../../shared/utils/scheduling";
import { businessesRepository, getBusinessOrThrow } from "../businesses";
import { getServiceOrThrow } from "../services";
import { getProfessionalOrThrow, professionalsRepository } from "../professionals";
import { getWalkInClientOrThrow } from "../clients";
import { assertStaffOfBusiness } from "../../shared/authz";
import { appointmentsRepository } from "./appointments.repository";

type RequesterRole = "CUSTOMER" | "OWNER" | "EMPLOYEE" | "ADMIN";

const OPEN_STATUSES = new Set(["PENDING", "CONFIRMED"]);

function toAppointmentDTO(appointment: {
  id: string;
  businessId: string;
  clientId: string | null;
  walkInClientId: string | null;
  serviceId: string;
  professionalId: string;
  scheduledAt: Date;
  price: { toNumber(): number };
  status: AppointmentDTO["status"];
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AppointmentDTO {
  return {
    id: appointment.id,
    businessId: appointment.businessId,
    clientId: appointment.clientId,
    walkInClientId: appointment.walkInClientId,
    serviceId: appointment.serviceId,
    professionalId: appointment.professionalId,
    scheduledAt: appointment.scheduledAt.toISOString(),
    price: appointment.price.toNumber(),
    status: appointment.status,
    notes: appointment.notes,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
  };
}

// Checks business hours + professional time-off blocks + existing bookings together —
// the same three ingredients `availability`'s slot computation uses (see
// shared/utils/scheduling.ts), so a slot this accepts is exactly one `/availability`
// would have listed as free.
async function assertSlotAvailable(businessId: string, professionalId: string, scheduledAt: Date, durationMinutes: number, excludeId?: string) {
  const start = scheduledAt;
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  // 24h lookback safely covers any realistically-sized service duration ending after `start`.
  const windowStart = new Date(start.getTime() - 24 * 60 * 60_000);

  const [allHours, existingAppointments, blocks] = await Promise.all([
    businessesRepository.findHours(businessId),
    appointmentsRepository.findActiveInWindow(professionalId, windowStart, end, excludeId),
    professionalsRepository.findBlocksInRange(professionalId, windowStart, end),
  ]);

  const dayHours = resolveDayHours(allHours, start.getDay());

  const busy: TimeWindow[] = [
    ...existingAppointments.map((a) => ({ start: a.scheduledAt, end: new Date(a.scheduledAt.getTime() + a.durationMinutes * 60_000) })),
    ...blocks.map((b) => ({ start: b.startAt, end: b.endAt })),
  ];

  if (!isSlotAvailable({ start, end }, dayHours, busy)) {
    throw new ConflictError("Este horário não está disponível.", "APPOINTMENT_NOT_AVAILABLE");
  }
}

export async function getAppointmentOrThrow(id: string) {
  const appointment = await appointmentsRepository.findById(id);
  if (!appointment) throw new NotFoundError("Agendamento não encontrado.", "APPOINTMENT_NOT_FOUND");
  return appointment;
}

// Shared with `availability` (which needs the exact same "is this a legal booking
// target" checks to know whose calendar to compute slots from) so the two modules can't
// silently drift — `availability` importing this makes `appointments` the one-directional
// dependency owner, avoiding a cycle.
export async function validateBookingContext(businessId: string, serviceId: string, professionalId: string) {
  await getBusinessOrThrow(businessId);

  const service = await getServiceOrThrow(serviceId);
  if (service.businessId !== businessId) {
    throw new ValidationError("O serviço não pertence a este negócio.", "SERVICE_BUSINESS_MISMATCH");
  }
  if (!service.active) {
    throw new ValidationError("Este serviço não está disponível.", "SERVICE_INACTIVE");
  }

  const professional = await getProfessionalOrThrow(professionalId);
  if (professional.businessId !== businessId) {
    throw new ValidationError("O profissional não pertence a este negócio.", "PROFESSIONAL_BUSINESS_MISMATCH");
  }
  if (!professional.active) {
    throw new ValidationError("Este profissional não está disponível.", "PROFESSIONAL_INACTIVE");
  }

  return { service, professional };
}

async function assertCanManage(appointment: { businessId: string; clientId: string | null }, requesterId: string, requesterRole: RequesterRole) {
  if (requesterRole === "ADMIN") return;
  if (requesterRole === "CUSTOMER" && appointment.clientId === requesterId) return;

  // The business side: its owner, or an EMPLOYEE who works there.
  if (requesterRole === "OWNER" || requesterRole === "EMPLOYEE") {
    await assertStaffOfBusiness(appointment.businessId, requesterId);
    return;
  }

  throw new AuthorizationError();
}

export const appointmentsService = {
  async create(clientId: string, input: CreateAppointmentInput): Promise<AppointmentDTO> {
    const { service } = await validateBookingContext(input.businessId, input.serviceId, input.professionalId);

    const scheduledAt = new Date(input.scheduledAt);
    if (scheduledAt.getTime() <= Date.now()) {
      throw new ValidationError("A data do agendamento tem de ser no futuro.", "APPOINTMENT_IN_PAST");
    }

    await assertSlotAvailable(input.businessId, input.professionalId, scheduledAt, service.duration);

    const appointment = await appointmentsRepository.create({
      businessId: input.businessId,
      clientId,
      serviceId: input.serviceId,
      professionalId: input.professionalId,
      scheduledAt,
      durationMinutes: service.duration,
      price: service.price,
      notes: input.notes,
    });

    domainEvents.emitEvent("AppointmentCreated", toAppointmentDTO(appointment));
    return toAppointmentDTO(appointment);
  },

  // Booked by the business (OWNER/EMPLOYEE) on behalf of someone with no account —
  // otherwise identical to `create`, including slot-availability and future-date checks.
  async createForWalkIn(requesterId: string, input: CreateWalkInAppointmentInput): Promise<AppointmentDTO> {
    await assertStaffOfBusiness(input.businessId, requesterId);
    await getWalkInClientOrThrow(input.walkInClientId);

    const { service } = await validateBookingContext(input.businessId, input.serviceId, input.professionalId);

    const scheduledAt = new Date(input.scheduledAt);
    if (scheduledAt.getTime() <= Date.now()) {
      throw new ValidationError("A data do agendamento tem de ser no futuro.", "APPOINTMENT_IN_PAST");
    }

    await assertSlotAvailable(input.businessId, input.professionalId, scheduledAt, service.duration);

    const appointment = await appointmentsRepository.create({
      businessId: input.businessId,
      walkInClientId: input.walkInClientId,
      serviceId: input.serviceId,
      professionalId: input.professionalId,
      scheduledAt,
      durationMinutes: service.duration,
      price: service.price,
      notes: input.notes,
    });

    return toAppointmentDTO(appointment);
  },

  async listMineAsClient(clientId: string): Promise<AppointmentDTO[]> {
    const appointments = await appointmentsRepository.findByClient(clientId);
    return appointments.map(toAppointmentDTO);
  },

  async listByBusiness(businessId: string, requesterId: string): Promise<AppointmentDTO[]> {
    await assertStaffOfBusiness(businessId, requesterId);

    const appointments = await appointmentsRepository.findByBusiness(businessId);
    return appointments.map(toAppointmentDTO);
  },

  async getById(id: string, requesterId: string, requesterRole: RequesterRole): Promise<AppointmentDTO> {
    const appointment = await getAppointmentOrThrow(id);
    await assertCanManage(appointment, requesterId, requesterRole);
    return toAppointmentDTO(appointment);
  },

  async cancel(id: string, requesterId: string, requesterRole: RequesterRole): Promise<AppointmentDTO> {
    const appointment = await getAppointmentOrThrow(id);
    await assertCanManage(appointment, requesterId, requesterRole);

    if (!OPEN_STATUSES.has(appointment.status)) {
      throw new ConflictError("Este agendamento já não pode ser cancelado.", "APPOINTMENT_NOT_CANCELLABLE");
    }

    const updated = await appointmentsRepository.update(id, { status: "CANCELLED" });
    domainEvents.emitEvent("AppointmentCancelled", toAppointmentDTO(updated));
    return toAppointmentDTO(updated);
  },

  async confirm(id: string, requesterId: string): Promise<AppointmentDTO> {
    const appointment = await getAppointmentOrThrow(id);
    await assertStaffOfBusiness(appointment.businessId, requesterId);

    if (appointment.status !== "PENDING") {
      throw new ConflictError("Só é possível confirmar agendamentos pendentes.", "APPOINTMENT_NOT_PENDING");
    }

    const updated = await appointmentsRepository.update(id, { status: "CONFIRMED" });
    return toAppointmentDTO(updated);
  },

  async complete(id: string, requesterId: string): Promise<AppointmentDTO> {
    const appointment = await getAppointmentOrThrow(id);
    await assertStaffOfBusiness(appointment.businessId, requesterId);

    if (!OPEN_STATUSES.has(appointment.status)) {
      throw new ConflictError("Este agendamento não pode ser concluído.", "APPOINTMENT_NOT_COMPLETABLE");
    }

    const updated = await appointmentsRepository.update(id, { status: "COMPLETED" });
    return toAppointmentDTO(updated);
  },

  async markNoShow(id: string, requesterId: string): Promise<AppointmentDTO> {
    const appointment = await getAppointmentOrThrow(id);
    await assertStaffOfBusiness(appointment.businessId, requesterId);

    if (!OPEN_STATUSES.has(appointment.status)) {
      throw new ConflictError("Este agendamento não pode ser marcado como falta.", "APPOINTMENT_NOT_NO_SHOWABLE");
    }

    const updated = await appointmentsRepository.update(id, { status: "NO_SHOW" });
    return toAppointmentDTO(updated);
  },

  async reschedule(id: string, requesterId: string, requesterRole: RequesterRole, input: RescheduleAppointmentInput): Promise<AppointmentDTO> {
    const appointment = await getAppointmentOrThrow(id);
    await assertCanManage(appointment, requesterId, requesterRole);

    if (!OPEN_STATUSES.has(appointment.status)) {
      throw new ConflictError("Este agendamento não pode ser reagendado.", "APPOINTMENT_NOT_RESCHEDULABLE");
    }

    const scheduledAt = new Date(input.scheduledAt);
    if (scheduledAt.getTime() <= Date.now()) {
      throw new ValidationError("A data do agendamento tem de ser no futuro.", "APPOINTMENT_IN_PAST");
    }

    await assertSlotAvailable(appointment.businessId, appointment.professionalId, scheduledAt, appointment.durationMinutes, id);

    const updated = await appointmentsRepository.update(id, { scheduledAt });
    return toAppointmentDTO(updated);
  },
};
