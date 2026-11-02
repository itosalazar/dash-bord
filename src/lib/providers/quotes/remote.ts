import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { z } from "zod";
import type { Cue } from "@/lib/types";
import type { QuoteProvider } from "../types";

/**
 * Optional remote cue feed. The endpoint must be HTTPS and return
 * `[{ text, attribution?, tags? }]`. Fetched server-side with a timeout,
 * a size cap, no redirects and a private-network guard.
 */

const feedSchema = z
  .array(
    z.object({
      text: z.string().trim().min(1).max(280),
      attribution: z.string().trim().max(120).optional(),
      tags: z.array(z.string().trim().max(40)).max(12).optional(),
    }),
  )
  .min(1)
  .max(500);

const MAX_BYTES = 256 * 1024;

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const a = address.toLowerCase();
    if (a === "::1" || a === "::") return true;
    if (a.startsWith("fc") || a.startsWith("fd") || a.startsWith("fe80")) return true;
    if (a.startsWith("::ffff:")) return isPrivateAddress(a.slice(7));
    return false;
  }
  const [a = 0, b = 0] = address.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

export class FeedError extends Error {}

export async function assertPublicHttpsUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FeedError("Enter a full https:// URL.");
  }
  if (url.protocol !== "https:") throw new FeedError("The feed must use HTTPS.");
  if (url.username || url.password) throw new FeedError("Credentials in the URL are not allowed.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new FeedError("Private hosts are not allowed.");
  }
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new FeedError("That host could not be resolved.");
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new FeedError("Private network addresses are not allowed.");
  return url;
}

export async function fetchRemoteCues(raw: string): Promise<Cue[]> {
  const url = await assertPublicHttpsUrl(raw);
  const res = await fetch(url, {
    redirect: "error",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(6000),
  }).catch(() => {
    throw new FeedError("The feed did not respond.");
  });
  if (!res.ok) throw new FeedError(`The feed answered with HTTP ${res.status}.`);
  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) throw new FeedError("The feed is larger than 256 KB.");
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new FeedError("The feed is larger than 256 KB.");

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new FeedError("The feed is not valid JSON.");
  }
  const parsed = feedSchema.safeParse(json);
  if (!parsed.success) throw new FeedError("Expected an array of { text, attribution?, tags? }.");
  return parsed.data.map((item, index) => ({ id: `remote-${index}`, ...item }));
}

export function remoteQuoteProvider(url: string): QuoteProvider {
  return { id: "remote", list: () => fetchRemoteCues(url) };
}
