"use client";

import { useCallback, useState } from "react";
import { readJson, STORAGE_KEYS, writeJson } from "@/lib/client/storage";
import { scramble } from "@/lib/cues";

/**
 * Deterministic rotation: index = scramble(bucket) + manual offset. The
 * bucket comes from the cadence (hour, day, a per-launch seed, or fixed for
 * "manual"), so a reload inside the same period shows the same item and
 * nothing needs an effect to "advance" on a timer.
 */

/** Chosen once per page load — the "on app launch" cadence. */
const LAUNCH_SEED = Math.floor(Math.random() * 1_000_000);

interface RotationState {
  pin: number;
  cue: number;
}

export type Cadence = "manual" | "15m" | "hourly" | "daily" | "launch";

const PERIOD: Record<"15m" | "hourly" | "daily", number> = {
  "15m": 15 * 60_000,
  hourly: 3_600_000,
  daily: 86_400_000,
};

export function bucketFor(cadence: Cadence, nowMs: number, zoneOffsetMin: number): number {
  if (cadence === "manual") return 0;
  if (cadence === "launch") return LAUNCH_SEED;
  return Math.floor((nowMs + zoneOffsetMin * 60_000) / PERIOD[cadence]);
}

export function pickIndex(length: number, bucket: number, offset: number): number {
  if (length <= 0) return -1;
  return (scramble(bucket) + offset) % length;
}

export function useRotation() {
  const [state, setState] = useState<RotationState>(() => {
    const saved = readJson<RotationState>(STORAGE_KEYS.rotation);
    return { pin: saved?.pin ?? 0, cue: saved?.cue ?? 0 };
  });

  const advance = useCallback((key: keyof RotationState) => {
    setState((current) => {
      const next = { ...current, [key]: current[key] + 1 };
      writeJson(STORAGE_KEYS.rotation, next);
      return next;
    });
  }, []);

  return { offsets: state, advance };
}
