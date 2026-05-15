import companyJson from "../data/company.json";

/**
 * TODAY is a fixed ISO anchor so screenshots, reports, and deltas are stable
 * regardless of the wall clock. Drive every relative date through these helpers.
 */
export const TODAY_ISO: string = companyJson.todayIso;
export const TODAY_MS: number = new Date(TODAY_ISO).getTime();

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

export function daysAgo(days: number, hours = 0, minutes = 0): string {
  return new Date(
    TODAY_MS - days * DAY_MS - hours * HOUR_MS - minutes * MINUTE_MS
  ).toISOString();
}

export function hoursAgo(hours: number): string {
  return new Date(TODAY_MS - hours * HOUR_MS).toISOString();
}

export function daysFromNow(days: number): string {
  return new Date(TODAY_MS + days * DAY_MS).toISOString();
}

export function isoOffset(days: number, hours = 0, minutes = 0): string {
  return new Date(
    TODAY_MS - days * DAY_MS - hours * HOUR_MS - minutes * MINUTE_MS
  ).toISOString();
}
