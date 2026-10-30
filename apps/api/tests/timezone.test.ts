import { describe, expect, it } from "vitest";
import { computeAvailableSlots, isWithinBusinessHours } from "../src/shared/utils/scheduling";
import { weekdayOf, zonedDateKey, zonedDayStart } from "../src/shared/utils/timezone";

// The server runs in UTC; the businesses live in Luanda (UTC+1). Hours and slots are read
// on the business's clock.
const LUANDA = "Africa/Luanda";

describe("hora do espaço (APP_TIMEZONE)", () => {
  it("o dia começa à meia-noite de Luanda", () => {
    expect(zonedDayStart("2026-11-02", LUANDA).toISOString()).toBe("2026-11-01T23:00:00.000Z");
    expect(zonedDayStart("2026-07-15", "Europe/Lisbon").toISOString()).toBe("2026-07-14T23:00:00.000Z");
    expect(Number.isNaN(zonedDayStart("x", LUANDA).getTime())).toBe(true);
  });

  it("23:30 de Luanda ainda é o mesmo dia, e 00:30 já é o seguinte", () => {
    expect(zonedDateKey(new Date("2026-11-02T22:30:00Z"), LUANDA)).toBe("2026-11-02");
    expect(zonedDateKey(new Date("2026-11-02T23:30:00Z"), LUANDA)).toBe("2026-11-03");
    expect(weekdayOf("2026-11-02")).toBe(1);
  });

  it("um espaço que abre às 08:00 oferece o primeiro horário às 08:00 de Luanda", () => {
    const slots = computeAvailableSlots({
      date: "2026-11-02",
      timeZone: LUANDA,
      durationMinutes: 30,
      dayHours: [{ startMinute: 8 * 60, endMinute: 12 * 60 }],
      busy: [],
      now: new Date("2026-10-30T00:00:00Z"),
    });
    expect(slots[0].toISOString()).toBe("2026-11-02T07:00:00.000Z");
    expect(slots.at(-1)!.toISOString()).toBe("2026-11-02T10:30:00.000Z");
  });

  it("08:00 de Luanda está dentro do horário; 07:30 não", () => {
    const hours = [{ startMinute: 8 * 60, endMinute: 18 * 60 }];
    const at = (iso: string) => ({ start: new Date(iso), end: new Date(new Date(iso).getTime() + 30 * 60_000) });
    expect(isWithinBusinessHours(at("2026-11-02T07:00:00Z"), hours, LUANDA)).toBe(true);
    expect(isWithinBusinessHours(at("2026-11-02T06:30:00Z"), hours, LUANDA)).toBe(false);
  });
});
