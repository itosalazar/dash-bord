import "server-only";
import { GOOGLE_AUTH_URL, GOOGLE_CALENDAR_SCOPE } from "@/lib/providers/calendar/google";
import { PINTEREST_AUTH_URL, pinterestScopes } from "@/lib/providers/inspiration/pinterest";
import { canEncrypt } from "./crypto";
import { hasDatabase } from "./db";
import { env, resolveOrigin } from "./env";
import type { OAuthProvider } from "./store";

export const OAUTH_STATE_COOKIE = "dashbord_oauth_state";

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "pinterest";
}

export function redirectUri(provider: OAuthProvider, request: Request): string {
  return `${resolveOrigin(request)}/api/connect/${provider}/callback`;
}

/** Returns a human-readable reason when the server can't run this OAuth flow. */
export function oauthUnavailableReason(provider: OAuthProvider): string | null {
  if (!hasDatabase()) return "database";
  if (!canEncrypt()) return "encryption";
  if (provider === "google" && (!env.googleClientId || !env.googleClientSecret)) return "client";
  if (provider === "pinterest" && (!env.pinterestAppId || !env.pinterestAppSecret)) return "client";
  return null;
}

export function authorizationUrl(provider: OAuthProvider, request: Request, state: string): string {
  if (provider === "google") {
    const params = new URLSearchParams({
      client_id: env.googleClientId ?? "",
      redirect_uri: redirectUri("google", request),
      response_type: "code",
      scope: GOOGLE_CALENDAR_SCOPE,
      access_type: "offline", // ask for a refresh token
      prompt: "consent", // guarantees a refresh token on reconnect
      include_granted_scopes: "false",
      state,
    });
    return `${GOOGLE_AUTH_URL}?${params}`;
  }
  const params = new URLSearchParams({
    client_id: env.pinterestAppId ?? "",
    redirect_uri: redirectUri("pinterest", request),
    response_type: "code",
    scope: pinterestScopes(),
    state,
  });
  return `${PINTEREST_AUTH_URL}?${params}`;
}
