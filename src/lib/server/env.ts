import "server-only";
import type {
  CalendarProviderId,
  InspirationMode,
  WeatherProviderId,
} from "@/lib/types";

/**
 * Typed, lazily-read server environment. Every value here stays on the
 * server — none of these names carry a NEXT_PUBLIC_ prefix.
 */

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

function oneOf<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
  const value = read(name);
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export const env = {
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },

  /* auth */
  get passphrase() {
    return read("DASHBORD_PASSPHRASE");
  },
  get authSecret() {
    return read("AUTH_SECRET");
  },

  /* persistence */
  get databaseUrl() {
    return read("DATABASE_URL") ?? read("POSTGRES_URL");
  },
  get tokenEncryptionKey() {
    return read("TOKEN_ENCRYPTION_KEY");
  },

  /** Public origin used for OAuth redirect URIs, e.g. https://dash-bord.vercel.app */
  get appUrl() {
    return read("APP_URL");
  },

  /* providers */
  get calendarProvider(): CalendarProviderId {
    return oneOf("CALENDAR_PROVIDER", ["mock", "google"] as const, "mock");
  },
  get weatherProvider(): WeatherProviderId {
    return oneOf("WEATHER_PROVIDER", ["mock", "open-meteo", "openweathermap"] as const, "mock");
  },
  get inspirationProvider(): InspirationMode {
    return oneOf("INSPIRATION_PROVIDER", ["auto", "mock", "rss", "pinterest"] as const, "auto");
  },

  get googleClientId() {
    return read("GOOGLE_CLIENT_ID");
  },
  get googleClientSecret() {
    return read("GOOGLE_CLIENT_SECRET");
  },
  get openWeatherMapKey() {
    return read("OPENWEATHERMAP_API_KEY");
  },
  get pinterestAppId() {
    return read("PINTEREST_APP_ID");
  },
  get pinterestAppSecret() {
    return read("PINTEREST_APP_SECRET");
  },
  /** Include secret boards (requires the *_secret scopes on your Pinterest app). */
  get pinterestIncludeSecret() {
    return read("PINTEREST_INCLUDE_SECRET_BOARDS") === "true";
  },
};

export function availableWeatherProviders(): WeatherProviderId[] {
  const list: WeatherProviderId[] = ["mock", "open-meteo"];
  if (env.openWeatherMapKey) list.push("openweathermap");
  return list;
}

/** Origin for building absolute OAuth callback URLs. */
export function resolveOrigin(request: Request): string {
  if (env.appUrl) return env.appUrl.replace(/\/+$/, "");
  return new URL(request.url).origin;
}
