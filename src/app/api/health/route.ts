export const dynamic = "force-dynamic";

/** Public liveness probe used by the service worker to detect connectivity. */
export function GET() {
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
