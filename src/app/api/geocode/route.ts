import { fetchWithTimeout, requireSession } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Location search for Settings, via Open-Meteo's key-less geocoder. */
export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const name = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (name.length < 2) return Response.json({ results: [] });

  try {
    const params = new URLSearchParams({ name, count: "6", language: "en", format: "json" });
    const res = await fetchWithTimeout(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {}, 6000);
    if (!res.ok) throw new Error(`geocode ${res.status}`);
    const body = (await res.json()) as {
      results?: { name: string; latitude: number; longitude: number; admin1?: string; country?: string }[];
    };
    const results = (body.results ?? []).map((r) => ({
      name: r.name,
      detail: [r.admin1, r.country].filter(Boolean).join(", "),
      latitude: r.latitude,
      longitude: r.longitude,
    }));
    return Response.json({ results });
  } catch {
    return Response.json({ results: [], error: "Location search is unavailable right now." }, { status: 502 });
  }
}
