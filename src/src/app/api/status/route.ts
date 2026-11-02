import { availableWeatherProviders, env } from "@/lib/server/env";
import { hasDatabase } from "@/lib/server/db";
import { requireSession } from "@/lib/server/http";
import { authMode } from "@/lib/server/session";
import { connectionSummary } from "@/lib/server/store";
import type { AppStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Which providers are active and whether OAuth connections exist. Never returns secrets. */
export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;

  const safeSummary = async (provider: "google" | "pinterest") => {
    try {
      return await connectionSummary(provider);
    } catch {
      return { connected: false as const };
    }
  };
  const [google, pinterest] = await Promise.all([safeSummary("google"), safeSummary("pinterest")]);

  const status: AppStatus = {
    calendarProvider: env.calendarProvider,
    weatherProviders: availableWeatherProviders(),
    defaultWeatherProvider: env.weatherProvider,
    inspirationProvider: env.inspirationProvider,
    database: hasDatabase(),
    auth: { enabled: authMode().kind === "enabled" },
    open: env.isOpen,
    google: { configured: Boolean(env.googleClientId && env.googleClientSecret), ...google },
    pinterest: { configured: Boolean(env.pinterestAppId && env.pinterestAppSecret), ...pinterest },
  };
  return Response.json(status, { headers: { "Cache-Control": "private, no-store" } });
}
