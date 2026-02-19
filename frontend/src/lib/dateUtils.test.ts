import { describe, it, expect } from "vitest";
import {
  formatDate,
  toUtcIsoString,
  toColombianDateString,
  toColombianTimeString,
  interpretLocalAsColombian,
  toColombiaMinutes,
  formatColombianTime,
} from "./dateUtils";

describe("dateUtils Timezone Handling", () => {
  // -------------------------------------------------------------------------
  // 1. toUtcIsoString: Colombia user input -> UTC ISO for backend storage
  // -------------------------------------------------------------------------
  it("toUtcIsoString should convert 10:00 Colombia to 15:00 UTC", () => {
    expect(toUtcIsoString("2023-10-27", "10:00")).toBe("2023-10-27T15:00:00.000Z");
  });

  it("toUtcIsoString should handle end-of-day: 19:00 Colombia -> 00:00 UTC next day", () => {
    expect(toUtcIsoString("2023-10-27", "19:00")).toBe("2023-10-28T00:00:00.000Z");
  });

  // -------------------------------------------------------------------------
  // 2. interpretLocalAsColombian: drag-drop local Date -> UTC ISO
  // -------------------------------------------------------------------------
  it("interpretLocalAsColombian should treat local 10:00 as Colombia 10:00 (15:00 UTC)", () => {
    const localDate = new Date(2023, 9, 27, 10, 0); // Oct 27 10:00 local
    expect(interpretLocalAsColombian(localDate)).toBe("2023-10-27T15:00:00.000Z");
  });

  // -------------------------------------------------------------------------
  // 3. toColombiaMinutes: UTC date -> minutes from midnight in Colombia
  // -------------------------------------------------------------------------
  it("toColombiaMinutes should return 600 for 15:00 UTC (= 10:00 Colombia)", () => {
    const utcDate = new Date("2023-10-27T15:00:00Z");
    expect(toColombiaMinutes(utcDate)).toBe(600); // 10 * 60
  });

  it("toColombiaMinutes should return 0 for 05:00 UTC (= 00:00 Colombia)", () => {
    const utcDate = new Date("2023-10-27T05:00:00Z");
    expect(toColombiaMinutes(utcDate)).toBe(0);
  });

  it("toColombiaMinutes accepts ISO strings", () => {
    expect(toColombiaMinutes("2023-10-27T15:00:00Z")).toBe(600);
  });

  // -------------------------------------------------------------------------
  // 4. toColombianDateString: UTC date -> YYYY-MM-DD in Colombia
  // -------------------------------------------------------------------------
  it("toColombianDateString should return Colombia date (02:00 UTC Oct 28 = Oct 27 Colombia)", () => {
    const utcDate = new Date("2023-10-28T02:00:00Z"); // 21:00 Oct 27 Colombia
    expect(toColombianDateString(utcDate)).toBe("2023-10-27");
  });

  it("toColombianDateString accepts ISO strings", () => {
    expect(toColombianDateString("2023-10-27T15:00:00Z")).toBe("2023-10-27");
  });

  // -------------------------------------------------------------------------
  // 5. toColombianTimeString: UTC date -> HH:mm in Colombia
  // -------------------------------------------------------------------------
  it("toColombianTimeString should return 10:00 for 15:00 UTC", () => {
    expect(toColombianTimeString(new Date("2023-10-27T15:00:00Z"))).toBe("10:00");
  });

  it("toColombianTimeString accepts ISO strings", () => {
    expect(toColombianTimeString("2023-10-27T15:00:00Z")).toBe("10:00");
  });

  // -------------------------------------------------------------------------
  // 6. formatColombianTime: display format (Intl, es-CO)
  // -------------------------------------------------------------------------
  it("formatColombianTime should show 10:00 AM for 15:00 UTC", () => {
    const formatted = formatColombianTime("2023-10-27T15:00:00Z");
    // es-CO uses "a. m." notation; just verify the hour and meridiem are present
    expect(formatted).toMatch(/10:00/);
    expect(formatted).toMatch(/m/i);
  });

  // -------------------------------------------------------------------------
  // 7. formatDate: full display (Intl, es-CO)
  // -------------------------------------------------------------------------
  it("formatDate should include the Colombia hour and date for 15:00 UTC", () => {
    const formatted = formatDate("2023-10-27T15:00:00Z");
    // 15:00 UTC = 10:00 AM Colombia on Oct 27
    expect(formatted).toMatch(/10/); // hour
    expect(formatted).toMatch(/27/); // day
    expect(formatted).toMatch(/octubre/i); // month in Spanish
  });
});
