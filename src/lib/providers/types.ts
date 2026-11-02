import type { SavedLocation } from "@/lib/settings";
import type {
  CalendarProviderId,
  CalendarQuery,
  CalendarSnapshot,
  Cue,
  InspirationBoard,
  InspirationProviderId,
  ProviderResult,
  TemperatureUnit,
  WeatherProviderId,
  WeatherSnapshot,
} from "@/lib/types";

/**
 * Provider contracts. Each data source has a mock implementation that needs
 * no accounts, and production implementations selected by env vars. Route
 * handlers call these; the browser only ever sees the ProviderResult JSON.
 */

export interface WeatherQuery {
  location: SavedLocation | null;
  unit: TemperatureUnit;
  /** IANA zone of the device, used by the mock for day/night. */
  timeZone?: string;
}

export interface WeatherProvider {
  readonly id: WeatherProviderId;
  getCurrent(query: WeatherQuery): Promise<ProviderResult<WeatherSnapshot>>;
}

export interface CalendarProvider {
  readonly id: CalendarProviderId;
  getUpcoming(query: CalendarQuery): Promise<ProviderResult<CalendarSnapshot>>;
}

export interface InspirationQuery {
  boardUrl: string;
}

export interface InspirationProvider {
  readonly id: InspirationProviderId;
  getBoard(query: InspirationQuery): Promise<ProviderResult<InspirationBoard>>;
}

export type QuoteSourceId = "builtin" | "personal" | "remote";

export interface QuoteProvider {
  readonly id: QuoteSourceId;
  list(): Promise<Cue[]>;
}
