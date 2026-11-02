"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readJson, STORAGE_KEYS, writeJson } from "@/lib/client/storage";

/**
 * Desk Mode = a Screen Wake Lock requested only from a user gesture, and
 * re-requested when the app becomes visible again. If the platform refuses
 * or revokes it, the state says so and the UI shows a fallback.
 */

export type DeskModeState =
  | "unsupported" // no Wake Lock API (older iOS)
  | "off"
  | "pending"
  | "on"
  | "interrupted" // was on, released by the system — needs a tap to resume
  | "error"; // request rejected

function initialState(): DeskModeState {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return "unsupported";
  // Desk Mode was on last session; we may not re-request without a gesture.
  return readJson<boolean>(STORAGE_KEYS.deskMode) ? "interrupted" : "off";
}

export function useWakeLock() {
  const [state, setState] = useState<DeskModeState>(initialState);
  const sentinel = useRef<WakeLockSentinel | null>(null);
  const wanted = useRef(false);

  const request = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      const lock = await navigator.wakeLock.request("screen");
      sentinel.current = lock;
      setState("on");
      lock.addEventListener("release", () => {
        if (sentinel.current === lock) sentinel.current = null;
        setState(wanted.current ? "interrupted" : "off");
      });
    } catch {
      sentinel.current = null;
      setState("error");
    }
  }, []);

  /** Must be called from a click / tap handler. */
  const enable = useCallback(() => {
    wanted.current = true;
    writeJson(STORAGE_KEYS.deskMode, true);
    setState("pending");
    void request();
  }, [request]);

  const disable = useCallback(async () => {
    wanted.current = false;
    writeJson(STORAGE_KEYS.deskMode, false);
    const lock = sentinel.current;
    sentinel.current = null;
    setState("off");
    await lock?.release().catch(() => undefined);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible" && wanted.current && !sentinel.current) void request();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel.current?.release().catch(() => undefined);
    };
  }, [request]);

  return { state, enable, disable };
}
