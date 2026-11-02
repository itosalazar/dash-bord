import { inspirationProvider } from "@/lib/providers/registry";
import { providerJson, requireSession } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const boardUrl = (new URL(request.url).searchParams.get("board") ?? "").slice(0, 300);
  return providerJson(await inspirationProvider(boardUrl).getBoard({ boardUrl }));
}
