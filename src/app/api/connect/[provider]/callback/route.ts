import { cookies } from "next/headers";
import { exchangeGoogleCode, GOOGLE_CALENDAR_SCOPE } from "@/lib/providers/calendar/google";
import { exchangePinterestCode } from "@/lib/providers/inspiration/pinterest";
import { requireSession } from "@/lib/server/http";
import { isOAuthProvider, OAUTH_STATE_COOKIE, oauthUnavailableReason, redirectUri } from "@/lib/server/oauth";
import { saveConnection } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;

  const { provider } = await params;
  if (!isOAuthProvider(provider)) return new Response("Unknown provider", { status: 404 });

  const jar = await cookies();
  const expected = jar.get(OAUTH_STATE_COOKIE)?.value;
  jar.delete({ name: OAUTH_STATE_COOKIE, path: "/api/connect" });

  const url = new URL(request.url);
  const back = (query: string) => Response.redirect(new URL(`/?settings=${provider}&${query}`, request.url), 303);

  if (url.searchParams.get("error")) return back("error=denied");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || expected !== `${provider}.${state}`) return back("error=state");
  if (oauthUnavailableReason(provider)) return back("error=config");

  try {
    if (provider === "google") {
      const tokens = await exchangeGoogleCode(code, redirectUri("google", request));
      if (!tokens.refresh_token) return back("error=no_refresh_token");
      const granted = tokens.scope?.split(" ") ?? [];
      if (!granted.includes(GOOGLE_CALENDAR_SCOPE)) return back("error=scope");
      await saveConnection("google", {
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope,
      });
    } else {
      const tokens = await exchangePinterestCode(code, redirectUri("pinterest", request));
      if (!tokens.refresh_token) return back("error=no_refresh_token");
      await saveConnection("pinterest", {
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope,
        accountLabel: "Pinterest",
      });
    }
    return back("connected=1");
  } catch (error) {
    console.error(`[connect:${provider}]`, error instanceof Error ? error.message : error);
    return back("error=exchange");
  }
}
