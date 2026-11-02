/** Time-zone aware formatting built on Intl only — no date library. */

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function resolveTimeZone(setting: string): string {
  if (setting === "auto") return deviceTimeZone();
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: setting });
    return setting;
  } catch {
    return deviceTimeZone();
  }
}

export interface ZonedParts {
  year: number;
  month: number; // 1–12
  day: number;
  weekday: number; // 0 = Sunday
  hour: number; // 0–23
  minute: number;
  second: number;
}

const partsCache = new Map<string, Intl.DateTimeFormat>();
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  let fmt = partsCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hourCycle: "h23",
    });
    partsCache.set(timeZone, fmt);
  }
  const out: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) out[part.type] = part.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    weekday: Math.max(0, WEEKDAYS.indexOf(out.weekday ?? "Sun")),
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
    second: Number(out.second),
  };
}

/** Minutes the zone is ahead of UTC at `date`. */
export function zoneOffsetMinutes(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60_000);
}

export function clockFace(date: Date, timeZone: string, format: "12h" | "24h") {
  const p = zonedParts(date, timeZone);
  const minutes = String(p.minute).padStart(2, "0");
  const seconds = String(p.second).padStart(2, "0");
  if (format === "24h") return { hours: String(p.hour).padStart(2, "0"), minutes, seconds, period: null };
  const h = p.hour % 12 || 12;
  return { hours: String(h), minutes, seconds, period: p.hour < 12 ? "am" : "pm" };
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const LONG_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "sun 01 nov" — the mono date label. */
export function shortDate(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${DAYS[p.weekday]} ${String(p.day).padStart(2, "0")} ${MONTHS[p.month - 1]}`;
}

/** "Sunday 1 November" — for screen readers. */
export function longDate(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${LONG_DAYS[p.weekday]} ${p.day} ${LONG_MONTHS[p.month - 1]}`;
}

export function eventTime(iso: string, timeZone: string, format: "12h" | "24h"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = zonedParts(d, timeZone);
  const mm = String(p.minute).padStart(2, "0");
  if (format === "24h") return `${String(p.hour).padStart(2, "0")}:${mm}`;
  return `${p.hour % 12 || 12}:${mm}${p.hour < 12 ? "a" : "p"}`;
}

/** "in 18 min", "in 1 h 20", "now" */
export function untilLabel(fromMs: number, toMs: number): string {
  const mins = Math.round((toMs - fromMs) / 60_000);
  if (mins <= 0) return "now";
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `in ${h} h ${m}` : `in ${h} h`;
}

/** "just now", "4 min ago", "2 h ago", or a date for anything older. */
export function agoLabel(iso: string | null | undefined, nowMs: number): string {
  if (!iso) return "never";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "never";
  const mins = Math.floor((nowMs - t) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return new Date(t).toLocaleDateString();
}
