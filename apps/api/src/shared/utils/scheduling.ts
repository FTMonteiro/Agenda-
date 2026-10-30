import { zonedDateKey, zonedDayStart } from "./timezone";

export interface TimeWindow {
  start: Date;
  end: Date;
}

export interface DayHours {
  startMinute: number;
  endMinute: number;
}

const OPEN_ALL_DAY: DayHours[] = [{ startMinute: 0, endMinute: 1440 }];

/**
 * A business with no BusinessHours rows at all hasn't opted into the feature yet, and is
 * treated as open all day, every day, rather than closed. Once at least one day is
 * configured, a day with no rows of its own (e.g. Sunday) is correctly "closed".
 */
export function resolveDayHours(allHours: { dayOfWeek: number; startMinute: number; endMinute: number }[], dayOfWeek: number): DayHours[] {
  if (allHours.length === 0) return OPEN_ALL_DAY;
  return allHours.filter((h) => h.dayOfWeek === dayOfWeek);
}

function windowsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

// Business hours are wall-clock minutes in `timeZone`, counted from that day's midnight there.
export function isWithinBusinessHours(slot: TimeWindow, dayHours: DayHours[], timeZone: string): boolean {
  const dayStart = zonedDayStart(zonedDateKey(slot.start, timeZone), timeZone);

  const startMinute = (slot.start.getTime() - dayStart.getTime()) / 60_000;
  const endMinute = (slot.end.getTime() - dayStart.getTime()) / 60_000;

  return dayHours.some((hours) => startMinute >= hours.startMinute && endMinute <= hours.endMinute);
}

export function isFreeOfConflicts(slot: TimeWindow, busy: TimeWindow[]): boolean {
  return !busy.some((window) => windowsOverlap(slot.start.getTime(), slot.end.getTime(), window.start.getTime(), window.end.getTime()));
}

export function isSlotAvailable(slot: TimeWindow, dayHours: DayHours[], busy: TimeWindow[], timeZone: string, now: Date = new Date()): boolean {
  if (slot.start.getTime() <= now.getTime()) return false;
  if (!isWithinBusinessHours(slot, dayHours, timeZone)) return false;
  return isFreeOfConflicts(slot, busy);
}

/**
 * Enumerates every slot start time (stepped by `stepMinutes`) on the calendar day `date`
 * ("2026-11-01", in `timeZone`) where a `durationMinutes`-long appointment would be
 * available, given the business's open windows for that weekday and everything already
 * occupying the professional's day (existing appointments + time-off blocks, both passed
 * in as `busy`).
 */
export function computeAvailableSlots(params: {
  date: string;
  timeZone: string;
  durationMinutes: number;
  dayHours: DayHours[];
  busy: TimeWindow[];
  stepMinutes?: number;
  now?: Date;
}): Date[] {
  const { date, timeZone, durationMinutes, dayHours, busy, stepMinutes = 15, now = new Date() } = params;

  const dayStart = zonedDayStart(date, timeZone);

  const slots: Date[] = [];

  for (const hours of dayHours) {
    for (let minute = hours.startMinute; minute + durationMinutes <= hours.endMinute; minute += stepMinutes) {
      const start = new Date(dayStart.getTime() + minute * 60_000);
      const end = new Date(start.getTime() + durationMinutes * 60_000);

      if (isSlotAvailable({ start, end }, dayHours, busy, timeZone, now)) {
        slots.push(start);
      }
    }
  }

  return slots;
}
