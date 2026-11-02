"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readJson, STORAGE_KEYS, writeJson } from "@/lib/client/storage";
import type { ProviderError, ProviderResult } from "@/lib/types";

/**
 * Fetches one provider endpoint on an interval, on visibility return, on
 * reconnect and on demand. The last good payload is written to the local
 * snapshot so the desk still shows something offline or on flaky Wi-Fi.
 */

export interface Slot<T> {
  data: T | null;
  fetchedAt: string | null;
  error: ProviderError | null;
  loading: boolean;
  source: string | null;
}

interface CachedEntry {
  /** Request signature: the URL, plus a hash of the POST body when there is one. */
  url: string;
  data: unknown;
  fetchedAt: string;
  source: string;
}

type SnapshotFile = Record<string, CachedEntry | undefined>;

export function readSnapshot(): SnapshotFile {
  return readJson<SnapshotFile>(STORAGE_KEYS.snapshot) ?? {};
}

function writeSnapshotEntry(name: string, entry: CachedEntry | undefined) {
  writeJson(STORAGE_KEYS.snapshot, { ...readSnapshot(), [name]: entry });
}

/** Errors that mean "this data no longer applies", not "temporarily unreachable". */
const CLEARS_DATA = new Set(["not_configured", "not_connected", "unauthorized", "invalid"]);

/** FNV-1a — lets the cache tell requests apart without storing the body (which may hold a private link). */
function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(36);
}

function signatureOf(url: string | null, body: string | null): string | null {
  return url && body ? `${url}#${fingerprint(body)}` : url;
}

function initialSlot<T>(name: string, signature: string | null): Slot<T> {
  const cached = signature ? readSnapshot()[name] : undefined;
  const usable = cached && cached.url === signature;
  return {
    data: usable ? (cached.data as T) : null,
    fetchedAt: usable ? cached.fetchedAt : null,
    source: usable ? cached.source : null,
    error: null,
    loading: Boolean(signature),
  };
}

/** `body` (a JSON string) turns the request into a POST — used for values that must stay out of URLs. */
export function useResource<T>(name: string, url: string | null, intervalMs: number | null, body: string | null = null) {
  const signature = signatureOf(url, body);
  const [slot, setSlot] = useState<Slot<T>>(() => initialSlot<T>(name, signature));
  const lastSuccess = useRef<number>(slot.fetchedAt ? Date.parse(slot.fetchedAt) : 0);
  const generation = useRef(0);

  const load = useCallback(async () => {
    if (!url || !signature) return;
    const run = ++generation.current;
    try {
      const res = await fetch(
        url,
        body
          ? { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body }
          : { cache: "no-store" },
      );
      if (res.status === 401) {
        // Session expired: a full navigation lets the proxy take over.
        window.location.replace(new URL("/login", window.location.href));
        return;
      }
      const result = (await res.json()) as ProviderResult<T>;
      if (run !== generation.current) return;
      if (result.ok) {
        lastSuccess.current = Date.parse(result.fetchedAt);
        setSlot({ data: result.data, fetchedAt: result.fetchedAt, source: result.source, error: null, loading: false });
        writeSnapshotEntry(name, { url: signature, data: result.data, fetchedAt: result.fetchedAt, source: result.source });
      } else {
        const clear = CLEARS_DATA.has(result.error.code);
        if (clear) writeSnapshotEntry(name, undefined);
        setSlot((s) => ({
          ...s,
          data: clear ? null : s.data,
          fetchedAt: clear ? null : s.fetchedAt,
          source: result.source,
          error: result.error,
          loading: false,
        }));
      }
    } catch {
      if (run !== generation.current) return;
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      setSlot((s) => ({
        ...s,
        loading: false,
        error: offline
          ? { code: "offline", message: "Offline — showing the last snapshot." }
          : { code: "upstream", message: "Couldn't reach dash-bord's server." },
      }));
    }
  }, [name, url, body, signature]);

  /** Manual refresh: show a loading state immediately, then fetch. */
  const refresh = useCallback(() => {
    if (!url) return;
    setSlot((s) => ({ ...s, loading: true }));
    void load();
  }, [load, url]);

  // Initial fetch and whenever the request changes (e.g. settings edited).
  // Deferred a tick so the fetch's state updates land outside the effect body.
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (!url || !intervalMs) return;
    const interval = setInterval(() => void load(), intervalMs);
    const refreshIfStale = () => {
      if (document.visibilityState === "visible" && Date.now() - lastSuccess.current > intervalMs) void load();
    };
    const onOnline = () => void load();
    document.addEventListener("visibilitychange", refreshIfStale);
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfStale);
      window.removeEventListener("online", onOnline);
    };
  }, [load, url, intervalMs]);

  // A request that changed to "nothing to fetch" (e.g. remote cues turned off).
  const effective: Slot<T> = url ? slot : { data: null, fetchedAt: null, error: null, loading: false, source: null };
  return [effective, refresh] as const;
}
