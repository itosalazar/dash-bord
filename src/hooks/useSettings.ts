"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readJson, STORAGE_KEYS, writeJson } from "@/lib/client/storage";
import { normalizeSettings, type Settings } from "@/lib/settings";

export type SettingsSync = "local" | "saving" | "saved" | "error";

/**
 * Settings live in localStorage first (instant, offline) and are mirrored to
 * the server when a database is configured. Newest `updatedAt` wins.
 */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => normalizeSettings(readJson(STORAGE_KEYS.settings)));
  const [sync, setSync] = useState<SettingsSync>("local");
  const latest = useRef(settings);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    latest.current = settings;
    document.documentElement.dataset.theme = settings.display.theme;
  }, [settings]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { persisted: boolean; settings: unknown } | null) => {
        if (cancelled || !body) return;
        if (body.persisted && body.settings) {
          const remote = normalizeSettings(body.settings);
          if (Date.parse(remote.updatedAt) > Date.parse(latest.current.updatedAt)) {
            setSettings(remote);
            writeJson(STORAGE_KEYS.settings, remote);
          }
        }
        setSync(body.persisted ? "saved" : "local");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      clearTimeout(saveTimer.current);
    };
  }, []);

  const update = useCallback((change: (current: Settings) => Settings) => {
    const next = normalizeSettings({ ...change(latest.current), updatedAt: new Date().toISOString() });
    latest.current = next;
    setSettings(next);
    writeJson(STORAGE_KEYS.settings, next);

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSync((s) => (s === "local" ? s : "saving"));
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      })
        .then((res) => res.json())
        .then((body: { persisted: boolean }) => setSync(body.persisted ? "saved" : "local"))
        .catch(() => setSync("error"));
    }, 600);
  }, []);

  return { settings, update, sync };
}
