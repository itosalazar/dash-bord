import "server-only";
import { env } from "@/lib/server/env";
import { fail, fetchWithTimeout, ok, UpstreamError } from "@/lib/server/http";
import { getConnection, readCache, updateAccessToken, writeCache } from "@/lib/server/store";
import { hasDatabase } from "@/lib/server/db";
import { parsePinterestBoardUrl } from "@/lib/settings";
import type { InspirationBoard, InspirationPin } from "@/lib/types";
import type { InspirationProvider } from "../types";

/**
 * Pinterest API v5 via OAuth. Only documented endpoints are used — no page
 * scraping. Pins are fetched as metadata + CDN image URLs, cached server-side,
 * and the browser chooses one featured Pin at a time.
 */

export const PINTEREST_AUTH_URL = "https://www.pinterest.com/oauth/";
export const PINTEREST_TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";
const API = "https://api.pinterest.com/v5";

export function pinterestScopes(): string {
  return env.pinterestIncludeSecret ? "boards:read,pins:read,boards:read_secret,pins:read_secret" : "boards:read,pins:read";
}

interface PinterestTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  message?: string;
}

function basicAuth(): string {
  return "Basic " + Buffer.from(`${env.pinterestAppId}:${env.pinterestAppSecret}`).toString("base64");
}

export async function exchangePinterestCode(code: string, redirectUri: string): Promise<PinterestTokenResponse> {
  const res = await fetchWithTimeout(PINTEREST_TOKEN_URL, {
    method: "POST",
    headers: { Authorization: basicAuth(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  const body = (await res.json()) as PinterestTokenResponse;
  if (!res.ok) throw new UpstreamError(body.message ?? "token exchange failed", res.status);
  return body;
}

async function accessToken(): Promise<string | null> {
  const conn = await getConnection("pinterest");
  if (!conn) return null;
  if (conn.accessToken && conn.accessTokenExpiresAt && conn.accessTokenExpiresAt.getTime() - Date.now() > 60_000) {
    return conn.accessToken;
  }
  const res = await fetchWithTimeout(PINTEREST_TOKEN_URL, {
    method: "POST",
    headers: { Authorization: basicAuth(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: conn.refreshToken }),
  });
  const body = (await res.json()) as PinterestTokenResponse;
  if (!res.ok) throw new UpstreamError("refresh_failed", res.status);
  await updateAccessToken("pinterest", body.access_token, new Date(Date.now() + body.expires_in * 1000), body.refresh_token);
  return body.access_token;
}

async function api<T>(path: string, token: string): Promise<T> {
  const res = await fetchWithTimeout(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new UpstreamError("unauthorized", 401);
  if (!res.ok) throw new UpstreamError(`pinterest ${res.status}`, res.status);
  return (await res.json()) as T;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

interface PinterestBoard {
  id: string;
  name: string;
  owner?: { username?: string };
}

async function resolveBoard(boardUrl: string, token: string): Promise<PinterestBoard | null> {
  const parsed = parsePinterestBoardUrl(boardUrl);
  if (!parsed) return null;
  const cacheKey = `pinterest:board:${parsed.username}/${parsed.slug}`.toLowerCase();
  const cached = await readCache<PinterestBoard>(cacheKey, 7 * 24 * 3_600_000);
  if (cached) return cached;

  const wantSlug = slugify(parsed.slug);
  const wantUser = parsed.username.toLowerCase();
  let bookmark: string | undefined;
  for (let page = 0; page < 5; page++) {
    const query = new URLSearchParams({ page_size: "100" });
    if (env.pinterestIncludeSecret) query.set("privacy", "ALL");
    if (bookmark) query.set("bookmark", bookmark);
    const body = await api<{ items: PinterestBoard[]; bookmark?: string | null }>(`/boards?${query}`, token);
    const match = body.items.find(
      (b) => slugify(b.name) === wantSlug && (!b.owner?.username || b.owner.username.toLowerCase() === wantUser),
    );
    if (match) {
      await writeCache(cacheKey, match);
      return match;
    }
    if (!body.bookmark) break;
    bookmark = body.bookmark;
  }
  return null;
}

interface PinterestPin {
  id: string;
  title?: string | null;
  description?: string | null;
  alt_text?: string | null;
  dominant_color?: string | null;
  media?: {
    media_type?: string;
    images?: Record<string, { url: string; width: number; height: number }>;
  };
}

function toPin(pin: PinterestPin): InspirationPin | null {
  if (pin.media?.media_type && pin.media.media_type !== "image") return null;
  const images = pin.media?.images ?? {};
  const best = images["1200x"] ?? images["600x"] ?? images["400x300"];
  if (!best?.url) return null;
  const label = pin.alt_text || pin.title || pin.description || "Pinterest image";
  return {
    id: pin.id,
    imageUrl: best.url,
    width: best.width,
    height: best.height,
    alt: label.slice(0, 240),
    title: pin.title ?? undefined,
    dominantColor: pin.dominant_color ?? undefined,
    link: `https://www.pinterest.com/pin/${encodeURIComponent(pin.id)}/`,
  };
}

export const pinterestProvider: InspirationProvider = {
  id: "pinterest",
  async getBoard({ boardUrl }) {
    if (!env.pinterestAppId || !env.pinterestAppSecret) {
      return fail("pinterest", { code: "not_configured", message: "Pinterest app credentials are not configured on the server." });
    }
    if (!hasDatabase()) {
      return fail("pinterest", { code: "not_configured", message: "A database is required to store the Pinterest connection." });
    }
    if (!boardUrl) return fail("pinterest", { code: "not_configured", message: "Add a Pinterest board URL in Settings." });
    if (!parsePinterestBoardUrl(boardUrl)) {
      return fail("pinterest", { code: "invalid", message: "That doesn't look like a Pinterest board URL." });
    }
    try {
      const token = await accessToken();
      if (!token) return fail("pinterest", { code: "not_connected", message: "Pinterest connection pending." });
      const board = await resolveBoard(boardUrl, token);
      if (!board) {
        return fail("pinterest", {
          code: "invalid",
          message: "Board not found. Pinterest only shares boards owned by, or shared with, the connected account.",
        });
      }

      const pinsKey = `pinterest:pins:${board.id}`;
      const cached = await readCache<InspirationBoard>(pinsKey, 6 * 3_600_000);
      if (cached) return ok("pinterest", cached);

      const body = await api<{ items: PinterestPin[] }>(`/boards/${encodeURIComponent(board.id)}/pins?page_size=100`, token);
      const pins = body.items.map(toPin).filter((p): p is InspirationPin => p !== null);
      const data: InspirationBoard = { boardName: board.name, boardUrl, pins };
      await writeCache(pinsKey, data);
      return ok("pinterest", data);
    } catch (error) {
      if (error instanceof UpstreamError && (error.status === 401 || error.message === "refresh_failed")) {
        return fail("pinterest", { code: "unauthorized", message: "Pinterest access expired. Reconnect in Settings." });
      }
      console.error("[inspiration:pinterest]", error instanceof Error ? error.message : error);
      return fail("pinterest", { code: "upstream", message: "Pinterest did not respond." });
    }
  },
};
