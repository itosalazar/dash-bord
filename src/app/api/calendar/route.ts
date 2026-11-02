import { calendarProvider } from "@/lib/providers/registry";
import { providerJson, requireSession } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const q = new URL(request.url).searchParams;
  const hours = Math.min(72, Math.max(1, Math.round(Number(q.get("hours")) || 24)));
  const flag = (name: string) => q.get(name) === "1";

  const result = await calendarProvider().getUpcoming({
    hours,
    hideDeclined: flag("hideDeclined"),
    hideAllDay: flag("hideAllDay"),
    hidePrivate: flag("hidePrivate"),
  });
  return providerJson(result);
}
