"use client";

import { useCallback, useMemo } from "react";
import type { Settings } from "@/lib/settings";
import type { CalendarSnapshot, Cue, InspirationBoard, WeatherSnapshot } from "@/lib/types";
import { useResource } from "./useResource";

const MIN = 60_000;
export const REFRESH = {
  calendar: 5 * MIN,
  weather: 30 * MIN,
  inspiration: 6 * 60 * MIN,
  remoteCues: 6 * 60 * MIN,
} as const;

/** Wires each provider endpoint to the user's settings. */
export function useDashboardData(settings: Settings, timeZone: string) {
  const weatherUrl = useMemo(() => {
    const q = new URLSearchParams({ provider: settings.weather.provider, unit: settings.weather.unit, tz: timeZone });
    const loc = settings.weather.location;
    if (loc) {
      q.set("lat", loc.latitude.toFixed(4));
      q.set("lon", loc.longitude.toFixed(4));
      q.set("name", loc.name);
    }
    return `/api/weather?${q}`;
  }, [settings.weather, timeZone]);

  // Sent as a POST body so the private iCal link never appears in a URL or request log.
  const calendarBody = useMemo(() => {
    const c = settings.calendar;
    return JSON.stringify({
      hours: c.windowHours,
      hideDeclined: c.hideDeclined,
      hideAllDay: c.hideAllDay,
      hidePrivate: c.hidePrivate,
      icsUrl: c.icsUrl,
    });
  }, [settings.calendar]);

  const inspirationUrl = `/api/inspiration?${new URLSearchParams({ board: settings.inspiration.boardUrl })}`;

  const wantsRemote = settings.cues.source === "remote" || settings.cues.source === "mixed";
  const remoteUrl =
    wantsRemote && settings.cues.remoteUrl ? `/api/cues/remote?${new URLSearchParams({ url: settings.cues.remoteUrl })}` : null;

  const [weather, refreshWeather] = useResource<WeatherSnapshot>("weather", weatherUrl, REFRESH.weather);
  const [calendar, refreshCalendar] = useResource<CalendarSnapshot>("calendar", "/api/calendar", REFRESH.calendar, calendarBody);
  const [inspiration, refreshInspiration] = useResource<InspirationBoard>("inspiration", inspirationUrl, REFRESH.inspiration);
  const [remoteCues, refreshRemoteCues] = useResource<Cue[]>("remoteCues", remoteUrl, REFRESH.remoteCues);

  const refreshAll = useCallback(() => {
    refreshWeather();
    refreshCalendar();
    refreshInspiration();
    refreshRemoteCues();
  }, [refreshWeather, refreshCalendar, refreshInspiration, refreshRemoteCues]);

  return {
    weather,
    calendar,
    inspiration,
    remoteCues,
    refresh: {
      weather: refreshWeather,
      calendar: refreshCalendar,
      inspiration: refreshInspiration,
      remoteCues: refreshRemoteCues,
      all: refreshAll,
    },
  };
}

export type DashboardData = ReturnType<typeof useDashboardData>;
