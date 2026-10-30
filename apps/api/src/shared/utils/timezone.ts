/*
 * Wall-clock time in the businesses' time zone (APP_TIMEZONE, Africa/Luanda by default).
 * The server itself runs in UTC, so "08:00 on Monday" in the business hours has to be
 * read in that zone — never with the process's own getHours()/getDay()/setHours().
 */

function parts(instant: Date, timeZone: string) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

// How far the zone's wall clock is ahead of UTC at that instant, in milliseconds.
function offsetAt(instant: Date, timeZone: string): number {
  const p = parts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

// The instant the given calendar day ("2026-11-01") starts in the zone.
export function zonedDayStart(date: string, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const guess = Date.UTC(year, month - 1, day);
  if (Number.isNaN(guess)) return new Date(NaN);
  const first = guess - offsetAt(new Date(guess), timeZone);
  // Again with the offset at the result, in case a DST change falls in between.
  return new Date(guess - offsetAt(new Date(first), timeZone));
}

// The calendar day ("2026-11-01") the instant falls on in the zone.
export function zonedDateKey(instant: Date, timeZone: string): string {
  const p = parts(instant, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

// Day of the week of a calendar day (0 = Sunday), the same numbering as BusinessHours.
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}
