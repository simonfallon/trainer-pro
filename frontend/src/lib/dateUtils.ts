// Constants
export const COLOMBIA_TIMEZONE = "America/Bogota";

/**
 * Extracts hours and minutes from a date in Colombia timezone using Intl.
 * Works correctly on any machine regardless of its local timezone.
 */
function getColombiaTimeParts(date: Date | string): { hours: number; minutes: number } {
  const d = typeof date === "string" ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: COLOMBIA_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const hours = parseInt(parts.find((p) => p.type === "hour")!.value) % 24; // "24" at midnight → 0
  const minutes = parseInt(parts.find((p) => p.type === "minute")!.value);
  return { hours, minutes };
}

/**
 * Returns minutes from midnight in Colombia timezone.
 * Use this for calendar grid positioning (1px per minute grid).
 */
export function toColombiaMinutes(date: Date | string): number {
  const { hours, minutes } = getColombiaTimeParts(date);
  return hours * 60 + minutes;
}

/**
 * Formats a date as YYYY-MM-DD in Colombia timezone.
 */
export function toColombianDateString(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  // en-CA locale formats as YYYY-MM-DD natively
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: COLOMBIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Formats a date as HH:mm in Colombia timezone.
 */
export function toColombianTimeString(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const { hours, minutes } = getColombiaTimeParts(d);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Formats an ISO date string for display in Colombian Spanish.
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: COLOMBIA_TIMEZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(date);
}

/**
 * Formats an ISO date string to time only (e.g. "10:00 a. m.") in Colombian Spanish.
 */
export function formatColombianTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: COLOMBIA_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(date);
}

/**
 * Combines date (YYYY-MM-DD) and time (HH:mm) strings in Colombian time
 * and returns a UTC ISO string for backend storage.
 * Colombia is UTC-5 (no DST), so we add 5 hours to convert to UTC.
 */
export function toUtcIsoString(dateStr: string, timeStr: string): string {
  // Treat the input as a UTC time (a "lie"), then add 5 hours to get real UTC.
  // e.g. "10:00" Colombia → construct "T10:00:00Z" → add 5h → "T15:00:00Z" (UTC)
  const lieIso = `${dateStr}T${timeStr}:00.000Z`;
  const lieDate = new Date(lieIso);
  return new Date(lieDate.getTime() + 5 * 60 * 60 * 1000).toISOString();
}

/**
 * Interprets a local Date object's wall-clock components as Colombian time
 * and returns a UTC ISO string. Used for drag-and-drop where the calendar
 * creates local Date objects from grid pixel positions.
 */
export function interpretLocalAsColombian(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return toUtcIsoString(`${year}-${month}-${day}`, `${hours}:${minutes}`);
}

/**
 * Formats milliseconds to MM:SS.CS
 */
export function formatLapTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
}
