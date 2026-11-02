import { NextResponse, type NextRequest } from "next/server";
import { authMode, SESSION_COOKIE, verifySessionToken } from "@/lib/server/session";

/**
 * Keeps the whole app private behind the single-user session. Public:
 * login, the install guide, the offline page, PWA plumbing and static assets.
 */

const PUBLIC_PATHS = new Set(["/login", "/setup", "/offline", "/api/auth/login", "/api/auth/logout", "/api/health"]);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const mode = authMode();
  if (mode.kind === "open") return NextResponse.next();

  const isApi = pathname.startsWith("/api/");
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
