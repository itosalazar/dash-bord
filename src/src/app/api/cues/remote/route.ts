import { FeedError, fetchRemoteCues } from "@/lib/providers/quotes/remote";
import { fail, ok, providerJson, requireSession } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const url = new URL(request.url).searchParams.get("url") ?? "";
  if (!url) return providerJson(fail("remote", { code: "not_configured", message: "Add a feed URL in Settings." }));
  try {
    return providerJson(ok("remote", await fetchRemoteCues(url)));
  } catch (error) {
    const message = error instanceof FeedError ? error.message : "The feed could not be loaded.";
    return providerJson(fail("remote", { code: error instanceof FeedError ? "invalid" : "upstream", message }));
  }
}
