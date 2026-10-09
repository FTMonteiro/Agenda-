import type { AvailabilitySlotDTO } from "@slotix/types";
import { ValidationError } from "../../shared/errors";
import { computeAvailableSlots, resolveDayHours, type TimeWindow } from "../../shared/utils/scheduling";
import { businessesRepository } from "../businesses";
import { professionalsRepository } from "../professionals";
import { appointmentsRepository, validateBookingContext } from "../appointments";
import type { GetAvailabilityInput } from "./availability.schema";

export const availabilityService = {
  async getSlots(query: GetAvailabilityInput): Promise<AvailabilitySlotDTO[]> {
    const { service } = await validateBookingContext(query.businessId, query.serviceId, query.professionalId);

    const date = new Date(`${query.date}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      throw new ValidationError("Data inválida.", "INVALID_DATE");
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);

    const [allHours, existingAppointments, blocks] = await Promise.all([
      businessesRepository.findHours(query.businessId),
      appointmentsRepository.findActiveInWindow(query.professionalId, dayStart, dayEnd),
      professionalsRepository.findBlocksInRange(query.professionalId, dayStart, dayEnd),
    ]);

    const dayHours = resolveDayHours(allHours, date.getDay());

    const busy: TimeWindow[] = [
      ...existingAppointments.map((a) => ({ start: a.scheduledAt, end: new Date(a.scheduledAt.getTime() + a.durationMinutes * 60_000) })),
      ...blocks.map((b) => ({ start: b.startAt, end: b.endAt })),
    ];

    const slots = computeAvailableSlots({ date: dayStart, durationMinutes: service.duration, dayHours, busy });
    return slots.map((slot) => ({ time: slot.toISOString() }));
  },
};
