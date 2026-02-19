import { format } from "date-fns";
import { es } from "date-fns/locale";

// Constants
export const COLOMBIA_TIMEZONE = "America/Bogota";
export const COLOMBIA_OFFSET_MS = -5 * 60 * 60 * 1000; // -5 hours in ms

/**
 * Formats an ISO date string for display in Colombian Spanish.
 * Uses Native Intl.DateTimeFormat for robust timezone handling.
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
 * Formats an ISO date string to time only (e.g. "10:00 AM") in Colombian Spanish.
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
 * Returns a "Lie" Date object where the UTC components match the Wall Clock time in Colombia.
 * Example: 15:00 Real UTC -> 10:00 "Lie" UTC (representing 10:00 Colombia).
 * USE ONLY with getUTC* methods.
 */
export function toColombianDate(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  // Bogota is strict UTC-5 (No DST).
  // 15:00 UTC (Real) + (-5h) = 10:00 (Wall Click).
  // We want a date whose getUTCHours() = 10.
  // So we take Real UTC timestamp, add offset (-5h).
  // Resulting timestamp creates a date where UTC matches local.
  return new Date(d.getTime() + COLOMBIA_OFFSET_MS);
}

/**
 * Formats a date object to YYYY-MM-DD string in Colombian timezone.
 */
export function toColombianDateString(date: Date): string {
  const lie = toColombianDate(date);
  return lie.toISOString().split("T")[0];
}

/**
 * Formats a date object to HH:mm string in Colombian timezone.
 */
export function toColombianTimeString(date: Date): string {
  const lie = toColombianDate(date);
  return lie.toISOString().split("T")[1].substring(0, 5);
}

/**
 * Combines date (YYYY-MM-DD) and time (HH:mm) strings in Colombian time
 * and returns a UTC ISO string for backend storage.
 */
export function toUtcIsoString(dateStr: string, timeStr: string): string {
  // We have 10:00 Colombia. We want 15:00 UTC.
  // Construct "Lie" ISO: "2023-10-27T10:00:00.000Z"
  const lieIso = `${dateStr}T${timeStr}:00.000Z`;
  const lieDate = new Date(lieIso);

  // Reverse the offset: Subtract (-5h) = Add 5h.
  // 10:00 + 5h = 15:00.
  return new Date(lieDate.getTime() - COLOMBIA_OFFSET_MS).toISOString();
}

/**
 * Interprets a local Date object's components as if they were in Colombian timezone.
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
