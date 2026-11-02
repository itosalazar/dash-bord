import "server-only";
import { fail, fetchWithTimeout, ok } from "@/lib/server/http";
import { boardNameFromSlug, parsePinterestBoardUrl } from "@/lib/settings";
import type { InspirationBoard, InspirationPin } from "@/lib/types";
import type { InspirationProvider } from "../types";

/**
 * Pinterest's public board RSS feed (`/<user>/<board>.rss`). No developer
 * app, OAuth or database needed — works for any public board and returns its
 * ~25 most recent Pins. Secret boards have no feed; use the API provider.
 */

const MAX_BYTES = 2 * 1024 * 1024;
const CACHE_MS = 30 * 60_000;
const cache = new Map<string, { at: number; data: InspirationBoard }>();

export function boardFeedUrl(boardUrl: string): string | null {
  const parsed = parsePinterestBoardUrl(boardUrl);
  if (!parsed) return null;
  return `https://www.pinterest.com/${encodeURIComponent(parsed.username)}/${encodeURIComponent(parsed.slug)}.rss`;
}

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function tag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return match ? decodeEntities(match[1]!).trim() : "";
}

/** Swap the 236px feed thumbnail for Pinterest's 736px rendition. */
function largerImage(src: string): string | null {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !url.hostname.endsWith("pinimg.com")) return null;
  url.pathname = url.pathname.replace(/^\/\d+x(\d+)?\//, "/736x/");
  return url.toString();
}

export function parseBoardFeed(xml: string, fallbackName: string): InspirationBoard {
  const channel = xml.split("<item>")[0] ?? "";
  const boardName = tag(channel, "title") || fallbackName;
  const pins: InspirationPin[] = [];

  for (const [, block] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    if (!block) continue;
    const description = tag(block, "description");
    const src = description.match(/<img[^>]+src="([^"]+)"/)?.[1];
    const imageUrl = src ? largerImage(src) : null;
    if (!imageUrl) continue;

    const link = tag(block, "link");
    const id = link.match(/\/pin\/(\d+)/)?.[1] ?? imageUrl;
    const text = tag(block, "title").replace(/\s+/g, " ");
    pins.push({
      id,
      imageUrl,
      alt: (text || "Image from the Pinterest board").slice(0, 240),
      title: text ? text.slice(0, 80) : undefined,
      link: /^https:\/\/([a-z]+\.)?pinterest\.[a-z.]+\/pin\//.test(link) ? link : undefined,
    });
  }
  return { boardName, pins };
}

export const pinterestRssProvider: InspirationProvider = {
  id: "rss",
  async getBoard({ boardUrl }) {
    if (!boardUrl) return fail("rss", { code: "not_configured", message: "Add a Pinterest board URL in Settings." });
    const feedUrl = boardFeedUrl(boardUrl);
    const parsed = parsePinterestBoardUrl(boardUrl);
    if (!feedUrl || !parsed) {
      return fail("rss", { code: "invalid", message: "Use a board link like pinterest.com/username/board-name/" });
    }

    const hit = cache.get(feedUrl);
    if (hit && Date.now() - hit.at < CACHE_MS) return ok("rss", { ...hit.data, boardUrl });

    try {
      const res = await fetchWithTimeout(
        feedUrl,
        { headers: { Accept: "application/rss+xml, text/xml;q=0.9", "User-Agent": "dash-bord/0.1 (personal desk display)" } },
        8000,
      );
      if (res.status === 404) {
        return fail("rss", {
          code: "invalid",
          message: "Board not found. Check the link, and make sure the board is public (secret boards have no feed).",
        });
      }
      if (!res.ok) throw new Error(`feed ${res.status}`);
      const xml = await res.text();
      if (xml.length > MAX_BYTES || !xml.includes("<rss")) throw new Error("unexpected feed body");

      const data = parseBoardFeed(xml, boardNameFromSlug(parsed.slug));
      cache.set(feedUrl, { at: Date.now(), data });
      return ok("rss", { ...data, boardUrl });
    } catch (error) {
      console.error("[inspiration:rss]", error instanceof Error ? error.message : error);
      if (hit) return ok("rss", { ...hit.data, boardUrl }); // stale beats nothing
      return fail("rss", { code: "upstream", message: "Pinterest's board feed didn't respond. Try again in a little while." });
    }
  },
};
