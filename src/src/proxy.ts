import { NextResponse, type NextRequest } from "next/server";
import { authMode, SESSION_COOKIE, verifySessionToken } from "@/lib/server/session";

/**
 * Front door for every request:
 * - rate-limits the API per visitor (all modes — protects the server and the
 *   upstream services it calls);
 * - keeps the app private behind the single-user session, unless open mode
 *   (DASHBORD_OPEN=true) is switched on.
 * Public: login, the install guide, the offline page, PWA plumbing and assets.
 */

const PUBLIC_PATHS = new Set(["/login", "/setup", "/offline", "/api/auth/login", "/api/auth/logout", "/api/health"]);

/* --------------------------------------------------------------- rate limit */

// A real desk makes ~2 API calls a minute; this leaves plenty of headroom for
// a refresh-everything tap while stopping floods. Per server instance, which
// is enough to blunt casual abuse (pair with Vercel's firewall for more).
const WINDOW_MS = 60_000;
const LIMIT = 60;
const hits = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: NextRequest): string {
  return request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

function overLimit(key: string): number | null {
  const now = Date.now();
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
  }
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }
  entry.count += 1;
  return entry.count > LIMIT ? Math.ceil((entry.resetAt - now) / 1000) : null;
}

/* ------------------------------------------------------------------- proxy */

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (isApi && pathname !== "/api/health") {
    const retryAfter = overLimit(clientKey(request));
    if (retryAfter !== null) {
      // Same shape as a provider failure, so tiles show a calm "paused" state.
      return NextResponse.json(
        { ok: false, source: "server", error: { code: "upstream", message: "Too many requests — try again in a minute." } },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }
  }

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const mode = authMode();
  if (mode.kind === "open" || mode.kind === "public") return NextResponse.next();

  const authorized = mode.kind === "enabled" && (await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value));
  if (authorized) return NextResponse.next();

  if (isApi) {
    return NextResponse.json(
      { error: mode.kind === "misconfigured" ? "auth_not_configured" : "unauthorized" },
      { status: mode.kind === "misconfigured" ? 503 : 401 },
    );
  }
  const login = new URL("/login", request.url);
  if (pathname + search !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|demo/|robots.txt).*)",
  ],
};
