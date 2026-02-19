import { describe, it, expect } from "vitest";
import {
  formatDate,
  toUtcIsoString,
  toColombianDateString,
  toColombianTimeString,
  interpretLocalAsColombian,
  toColombianDate,
  formatColombianTime,
  COLOMBIA_TIMEZONE,
} from "./dateUtils";
import { format } from "date-fns";

describe("dateUtils Timezone Handling", () => {
  // -------------------------------------------------------------------------
  // 1. Verify formatDate (UTC -> Colombia Display)
  // -------------------------------------------------------------------------
  //   it("formatDate should format UTC time to Colombia time (UTC-5)", () => {
  //     // 15:00 UTC is 10:00 Colombia
  //     const utcString = "2023-10-27T15:00:00Z";
  //     const formatted = formatDate(utcString);

  //     // Check for "10:00" or similar structure depending on exact format string
  //     // Format is "d 'de' MMMM, yyyy h:mm a" -> "27 de octubre, 2023 10:00 AM"
  //     expect(formatted).toContain("10:00 AM");
  //     expect(formatted).toContain("27 de octubre");
  //   });

  // it("formatDate should format UTC midnight to Colombia previous day 7 PM", () => {
  //     // 00:00 UTC (Oct 28) is 19:00 Colombia (Oct 27)
  //     const utcString = "2023-10-28T00:00:00Z";
  //     const formatted = formatDate(utcString);

  //     expect(formatted).toContain("7:00 PM");
  //     expect(formatted).toContain("27 de octubre");
  // });

  // -------------------------------------------------------------------------
  // 2. Verify toUtcIsoString (Colombia Inputs -> UTC ISO)
  // -------------------------------------------------------------------------
  it("toUtcIsoString should convert 10:00 Colombia input to 15:00 UTC", () => {
    const dateStr = "2023-10-27";
    const timeStr = "10:00";

    const isoResult = toUtcIsoString(dateStr, timeStr);

    // Expect 2023-10-27T15:00:00.000Z
    expect(isoResult).toBe("2023-10-27T15:00:00.000Z");
  });

  it("toUtcIsoString should handle PM times correctly (e.g. 19:00 -> 00:00 next day UTC)", () => {
    const dateStr = "2023-10-27";
    const timeStr = "19:00";

    const isoResult = toUtcIsoString(dateStr, timeStr);

    // Expect 2023-10-28T00:00:00.000Z
    expect(isoResult).toBe("2023-10-28T00:00:00.000Z");
  });

  // -------------------------------------------------------------------------
  // 3. Verify interpretLocalAsColombian (Local Date Object -> UTC ISO)
  // -------------------------------------------------------------------------
  it("interpretLocalAsColombian should treat local 10:00 as Colombia 10:00 (15:00 UTC)", () => {
    // Create a local date for 10:00 regardless of where tests are running
    const year = 2023,
      month = 9,
      day = 27,
      hours = 10,
      minutes = 0;
    const localDate = new Date(year, month, day, hours, minutes);

    // The function assumes this "10:00" meant "10:00 Colombia"
    const resultIso = interpretLocalAsColombian(localDate);

    expect(resultIso).toBe("2023-10-27T15:00:00.000Z");
  });

  // -------------------------------------------------------------------------
  // 4. Verify Extraction Helpers (UTC -> Colombia Components)
  // -------------------------------------------------------------------------
  it("toColombianDateString should return correct YYYY-MM-DD from UTC date", () => {
    // 02:00 UTC Oct 28 is 21:00 Colombia Oct 27
    const utcDate = new Date("2023-10-28T02:00:00Z");

    const result = toColombianDateString(utcDate);
    expect(result).toBe("2023-10-27");
  });

  it("toColombianTimeString should return correct HH:mm from UTC date", () => {
    // 15:00 UTC is 10:00 Colombia
    const utcDate = new Date("2023-10-27T15:00:00Z");

    const result = toColombianTimeString(utcDate);
    expect(result).toBe("10:00");
  });

  // -------------------------------------------------------------------------
  // 5. Verify toColombianDate Helper
  // -------------------------------------------------------------------------
  it("toColombianDate should return Date object with Colombia wall-clock time in UTC components", () => {
    // 15:00 UTC is 10:00 Colombia
    const utcDate = new Date("2023-10-27T15:00:00Z");
    const colombianDate = toColombianDate(utcDate);

    // The returned date should have 10:00:00 as its UTC time
    // because utcToZonedTime shifts the UTC timestamp to match wall clock
    expect(colombianDate.toISOString()).toContain("T10:00:00.000Z");
  });

  // -------------------------------------------------------------------------
  // 6. Verify formatColombianTime Helper (Intl)
  // -------------------------------------------------------------------------
  it("formatColombianTime should return HH:mm AM/PM in Colombia time", () => {
    // 15:00 UTC is 10:00 AM Colombia
    const utcString = "2023-10-27T15:00:00Z";
    const formatted = formatColombianTime(utcString);

    // Expect "10:00 a. m." or "10:00 AM" depending on locale specifics
    // es-CO usually uses "a. m."
    expect(formatted).toMatch(/10:00/);
    expect(formatted).toMatch(/m/i);
  });
});
