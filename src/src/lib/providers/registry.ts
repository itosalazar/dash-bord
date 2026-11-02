import "server-only";
import { availableWeatherProviders, env } from "@/lib/server/env";
import type { WeatherProviderId } from "@/lib/types";
import { googleCalendarProvider } from "./calendar/google";
import { icsCalendarProvider } from "./calendar/ics";
import { mockCalendarProvider } from "./calendar/mock";
import { mockInspirationProvider } from "./inspiration/mock";
import { pinterestProvider } from "./inspiration/pinterest";
import { pinterestRssProvider } from "./inspiration/rss";
import type { CalendarProvider, InspirationProvider, WeatherProvider } from "./types";
import { mockWeatherProvider, openMeteoProvider, openWeatherMapProvider } from "./weather";

/** Env-driven provider selection. Mock is the default for everything. */

/** Google OAuth when enabled on the server; else the user's iCal link; else the demo calendar. */
export function calendarProvider(icsUrl?: string): CalendarProvider {
  if (env.calendarProvider === "google") return googleCalendarProvider;
  return icsUrl ? icsCalendarProvider : mockCalendarProvider;
}

const WEATHER: Record<WeatherProviderId, WeatherProvider> = {
  mock: mockWeatherProvider,
  "open-meteo": openMeteoProvider,
  openweathermap: openWeatherMapProvider,
};

/** `requested` comes from user settings; anything unavailable falls back to the env default. */
export function weatherProvider(requested?: string): WeatherProvider {
  const available = availableWeatherProviders();
  const id = available.includes(requested as WeatherProviderId) ? (requested as WeatherProviderId) : env.weatherProvider;
  return WEATHER[id];
}

/** auto (default): the board's public RSS feed once a board URL is set, demo art before that. */
export function inspirationProvider(boardUrl: string): InspirationProvider {
  switch (env.inspirationProvider) {
    case "pinterest":
      return pinterestProvider;
    case "rss":
      return pinterestRssProvider;
    case "mock":
      return mockInspirationProvider;
    default:
      return boardUrl ? pinterestRssProvider : mockInspirationProvider;
  }
}
