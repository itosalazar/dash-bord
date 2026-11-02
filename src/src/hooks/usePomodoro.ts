"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playChime, unlockAudio } from "@/lib/client/chime";
import { readJson, STORAGE_KEYS, writeJson } from "@/lib/client/storage";
import type { Settings } from "@/lib/settings";

/**
 * Pomodoro state machine: focus → short break → focus … → long break.
 * Driven by an absolute `endsAt`, so it stays correct when iOS throttles or
 * suspends the page, and it survives reloads (state lives in localStorage).
 */

export type TimerPhase = "focus" | "short" | "long";
export type TimerStatus = "idle" | "running" | "paused";

interface TimerState {
  phase: TimerPhase;
  status: TimerStatus;
  endsAt: number | null; // running
  remainingMs: number | null; // paused
  completedFocus: number; // focus sessions finished in the current cycle
}

const INITIAL: TimerState = { phase: "focus", status: "idle", endsAt: null, remainingMs: null, completedFocus: 0 };

type TimerConfig = Settings["timer"];

export function phaseMinutes(phase: TimerPhase, config: TimerConfig): number {
  return phase === "focus" ? config.focusMinutes : phase === "short" ? config.shortBreakMinutes : config.longBreakMinutes;
}

function restore(): TimerState {
  const saved = readJson<TimerState>(STORAGE_KEYS.timer);
  if (!saved || !["focus", "short", "long"].includes(saved.phase)) return INITIAL;
  return { ...INITIAL, ...saved };
}

export function usePomodoro(config: TimerConfig, onComplete: (finished: TimerPhase, next: TimerPhase) => void) {
  const [state, setState] = useState<TimerState>(restore);
  const latest = useRef({ config, onComplete, state });

  useEffect(() => {
    latest.current = { config, onComplete, state };
  }, [config, onComplete, state]);

  const commit = useCallback((next: TimerState | ((current: TimerState) => TimerState)) => {
    setState((current) => {
      const value = typeof next === "function" ? next(current) : next;
      writeJson(STORAGE_KEYS.timer, value);
      return value;
    });
  }, []);

  // Phase finished: chime, advance, optionally auto-start the next phase.
  useEffect(() => {
    if (state.status !== "running" || state.endsAt === null) return;
    const endsAt = state.endsAt;
    const timeout = setTimeout(() => {
      const { config: cfg, onComplete: notify, state: current } = latest.current;
      const overdueMs = Date.now() - endsAt;
      // Don't ring for a timer that ended long ago (e.g. the app was closed).
      if (cfg.sound && overdueMs < 60_000) playChime(cfg.volume);

      const finished = current.phase;
      const completedFocus = finished === "focus" ? current.completedFocus + 1 : current.completedFocus;
      const upcoming: TimerPhase =
        finished === "focus" ? (completedFocus % cfg.sessionsBeforeLong === 0 ? "long" : "short") : "focus";
      commit({
        phase: upcoming,
        status: cfg.autoStartNext ? "running" : "idle",
        endsAt: cfg.autoStartNext ? Date.now() + phaseMinutes(upcoming, cfg) * 60_000 : null,
        remainingMs: null,
        completedFocus: finished === "long" ? 0 : completedFocus,
      });
      notify(finished, upcoming);
    }, Math.max(0, endsAt - Date.now()));
    return () => clearTimeout(timeout);
  }, [state.status, state.endsAt, commit]);

  /** Start or resume. Must run from a tap so iOS allows the end-of-timer chime. */
  const start = useCallback(() => {
    unlockAudio();
    commit((current) => {
      const ms = current.status === "paused" && current.remainingMs ? current.remainingMs : phaseMinutes(current.phase, latest.current.config) * 60_000;
      return { ...current, status: "running", endsAt: Date.now() + ms, remainingMs: null };
    });
  }, [commit]);

  const pause = useCallback(() => {
    commit((current) =>
      current.status === "running" && current.endsAt
        ? { ...current, status: "paused", remainingMs: Math.max(0, current.endsAt - Date.now()), endsAt: null }
        : current,
    );
  }, [commit]);

  /** Back to the start of the current phase. */
  const reset = useCallback(() => {
    commit((current) => ({ ...current, status: "idle", endsAt: null, remainingMs: null }));
  }, [commit]);

  /** Fresh cycle: focus, nothing completed. */
  const resetCycle = useCallback(() => commit(INITIAL), [commit]);

  const toggle = useCallback(() => {
    if (state.status === "running") pause();
    else start();
  }, [state.status, pause, start]);

  return { state, start, pause, toggle, reset, resetCycle };
}

/** Remaining milliseconds for display, given the current clock tick. */
export function remainingFor(state: TimerState, config: TimerConfig, nowMs: number): number {
  if (state.status === "running" && state.endsAt) return Math.max(0, state.endsAt - nowMs);
  if (state.status === "paused" && state.remainingMs !== null) return state.remainingMs;
  return phaseMinutes(state.phase, config) * 60_000;
}
