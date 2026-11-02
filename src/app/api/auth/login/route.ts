import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/server/env";
import { authMode, createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/server/session";

export const dynamic = "force-dynamic";

// Best-effort brute-force damping; per-instance memory is fine for a single user.
const attempts = new Map<string, { count: number; resetAt: number }>();

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "/";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/api/") ? next : "/";
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const next = safeNext(form?.get("next") ?? null);
  const redirect = (path: string) => Response.redirect(new URL(path, request.url), 303);

  if (authMode().kind !== "enabled") return redirect("/login?error=config");

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const entry = attempts.get(ip);
  if (entry && entry.resetAt > now && entry.count >= 8) return redirect("/login?error=locked");

  const given = typeof form?.get("passphrase") === "string" ? (form.get("passphrase") as string) : "";
  const valid = timingSafeEqual(digest(given), digest(env.passphrase ?? ""));

  if (!valid) {
    const current = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + 15 * 60_000 };
    attempts.set(ip, { ...current, count: current.count + 1 });
    await new Promise((r) => setTimeout(r, 600));
    return redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
  }

  attempts.delete(ip);
  const token = await createSessionToken();
  const response = redirect(next);
  const headers = new Headers(response.headers);
  headers.append(
    "Set-Cookie",
    [
      `${SESSION_COOKIE}=${token}`,
      "Path=/",
      `Max-Age=${SESSION_MAX_AGE}`,
      "HttpOnly",
      "SameSite=Lax",
      env.isProduction ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; "),
  );
  return new Response(null, { status: 303, headers });
}
