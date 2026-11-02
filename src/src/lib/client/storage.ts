/**
 * localStorage helpers that never throw (private mode, quota, disabled
 * storage). Everything stored here is a convenience cache — the dashboard
 * still renders without it.
 */

export const STORAGE_KEYS = {
  settings: "dashbord:settings",
  snapshot: "dashbord:snapshot:v1",
  rotation: "dashbord:rotation:v1",
  deskMode: "dashbord:desk-mode",
  timer: "dashbord:timer:v1",
} as const;

export function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — the live UI keeps working.
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
