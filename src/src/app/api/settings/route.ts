import { hasDatabase } from "@/lib/server/db";
import { requireSession } from "@/lib/server/http";
import { loadSettings, saveSettings } from "@/lib/server/store";
import { settingsSchema } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDatabase()) return Response.json({ persisted: false, settings: null });
  try {
    return Response.json({ persisted: true, settings: await loadSettings() });
  } catch (error) {
    console.error("[settings:get]", error instanceof Error ? error.message : error);
    return Response.json({ persisted: false, settings: null, error: "Database unavailable" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid settings" }, { status: 400 });
  if (!hasDatabase()) return Response.json({ persisted: false });
  try {
    await saveSettings(parsed.data);
    return Response.json({ persisted: true });
  } catch (error) {
    console.error("[settings:put]", error instanceof Error ? error.message : error);
    return Response.json({ persisted: false, error: "Database unavailable" }, { status: 503 });
  }
}
