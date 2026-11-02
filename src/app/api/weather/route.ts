import { weatherProvider } from "@/lib/providers/registry";
import { fail, providerJson, requireSession } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// Shared across visitors: one upstream call per ~1 km grid cell per 10 minutes.
const CACHE_MS = 10 * 60_000;
const cache = new Map<string, { at: number; body: Awaited<ReturnType<ReturnType<typeof weatherProvider>["getCurrent"]>> }>();

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

  const key = [provider.id, unit, hasLocation ? lat.toFixed(2) : "-", hasLocation ? lon.toFixed(2) : "-", provider.id === "mock" ? timeZone : ""].join("|");
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    // Same weather, but keep the visitor's own place name.
    return providerJson(hit.body.ok ? { ...hit.body, data: { ...hit.body.data, locationName: name || hit.body.data.locationName } } : hit.body);
  }
  if (cache.size > 2000) cache.clear();

  const result = await provider.getCurrent({
    unit,
    location: hasLocation ? { name: name || "Location", latitude: lat, longitude: lon } : null,
    timeZone,
  });
  if (result.ok) cache.set(key, { at: Date.now(), body: result });
  return providerJson(result);
}
