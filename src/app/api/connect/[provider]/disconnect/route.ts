import { GOOGLE_REVOKE_URL } from "@/lib/providers/calendar/google";
import { fetchWithTimeout, requireSession } from "@/lib/server/http";
import { isOAuthProvider } from "@/lib/server/oauth";
import { deleteConnection, getConnection } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;

  const { provider } = await params;
  if (!isOAuthProvider(provider)) return Response.json({ error: "unknown provider" }, { status: 404 });

  try {
    const conn = await getConnection(provider);
    if (conn && provider === "google") {
      // Best effort: tell Google to drop the grant too.
      await fetchWithTimeout(GOOGLE_REVOKE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: conn.refreshToken }),
      }).catch(() => undefined);
    }
    await deleteConnection(provider);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(`[disconnect:${provider}]`, error instanceof Error ? error.message : error);
    return Response.json({ ok: false, error: "Could not disconnect" }, { status: 500 });
  }
}
