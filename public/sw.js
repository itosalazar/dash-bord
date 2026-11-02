/* dash-bord service worker — offline shell, static asset and image caching.
 * API responses are never cached here: the app keeps its own last-good
 * snapshot in localStorage so stale data is always labelled as such. */

const VERSION = "v2";
const SHELL = `dashbord-shell-${VERSION}`;
const STATIC = `dashbord-static-${VERSION}`;
const IMAGES = `dashbord-images-${VERSION}`;
const MAX_IMAGES = 80;

const PRECACHE = [
  "/offline",
  "/setup",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/demo/warm-modernism-lounge.svg",
  "/demo/warm-modernism-arch.svg",
  "/demo/warm-modernism-still.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("dashbord-") && !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}

/** Pages: network first; fall back to the last good copy, then /offline. */
async function handleNavigation(request) {
  const cache = await caches.open(SHELL);
  try {
    const response = await fetch(request);
    // Only cache real pages — never auth redirects or errors.
    if (response.ok && !response.redirected && response.type === "basic") {
      const url = new URL(request.url);
      cache.put(url.pathname === "/" ? "/" : request, response.clone());
    }
    return response;
  } catch {
    const url = new URL(request.url);
    return (
      (await cache.match(url.pathname === "/" ? "/" : request)) ||
      (await cache.match("/")) ||
      (await cache.match("/offline")) ||
      new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
    );
  }
}

/** Hashed build assets never change: cache first. */
async function handleStatic(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/** Images (incl. the Pinterest CDN): serve cached, refresh in the background. */
async function handleImage(request, event) {
  const cache = await caches.open(IMAGES);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok || response.type === "opaque") {
        cache.put(request, response.clone()).then(() => trim(IMAGES, MAX_IMAGES));
      }
      return response;
    })
    .catch(() => hit);
  if (hit) {
    event.waitUntil(network);
    return hit;
  }
  return network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) return; // always live

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"))) {
    event.respondWith(handleStatic(request));
    return;
  }

  if (request.destination === "image" && (url.origin === self.location.origin || url.hostname.endsWith("pinimg.com"))) {
    event.respondWith(handleImage(request, event));
  }
});
