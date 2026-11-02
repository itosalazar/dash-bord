import "server-only";
import { env } from "@/lib/server/env";
import { fail, fetchWithTimeout, ok } from "@/lib/server/http";
import type { TemperatureUnit, WeatherCondition, WeatherSnapshot } from "@/lib/types";
import type { WeatherProvider } from "../types";

const SUMMARY: Record<WeatherCondition, string> = {
  clear: "Clear",
  partly: "Partly cloudy",
  cloudy: "Overcast",
  fog: "Fog",
  drizzle: "Drizzle",
  rain: "Rain",
  snow: "Snow",
  storm: "Thunderstorm",
};

const toF = (c: number) => (c * 9) / 5 + 32;

/* -------------------------------------------------------------------- mock */

function localHourIn(timeZone?: string): number {
  try {
    const hour = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(new Date());
    return Number(hour) % 24;
  } catch {
    return new Date().getHours();
  }
}

export const mockWeatherProvider: WeatherProvider = {
  id: "mock",
  async getCurrent({ location, unit, timeZone }) {
    const c = { temperature: 12, high: 15, low: 7 };
    const convert = (v: number) => Math.round(unit === "f" ? toF(v) : v);
    const hour = localHourIn(timeZone);
    const snapshot: WeatherSnapshot = {
      locationName: location?.name ?? "Your desk",
      condition: "clear",
      isDay: hour >= 6 && hour < 19,
      temperature: convert(c.temperature),
      high: convert(c.high),
      low: convert(c.low),
      unit,
      summary: SUMMARY.clear,
      precipitationChance: 5,
    };
    return ok("mock", snapshot);
  },
};

/* -------------------------------------------------------------- open-meteo */

/** WMO weather interpretation codes → our condition buckets. */
function fromWmo(code: number): WeatherCondition {
  if (code === 0) return "clear";
  if (code <= 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloudy";
}

export const openMeteoProvider: WeatherProvider = {
  id: "open-meteo",
  async getCurrent({ location, unit }) {
    if (!location) return fail("open-meteo", { code: "not_configured", message: "Choose a location in Settings." });
    const params = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      current: "temperature_2m,weather_code,is_day",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      temperature_unit: unit === "f" ? "fahrenheit" : "celsius",
      timezone: "auto",
      forecast_days: "1",
    });
    try {
      const res = await fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!res.ok) throw new Error(`open-meteo ${res.status}`);
      const body = (await res.json()) as {
        current: { temperature_2m: number; weather_code: number; is_day: number };
        daily: { temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max?: (number | null)[] };
      };
      const condition = fromWmo(body.current.weather_code);
      return ok("open-meteo", {
        locationName: location.name,
        condition,
        isDay: body.current.is_day === 1,
        temperature: Math.round(body.current.temperature_2m),
        high: Math.round(body.daily.temperature_2m_max[0] ?? body.current.temperature_2m),
        low: Math.round(body.daily.temperature_2m_min[0] ?? body.current.temperature_2m),
        unit,
        summary: SUMMARY[condition],
        precipitationChance: body.daily.precipitation_probability_max?.[0] ?? undefined,
      });
    } catch (error) {
      console.error("[weather:open-meteo]", error instanceof Error ? error.message : error);
      return fail("open-meteo", { code: "upstream", message: "Open-Meteo did not respond." });
    }
  },
};

/* ---------------------------------------------------------- openweathermap */

function fromOwm(id: number): WeatherCondition {
  if (id >= 200 && id < 300) return "storm";
  if (id >= 300 && id < 400) return "drizzle";
  if (id >= 500 && id < 600) return "rain";
  if (id >= 600 && id < 700) return "snow";
  if (id >= 700 && id < 800) return "fog";
  if (id === 800) return "clear";
  if (id <= 802) return "partly";
  return "cloudy";
}

export const openWeatherMapProvider: WeatherProvider = {
  id: "openweathermap",
  async getCurrent({ location, unit }) {
    const key = env.openWeatherMapKey;
    if (!key) return fail("openweathermap", { code: "not_configured", message: "OPENWEATHERMAP_API_KEY is not set." });
    if (!location) return fail("openweathermap", { code: "not_configured", message: "Choose a location in Settings." });
    const params = new URLSearchParams({
      lat: String(location.latitude),
      lon: String(location.longitude),
      units: unit === "f" ? "imperial" : "metric",
      appid: key,
    });
    try {
      const res = await fetchWithTimeout(`https://api.openweathermap.org/data/2.5/weather?${params}`);
      if (!res.ok) throw new Error(`openweathermap ${res.status}`);
      const body = (await res.json()) as {
        weather: { id: number }[];
        main: { temp: number; temp_min: number; temp_max: number };
        dt: number;
        sys: { sunrise: number; sunset: number };
      };
      const condition = fromOwm(body.weather[0]?.id ?? 800);
      return ok("openweathermap", {
        locationName: location.name,
        condition,
        isDay: body.dt >= body.sys.sunrise && body.dt < body.sys.sunset,
        temperature: Math.round(body.main.temp),
        high: Math.round(body.main.temp_max),
        low: Math.round(body.main.temp_min),
        unit: unit as TemperatureUnit,
        summary: SUMMARY[condition],
      });
    } catch (error) {
      console.error("[weather:openweathermap]", error instanceof Error ? error.message : error);
      return fail("openweathermap", { code: "upstream", message: "OpenWeatherMap did not respond." });
    }
  },
};
