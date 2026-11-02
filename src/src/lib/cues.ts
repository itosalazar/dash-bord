import { BUILTIN_CUES } from "@/lib/providers/quotes/builtin";
import type { DayWindow, PersonalCue, Settings } from "@/lib/settings";
import type { Cue } from "@/lib/types";

/**
 * Client-side cue selection. Pools come from the built-in list, the personal
 * collection (filtered by its optional schedule) and the cached remote feed.
 */

export function windowForHour(hour: number): Exclude<DayWindow, "any"> {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

export function isPersonalCueActive(cue: PersonalCue, day: number, hour: number): boolean {
  if (!cue.schedule) return true;
  const { days, window } = cue.schedule;
  if (days.length > 0 && !days.includes(day)) return false;
  return window === "any" || window === windowForHour(hour);
}

export function buildCuePool(
  settings: Settings["cues"],
  remote: Cue[] | null,
  clock: { day: number; hour: number },
): Cue[] {
  const personal = settings.personal
    .filter((cue) => isPersonalCueActive(cue, clock.day, clock.hour))
    .map<Cue>((cue) => ({ id: cue.id, text: cue.text, attribution: cue.attribution }));

  switch (settings.source) {
    case "personal":
      return personal.length ? personal : BUILTIN_CUES;
    case "remote":
      return remote?.length ? remote : BUILTIN_CUES;
    case "mixed":
      return [...personal, ...(remote ?? []), ...BUILTIN_CUES];
    default:
      return BUILTIN_CUES;
  }
}

/** Small integer hash (mulberry-ish) so consecutive buckets don't walk the list in order. */
export function scramble(n: number): number {
  let t = (n + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}
