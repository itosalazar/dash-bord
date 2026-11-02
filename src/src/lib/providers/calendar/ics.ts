import "server-only";
import { createHash } from "node:crypto";
import { allowedHostsLabel, isHostAllowed } from "@/lib/server/allowlist";
import { fail, ok } from "@/lib/server/http";
import { assertPublicHttpsUrl, FeedError } from "../quotes/remote";
import type { CalendarProvider } from "../types";
import { applyCalendarFilters } from "./filter";
import { eventsFromIcs } from "./ics-parse";

/**
 * Calendar from a private iCal link (Google "Secret address in iCal format",
 * iCloud or Outlook published calendars). The link comes from the user's
 * settings in the request body — it is never logged or put in a URL.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const CACHE_MS = 2 * 60_000;
const cache = new Map<string, { at: number; text: string }>();

export function normalizeIcsUrl(raw: string): string {
  return raw.trim().replace(/^webcal:\/\//i, "https://");
}

async function checkedUrl(raw: string): Promise<URL> {
  const url = await assertPublicHttpsUrl(raw);
  if (!isHostAllowed(url, "calendar")) {
    throw new FeedError(`This dash-bord only reads calendars from ${allowedHostsLabel("calendar")}.`);
  }
  return url;
}

/** Follows up to 3 redirects, re-checking every hop against the guards. */
async function fetchCalendar(start: URL): Promise<Response> {
  let url = start;
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(url, {
      cache: "no-store",
      redirect: "manual",
      headers: { Accept: "text/calendar, text/plain;q=0.8" },
      signal: AbortSignal.timeout(8000),
    }).catch(() => {
      throw new FeedError("The calendar link didn't respond.");
    });
    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) return res;
    url = await checkedUrl(new URL(location, url).toString());
  }
  throw new FeedError("The calendar link redirected too many times.");
}

async function loadIcs(raw: string): Promise<string> {
  const url = await checkedUrl(normalizeIcsUrl(raw));
  const key = createHash("sha256").update(url.toString()).digest("hex");
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.text;

  const res = await fetchCalendar(url);
  if ([401, 403, 404].includes(res.status)) {
    throw new FeedError("That calendar link no longer works. Copy the secret iCal address again.");
  }
  if (!res.ok) throw new Error(`ics ${res.status}`);
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new FeedError("That calendar is larger than 5 MB.");
  if (!text.includes("BEGIN:VCALENDAR")) throw new FeedError("That link didn't return a calendar (.ics).");
  cache.set(key, { at: Date.now(), text });
  return text;
}

export const icsCalendarProvider: CalendarProvider = {
  id: "ics",
  async getUpcoming(query) {
    if (!query.icsUrl) return fail("ics", { code: "not_configured", message: "Paste your calendar's iCal link in Settings." });
    try {
      const text = await loadIcs(query.icsUrl);
      const now = new Date();
      // Look back a little so an event already in progress still shows.
      const { label, events } = eventsFromIcs(text, new Date(now.getTime() - 12 * 3_600_000), new Date(now.getTime() + query.hours * 3_600_000));
      return ok("ics", { accountLabel: label, events: applyCalendarFilters(events, query, now) });
    } catch (error) {
      if (error instanceof FeedError) return fail("ics", { code: "invalid", message: error.message });
      console.error("[calendar:ics]", error instanceof Error ? error.message : "failed");
      return fail("ics", { code: "upstream", message: "The calendar feed couldn't be read right now." });
    }
  },
};
