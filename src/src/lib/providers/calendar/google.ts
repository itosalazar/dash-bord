import "server-only";
import { env } from "@/lib/server/env";
import { fail, fetchWithTimeout, ok, UpstreamError } from "@/lib/server/http";
import { getConnection, updateAccessToken, updateAccountLabel } from "@/lib/server/store";
import { hasDatabase } from "@/lib/server/db";
import type { CalendarEvent } from "@/lib/types";
import type { CalendarProvider } from "../types";
import { applyCalendarFilters } from "./filter";

/** Narrowest read-only scope that can list events. */
export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly";
export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<GoogleTokenResponse> {
  const res = await fetchWithTimeout(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId ?? "",
      client_secret: env.googleClientSecret ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const body = (await res.json()) as GoogleTokenResponse;
  if (!res.ok) throw new UpstreamError(body.error ?? "token exchange failed", res.status);
  return body;
}

async function accessToken(): Promise<string | null> {
  const conn = await getConnection("google");
  if (!conn) return null;
  if (conn.accessToken && conn.accessTokenExpiresAt && conn.accessTokenExpiresAt.getTime() - Date.now() > 60_000) {
    return conn.accessToken;
  }
  const res = await fetchWithTimeout(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.googleClientId ?? "",
      client_secret: env.googleClientSecret ?? "",
      refresh_token: conn.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const body = (await res.json()) as GoogleTokenResponse;
  if (!res.ok) throw new UpstreamError(body.error ?? "refresh failed", res.status);
  await updateAccessToken("google", body.access_token, new Date(Date.now() + body.expires_in * 1000), body.refresh_token);
  return body.access_token;
}

interface GoogleEvent {
  id: string;
  summary?: string;
  status?: string;
  visibility?: string;
  eventType?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
}

function toEvent(item: GoogleEvent): CalendarEvent | null {
  if (item.status === "cancelled" || item.eventType === "workingLocation") return null;
  const start = item.start?.dateTime ?? item.start?.date;
  const end = item.end?.dateTime ?? item.end?.date;
  if (!start || !end) return null;
  const allDay = Boolean(item.start?.date && !item.start.dateTime);
  const self = item.attendees?.find((a) => a.self);
  const status = self?.responseStatus === "declined" ? "declined" : item.status === "tentative" || self?.responseStatus === "tentative" ? "tentative" : "confirmed";
  const isPrivate = item.visibility === "private" || item.visibility === "confidential";
  return {
    id: item.id,
    title: item.summary?.trim() || (isPrivate ? "Private event" : "Untitled"),
    // All-day dates have no zone; anchor them to local midnight on the device.
    start: allDay ? `${start}T00:00:00` : start,
    end: allDay ? `${end}T00:00:00` : end,
    allDay,
    status,
    isPrivate,
    location: item.location,
  };
}

export const googleCalendarProvider: CalendarProvider = {
  id: "google",
  async getUpcoming(query) {
    if (!env.googleClientId || !env.googleClientSecret) {
      return fail("google", { code: "not_configured", message: "Google OAuth client is not configured on the server." });
    }
    if (!hasDatabase()) {
      return fail("google", { code: "not_configured", message: "A database is required to store the Google connection." });
    }
    try {
      const token = await accessToken();
      if (!token) return fail("google", { code: "not_connected", message: "Connect Google Calendar in Settings." });

      const now = new Date();
      // Look back a little so an event already in progress still shows.
      const params = new URLSearchParams({
        timeMin: new Date(now.getTime() - 12 * 3_600_000).toISOString(),
        timeMax: new Date(now.getTime() + query.hours * 3_600_000).toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "50",
        fields: "summary,items(id,summary,status,visibility,eventType,location,start,end,attendees(self,responseStatus))",
      });
      const res = await fetchWithTimeout(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        return fail("google", { code: "unauthorized", message: "Google access was revoked. Reconnect in Settings." });
      }
      if (!res.ok) throw new UpstreamError(`calendar ${res.status}`, res.status);
      const body = (await res.json()) as { summary?: string; items?: GoogleEvent[] };
      if (body.summary) await updateAccountLabel("google", body.summary).catch(() => undefined);
      const events = (body.items ?? []).map(toEvent).filter((e): e is CalendarEvent => e !== null);
      return ok("google", { accountLabel: body.summary, events: applyCalendarFilters(events, query, now) });
    } catch (error) {
      if (error instanceof UpstreamError && error.message === "invalid_grant") {
        return fail("google", { code: "unauthorized", message: "Google access expired. Reconnect in Settings." });
      }
      console.error("[calendar:google]", error instanceof Error ? error.message : error);
      return fail("google", { code: "upstream", message: "Google Calendar did not respond." });
    }
  },
};
