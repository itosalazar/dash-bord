import { z } from "zod";

/**
 * User settings. Validated on both sides: the browser keeps a copy in
 * localStorage (works offline / without a database) and the server persists
 * it in Postgres when DATABASE_URL is configured.
 */

export const DAY_WINDOWS = ["any", "morning", "afternoon", "evening", "night"] as const;
export type DayWindow = (typeof DAY_WINDOWS)[number];

export const personalCueSchema = z.object({
  id: z.string().min(1).max(64),
  text: z.string().trim().min(1).max(220),
  attribution: z.string().trim().max(80).optional(),
  schedule: z
    .object({
      /** 0 = Sunday … 6 = Saturday. Empty = every day. */
      days: z.array(z.number().int().min(0).max(6)).max(7),
      window: z.enum(DAY_WINDOWS),
    })
    .optional(),
});
export type PersonalCue = z.infer<typeof personalCueSchema>;

const locationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type SavedLocation = z.infer<typeof locationSchema>;

export const ROTATION_CADENCES = ["manual", "hourly", "daily", "launch"] as const;
export const CUE_CADENCES = ["manual", "15m", "hourly", "daily", "launch"] as const;
export const CUE_SOURCES = ["builtin", "personal", "remote", "mixed"] as const;
export const THEMES = ["graphite", "noir", "paper"] as const;
/** Accent palette (all readable with black text on top, and as large text on the desk). */
export const ACCENTS = ["vermilion", "signal", "cobalt", "mint"] as const;
export type Accent = (typeof ACCENTS)[number];

export const settingsSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string(),
  display: z.object({
    timeFormat: z.enum(["12h", "24h"]),
    showSeconds: z.boolean(),
    /** "auto" uses the device time zone, otherwise an IANA name. */
    timeZone: z.string().min(1).max(64),
    theme: z.enum(THEMES),
    accent: z.enum(ACCENTS),
    nightDim: z.boolean(),
  }),
  weather: z.object({
    /** "default" follows the server's WEATHER_PROVIDER env var. */
    provider: z.enum(["default", "mock", "open-meteo", "openweathermap"]),
    unit: z.enum(["c", "f"]),
    location: locationSchema.nullable(),
  }),
  calendar: z.object({
    /** Private iCal link ("Secret address in iCal format"). Treat like a password. */
    icsUrl: z.string().trim().max(1000),
    windowHours: z.number().int().min(1).max(72),
    hideDeclined: z.boolean(),
    hideAllDay: z.boolean(),
    hidePrivate: z.boolean(),
  }),
  inspiration: z.object({
    boardUrl: z.string().trim().max(300),
    cadence: z.enum(ROTATION_CADENCES),
  }),
  cues: z.object({
    source: z.enum(CUE_SOURCES),
    cadence: z.enum(CUE_CADENCES),
    showAttribution: z.boolean(),
    remoteUrl: z.string().trim().max(500),
    personal: z.array(personalCueSchema).max(200),
  }),
  /** Pomodoro focus timer shown beside the clock. Lengths in minutes. */
  timer: z.object({
    enabled: z.boolean(),
    focusMinutes: z.number().int().min(1).max(180),
    shortBreakMinutes: z.number().int().min(1).max(60),
    longBreakMinutes: z.number().int().min(1).max(90),
    sessionsBeforeLong: z.number().int().min(2).max(8),
    autoStartNext: z.boolean(),
    sound: z.boolean(),
    volume: z.enum(["soft", "medium", "loud"]),
  }),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  display: {
    timeFormat: "24h",
    showSeconds: true,
    timeZone: "auto",
    theme: "graphite",
    accent: "vermilion",
    nightDim: true,
  },
  weather: {
    provider: "default",
    unit: "c",
    location: null,
  },
  calendar: {
    icsUrl: "",
    windowHours: 24,
    hideDeclined: true,
    hideAllDay: false,
    hidePrivate: false,
  },
  inspiration: {
    boardUrl: "",
    cadence: "daily",
  },
  cues: {
    source: "builtin",
    cadence: "hourly",
    showAttribution: false,
    remoteUrl: "",
    personal: [],
  },
  timer: {
    enabled: true,
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    sessionsBeforeLong: 4,
    autoStartNext: false,
    sound: true,
    volume: "medium",
  },
};

/**
 * Merge unknown (possibly older or partial) settings onto the defaults and
 * validate. Falls back to defaults section by section instead of throwing.
 */
export function normalizeSettings(input: unknown): Settings {
  if (!input || typeof input !== "object") return DEFAULT_SETTINGS;
  const raw = input as Partial<Record<keyof Settings, unknown>>;
  const merged = {
    ...DEFAULT_SETTINGS,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : DEFAULT_SETTINGS.updatedAt,
    display: { ...DEFAULT_SETTINGS.display, ...(raw.display as object) },
    weather: { ...DEFAULT_SETTINGS.weather, ...(raw.weather as object) },
    calendar: { ...DEFAULT_SETTINGS.calendar, ...(raw.calendar as object) },
    inspiration: { ...DEFAULT_SETTINGS.inspiration, ...(raw.inspiration as object) },
    cues: { ...DEFAULT_SETTINGS.cues, ...(raw.cues as object) },
    timer: { ...DEFAULT_SETTINGS.timer, ...(raw.timer as object) },
  };
  const parsed = settingsSchema.safeParse(merged);
  if (parsed.success) return parsed.data;

  // Recover per section so one bad field does not wipe everything.
  const sections = ["display", "weather", "calendar", "inspiration", "cues", "timer"] as const;
  const recovered: Settings = { ...DEFAULT_SETTINGS, updatedAt: merged.updatedAt };
  for (const key of sections) {
    const section = settingsSchema.shape[key].safeParse(merged[key]);
    if (section.success) (recovered as Record<string, unknown>)[key] = section.data;
  }
  return recovered;
}

/** Validates a Pinterest board URL and extracts `{ username, slug }`. */
export function parsePinterestBoardUrl(value: string): { username: string; slug: string } | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (!/(^|\.)pinterest\.[a-z.]{2,8}$/.test(host)) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const [username, slug] = parts as [string, string];
  if (["pin", "search", "ideas", "today", "settings"].includes(username)) return null;
  if (!/^[\w.-]{1,64}$/.test(username) || !/^[\w%.-]{1,120}$/.test(slug)) return null;
  return { username, slug: decodeURIComponent(slug) };
}

/** "warm-modernism" → "Warm modernism" */
export function boardNameFromSlug(slug: string): string {
  const words = slug.replace(/[-_]+/g, " ").trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : "Board";
}
