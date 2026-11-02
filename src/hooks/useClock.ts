"use client";

import { useSyncExternalStore } from "react";

/**
 * One shared second-aligned ticker for the whole app. iOS throttles timers
 * in the background, so it also re-syncs whenever the page becomes visible.
 */

let now = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit() {
  now = Date.now();
  for (const listener of listeners) listener();
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    emit();
    schedule();
  }, 1000 - (Date.now() % 1000) + 8);
}

function onVisibility() {
  if (document.visibilityState === "visible") {
    emit();
    schedule();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    schedule();
    document.addEventListener("visibilitychange", onVisibility);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    }
  };
}

function getSnapshot() {
  if (now === 0) now = Date.now();
  return now;
}

const getServerSnapshot = () => 0;

/** Current epoch ms, updated every second. 0 during server render. */
export function useClock(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
