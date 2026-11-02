import { randomToken } from "@/lib/server/crypto";
import { env } from "@/lib/server/env";
import { requireSession } from "@/lib/server/http";
import { authorizationUrl, isOAuthProvider, OAUTH_STATE_COOKIE, oauthUnavailableReason } from "@/lib/server/oauth";

export const dynamic = "force-dynamic";

/** Starts the server-side OAuth flow. Secrets never reach the browser. */
export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;

  const { provider } = await params;
  if (!isOAuthProvider(provider)) return new Response("Unknown provider", { status: 404 });

  const back = (query: string) => Response.redirect(new URL(`/?${query}`, request.url), 303);
  const reason = oauthUnavailableReason(provider);
  if (reason) return back(`settings=${provider}&error=${reason}`);

  const state = randomToken();
  return new Response(null, {
    status: 303,
    headers: {
      Location: authorizationUrl(provider, request, state),
      "Set-Cookie": [
        `${OAUTH_STATE_COOKIE}=${provider}.${state}`,
        "Path=/api/connect",
        "Max-Age=600",
        "HttpOnly",
        "SameSite=Lax",
        env.isProduction ? "Secure" : "",
      ]
        .filter(Boolean)
        .join("; "),
    },
  });
}
