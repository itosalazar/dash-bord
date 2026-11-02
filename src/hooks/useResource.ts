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

function initialSlot<T>(name: string, url: string | null): Slot<T> {
  const cached = url ? readSnapshot()[name] : undefined;
  const usable = cached && cached.url === url;
  return {
    data: usable ? (cached.data as T) : null,
    fetchedAt: usable ? cached.fetchedAt : null,
    source: usable ? cached.source : null,
    error: null,
    loading: Boolean(url),
  };
}

export function useResource<T>(name: string, url: string | null, intervalMs: number | null) {
  const [slot, setSlot] = useState<Slot<T>>(() => initialSlot<T>(name, url));
  const lastSuccess = useRef<number>(slot.fetchedAt ? Date.parse(slot.fetchedAt) : 0);
  const generation = useRef(0);

  const load = useCallback(async () => {
    if (!url) return;
    const run = ++generation.current;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.status === 401) {
        // Session expired: a full navigation lets the proxy take over.
        window.location.replace(new URL("/login", window.location.href));
        return;
      }
      const body = (await res.json()) as ProviderResult<T>;
      if (run !== generation.current) return;
      if (body.ok) {
        lastSuccess.current = Date.parse(body.fetchedAt);
        setSlot({ data: body.data, fetchedAt: body.fetchedAt, source: body.source, error: null, loading: false });
        writeSnapshotEntry(name, { url, data: body.data, fetchedAt: body.fetchedAt, source: body.source });
      } else {
        const clear = CLEARS_DATA.has(body.error.code);
        if (clear) writeSnapshotEntry(name, undefined);
        setSlot((s) => ({
          ...s,
          data: clear ? null : s.data,
          fetchedAt: clear ? null : s.fetchedAt,
          source: body.source,
          error: body.error,
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
  }, [name, url]);

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
