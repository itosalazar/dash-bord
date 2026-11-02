import { SESSION_COOKIE } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/login?signedOut=1", request.url).toString(),
      "Set-Cookie": `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
    },
  });
}
