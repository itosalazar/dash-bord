import { weatherProvider } from "@/lib/providers/registry";
import { fail, providerJson, requireSession } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const q = new URL(request.url).searchParams;
  const provider = weatherProvider(q.get("provider") ?? undefined);
  const unit = q.get("unit") === "f" ? "f" : "c";
  const lat = Number(q.get("lat"));
  const lon = Number(q.get("lon"));
  const name = (q.get("name") ?? "").slice(0, 120);
  const timeZone = (q.get("tz") ?? "").slice(0, 64) || undefined;

  const hasLocation = q.has("lat") && q.has("lon") && Number.isFinite(lat) && Number.isFinite(lon);
  if (hasLocation && (Math.abs(lat) > 90 || Math.abs(lon) > 180)) {
    return providerJson(fail(provider.id, { code: "invalid", message: "Location is out of range." }));
  }

  const result = await provider.getCurrent({
    unit,
    location: hasLocation ? { name: name || "Location", latitude: lat, longitude: lon } : null,
    timeZone,
  });
  return providerJson(result);
}
