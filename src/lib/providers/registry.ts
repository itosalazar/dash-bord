import "server-only";
import { availableWeatherProviders, env } from "@/lib/server/env";
import type { WeatherProviderId } from "@/lib/types";
import { googleCalendarProvider } from "./calendar/google";
import { mockCalendarProvider } from "./calendar/mock";
import { mockInspirationProvider } from "./inspiration/mock";
import { pinterestProvider } from "./inspiration/pinterest";
import type { CalendarProvider, InspirationProvider, WeatherProvider } from "./types";
import { mockWeatherProvider, openMeteoProvider, openWeatherMapProvider } from "./weather";

/** Env-driven provider selection. Mock is the default for everything. */

export function calendarProvider(): CalendarProvider {
  return env.calendarProvider === "google" ? googleCalendarProvider : mockCalendarProvider;
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

export function inspirationProvider(): InspirationProvider {
  return env.inspirationProvider === "pinterest" ? pinterestProvider : mockInspirationProvider;
}
