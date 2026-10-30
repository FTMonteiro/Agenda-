import type { AvailabilitySlotDTO } from "@slotix/types";
import { env } from "../../config/env";
import { ValidationError } from "../../shared/errors";
import { computeAvailableSlots, resolveDayHours, type TimeWindow } from "../../shared/utils/scheduling";
import { weekdayOf, zonedDayStart } from "../../shared/utils/timezone";
import { businessesRepository } from "../businesses";
import { professionalsRepository } from "../professionals";
import { appointmentsRepository, validateBookingContext } from "../appointments";
import type { GetAvailabilityInput } from "./availability.schema";

export const availabilityService = {
  async getSlots(query: GetAvailabilityInput): Promise<AvailabilitySlotDTO[]> {
    const { service } = await validateBookingContext(query.businessId, query.serviceId, query.professionalId);

    // The day as the business lives it (APP_TIMEZONE), not the server's UTC day.
    const dayStart = zonedDayStart(query.date, env.APP_TIMEZONE);
    if (Number.isNaN(dayStart.getTime())) {
      throw new ValidationError("Data inválida.", "INVALID_DATE");
    }
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);

    const [allHours, existingAppointments, blocks] = await Promise.all([
      businessesRepository.findHours(query.businessId),
      appointmentsRepository.findActiveInWindow(query.professionalId, dayStart, dayEnd),
      professionalsRepository.findBlocksInRange(query.professionalId, dayStart, dayEnd),
    ]);

    const dayHours = resolveDayHours(allHours, weekdayOf(query.date));

    const busy: TimeWindow[] = [
      ...existingAppointments.map((a) => ({ start: a.scheduledAt, end: new Date(a.scheduledAt.getTime() + a.durationMinutes * 60_000) })),
      ...blocks.map((b) => ({ start: b.startAt, end: b.endAt })),
    ];

    const slots = computeAvailableSlots({ date: query.date, timeZone: env.APP_TIMEZONE, durationMinutes: service.duration, dayHours, busy });
    return slots.map((slot) => ({ time: slot.toISOString() }));
  },
};
