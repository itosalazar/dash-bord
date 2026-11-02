import { calendarProvider } from "@/lib/providers/registry";
import { providerJson, requireSession } from "@/lib/server/http";
import type { CalendarQuery } from "@/lib/types";

export const dynamic = "force-dynamic";

function clampHours(value: unknown): number {
  return Math.min(72, Math.max(1, Math.round(Number(value)) || 24));
}

async function respond(query: CalendarQuery) {
  return providerJson(await calendarProvider(query.icsUrl).getUpcoming(query));
}

/** POST keeps the private iCal link in the body — out of URLs and request logs. */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const icsUrl = typeof body.icsUrl === "string" ? body.icsUrl.trim().slice(0, 1000) : "";
  return respond({
    hours: clampHours(body.hours),
    hideDeclined: body.hideDeclined === true,
    hideAllDay: body.hideAllDay === true,
    hidePrivate: body.hidePrivate === true,
    icsUrl: icsUrl || undefined,
  });
}

export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const q = new URL(request.url).searchParams;
  return respond({
    hours: clampHours(q.get("hours")),
    hideDeclined: q.get("hideDeclined") === "1",
    hideAllDay: q.get("hideAllDay") === "1",
    hidePrivate: q.get("hidePrivate") === "1",
  });
}
