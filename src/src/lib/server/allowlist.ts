import "server-only";
import { env } from "./env";

/**
 * In open mode the server only fetches user-supplied links from known
 * calendar / feed hosts, so strangers can't use it as a general web fetcher.
 * Add hosts with DASHBORD_ALLOWED_FEED_HOSTS. (Signed-in mode allows any
 * public HTTPS host; private networks are blocked either way.)
 */

const DEFAULT_HOSTS = {
  calendar: ["calendar.google.com", "icloud.com", "outlook.live.com", "outlook.office365.com", "outlook.office.com"],
  cues: ["raw.githubusercontent.com", "gist.githubusercontent.com"],
} as const;

export type FeedKind = keyof typeof DEFAULT_HOSTS;

export function isHostAllowed(url: URL, kind: FeedKind): boolean {
  if (!env.isOpen) return true;
  const host = url.hostname.toLowerCase();
  return [...DEFAULT_HOSTS[kind], ...env.extraFeedHosts].some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export function allowedHostsLabel(kind: FeedKind): string {
  return [...DEFAULT_HOSTS[kind], ...env.extraFeedHosts].join(", ");
}
