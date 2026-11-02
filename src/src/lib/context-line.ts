import type { CalendarEvent, WeatherCondition, WeatherSnapshot } from "@/lib/types";
import { windowForHour } from "@/lib/cues";
import { eventTime, untilLabel } from "@/lib/time";

type Daypart = ReturnType<typeof windowForHour>;
type Mood = "bright" | "soft" | "wet" | "cold";

const MOOD: Record<WeatherCondition, Mood> = {
  clear: "bright",
  partly: "bright",
  cloudy: "soft",
  fog: "soft",
  drizzle: "wet",
  rain: "wet",
  storm: "wet",
  snow: "cold",
};

const LINES: Record<Daypart, Record<Mood | "none", string>> = {
  morning: {
    bright: "a clear morning to begin something",
    soft: "soft light, slow start",
    wet: "rain outside, focus inside",
    cold: "a quiet, cold morning",
    none: "a fresh page of a morning",
  },
  afternoon: {
    bright: "a clear day to make things",
    soft: "grey skies, steady hands",
    wet: "rain on the window, work at the desk",
    cold: "snow outside, warmth in here",
    none: "the long middle of the day",
  },
  evening: {
    bright: "golden hour, wrap it up",
    soft: "time to wind the day down",
    wet: "a rainy evening, close the loops",
    cold: "a cold evening, a warm desk",
    none: "time to wind the day down",
  },
  night: {
    bright: "clear skies, quiet desk",
    soft: "the work can wait until morning",
    wet: "rain at night, rest is the task",
    cold: "a still, cold night",
    none: "the work can wait until morning",
  },
};

/** The small line under the clock: what's happening now, else a mood. */
export function contextLine(opts: {
  nowMs: number;
  hour: number;
  timeZone: string;
  timeFormat: "12h" | "24h";
  events: CalendarEvent[] | null;
  weather: WeatherSnapshot | null;
}): string {
  const timed = (opts.events ?? []).filter((e) => !e.allDay && e.status !== "declined");
  const current = timed.find((e) => Date.parse(e.start) <= opts.nowMs && Date.parse(e.end) > opts.nowMs);
  if (current) return `${current.title.toLowerCase()} until ${eventTime(current.end, opts.timeZone, opts.timeFormat)}`;

  const next = timed.find((e) => Date.parse(e.start) > opts.nowMs);
  if (next && Date.parse(next.start) - opts.nowMs <= 90 * 60_000) {
    return `${next.title.toLowerCase()} ${untilLabel(opts.nowMs, Date.parse(next.start))}`;
  }

  const mood = opts.weather ? MOOD[opts.weather.condition] : "none";
  return LINES[windowForHour(opts.hour)][mood];
}
