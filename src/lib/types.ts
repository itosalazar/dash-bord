/**
 * Shared, serialisable types that cross the server/browser boundary.
 * Nothing in here may reference credentials or tokens.
 */

export type ProviderErrorCode =
  | "not_configured" // provider selected but env / settings incomplete
  | "not_connected" // OAuth connection pending
  | "unauthorized" // token revoked or expired beyond refresh
  | "upstream" // third-party API failed
  | "invalid" // bad input from the client
  | "offline"; // browser has no network (client-side only)

export interface ProviderError {
  code: ProviderErrorCode;
  message: string;
}

export type ProviderResult<T> =
  | { ok: true; data: T; source: string; fetchedAt: string }
  | { ok: false; error: ProviderError; source: string };

/* ----------------------------------------------------------------- weather */

export type WeatherCondition =
  | "clear"
  | "partly"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "storm";

export type TemperatureUnit = "c" | "f";

export interface WeatherSnapshot {
  locationName: string;
  condition: WeatherCondition;
  isDay: boolean;
  temperature: number;
  high: number;
  low: number;
  unit: TemperatureUnit;
  /** Short human summary, e.g. "Clear" or "Light rain". */
  summary: string;
  precipitationChance?: number;
}

/* ---------------------------------------------------------------- calendar */

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO 8601
  end: string; // ISO 8601
  allDay: boolean;
  status: "confirmed" | "tentative" | "declined";
  isPrivate: boolean;
  location?: string;
}

export interface CalendarSnapshot {
  accountLabel?: string;
  events: CalendarEvent[];
}

export interface CalendarQuery {
  hours: number;
  hideDeclined: boolean;
  hideAllDay: boolean;
  hidePrivate: boolean;
}

/* ------------------------------------------------------------- inspiration */

export interface InspirationPin {
  id: string;
  imageUrl: string;
  width?: number;
  height?: number;
  alt: string;
  title?: string;
  dominantColor?: string;
  /** Original Pin URL. Opened in a new browser context when tapped. */
  link?: string;
}

export interface InspirationBoard {
  boardName: string;
  boardUrl?: string;
  pins: InspirationPin[];
}

/* -------------------------------------------------------------------- cues */

export interface Cue {
  id: string;
  text: string;
  attribution?: string;
  tags?: string[];
}

/* ------------------------------------------------------------------ status */

export type CalendarProviderId = "mock" | "google";
export type WeatherProviderId = "mock" | "open-meteo" | "openweathermap";
export type InspirationProviderId = "mock" | "rss" | "pinterest";
/** "auto" = public board RSS feed when a board URL is set, demo images otherwise. */
export type InspirationMode = "auto" | InspirationProviderId;

export interface ConnectionStatus {
  configured: boolean; // client id/secret present
  connected: boolean; // refresh token stored
  accountLabel?: string;
}

export interface AppStatus {
  calendarProvider: CalendarProviderId;
  weatherProviders: WeatherProviderId[];
  defaultWeatherProvider: WeatherProviderId;
  inspirationProvider: InspirationMode;
  database: boolean;
  auth: { enabled: boolean };
  google: ConnectionStatus;
  pinterest: ConnectionStatus;
}
