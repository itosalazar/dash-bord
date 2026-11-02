"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { REFRESH } from "@/hooks/useDashboardData";
import type { Slot } from "@/hooks/useResource";
import type { SettingsSync } from "@/hooks/useSettings";
import type { DeskModeState } from "@/hooks/useWakeLock";
import { removeKey, STORAGE_KEYS } from "@/lib/client/storage";
import { parsePinterestBoardUrl, ROTATION_CADENCES } from "@/lib/settings";
import { agoLabel, deviceTimeZone } from "@/lib/time";
import { Group, Segmented, StatusDot, Switch } from "./controls";
import type { SectionProps } from "./SettingsSheet";
import styles from "./settings.module.css";

const CADENCE_LABELS: Record<(typeof ROTATION_CADENCES)[number], string> = {
  manual: "manual",
  hourly: "hourly",
  daily: "daily",
  launch: "on launch",
};

/* ---------------------------------------------------------------- display */

function timeZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Costa_Rica", "Europe/London", "Europe/Paris", "Asia/Tokyo", "Australia/Sydney"];
  }
}

export function DisplaySection({ settings, update }: SectionProps) {
  const zones = useMemo(() => timeZones(), []);
  const d = settings.display;
  const set = (patch: Partial<typeof d>) => update((s) => ({ ...s, display: { ...s.display, ...patch } }));

  return (
    <>
      <Segmented
        legend="time format"
        value={d.timeFormat}
        options={[
          { value: "24h", label: "24-hour" },
          { value: "12h", label: "12-hour" },
        ]}
        onChange={(timeFormat) => set({ timeFormat })}
      />
      <Switch label="Show seconds" description="dot-matrix seconds beside the minutes" checked={d.showSeconds} onChange={(showSeconds) => set({ showSeconds })} />
      <Group label="time zone">
        <select className={styles.select} value={d.timeZone} onChange={(e) => set({ timeZone: e.target.value })} aria-label="Time zone">
          <option value="auto">Automatic ({deviceTimeZone()})</option>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </Group>
      <Segmented
        legend="theme"
        value={d.theme}
        options={[
          { value: "graphite", label: "graphite" },
          { value: "noir", label: "noir" },
          { value: "paper", label: "paper" },
        ]}
        onChange={(theme) => set({ theme })}
      />
      <Switch
        label="Dim at night"
        description="softens the whole desk between 22:00 and 06:00"
        checked={d.nightDim}
        onChange={(nightDim) => set({ nightDim })}
      />
      <p className={styles.hint}>Tip: long-press the clock to open settings from anywhere on the desk.</p>
    </>
  );
}

/* ------------------------------------------------------------------- desk */

export function DeskSection({ state, onEnable, onDisable }: { state: DeskModeState; onEnable: () => void; onDisable: () => void }) {
  const copy: Record<DeskModeState, string> = {
    unsupported: "This browser can't keep the screen awake (Screen Wake Lock is unavailable). Use the fallback below.",
    off: "Desk Mode is off. The screen follows your normal Auto-Lock setting.",
    pending: "Asking the system to keep the screen awake…",
    on: "Desk Mode is on. The screen stays awake while dash-bord is open and visible.",
    interrupted: "The system released the wake lock (the app was hidden, or Low Power Mode kicked in). Tap to resume.",
    error: "The system declined the wake lock — often because of Low Power Mode. Tap to try again, or use the fallback.",
  };
  return (
    <>
      <div className={styles.statusCard}>
        <div className={styles.statusLine}>
          <span className={styles.statusName}>
            <StatusDot tone={state === "on" ? "ok" : state === "off" ? "idle" : "warn"} />
            {state === "on" ? "Screen stays awake" : state === "unsupported" ? "Not available here" : "Screen may sleep"}
          </span>
          {state === "unsupported" ? null : state === "on" ? (
            <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={onDisable}>
              turn off
            </button>
          ) : (
            <button type="button" className={`${styles.button} ${styles.accentButton}`} onClick={onEnable}>
              {state === "off" ? "turn on desk mode" : "resume"}
            </button>
          )}
        </div>
        <p className={styles.statusMeta} role="status">
          {copy[state]}
        </p>
      </div>
      <Group label="how it works">
        <p className={styles.prose}>
          dash-bord asks for a screen wake lock only when you tap. If iOS releases it — switching apps, locking the phone — it&apos;s
          requested again when you come back. It never forces fullscreen, rotation or background activity.
        </p>
      </Group>
      <Group label="fallback">
        <p className={styles.prose}>
          On iPhone: Settings → Display &amp; Brightness → Auto-Lock → Never, while the phone is on its charging stand. Optional:
          Accessibility → Guided Access keeps the phone on dash-bord.
        </p>
      </Group>
    </>
  );
}

/* ---------------------------------------------------------------- weather */

interface GeoResult {
  name: string;
  detail: string;
  latitude: number;
  longitude: number;
}

const WEATHER_LABELS: Record<string, string> = {
  default: "server default",
  mock: "demo data",
  "open-meteo": "Open-Meteo",
  openweathermap: "OpenWeatherMap",
};

export function WeatherSection({ settings, update, status, data, nowMs }: SectionProps) {
  const w = settings.weather;
  const set = (patch: Partial<typeof w>) => update((s) => ({ ...s, weather: { ...s.weather, ...patch } }));
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const providers = ["default", ...(status?.weatherProviders ?? ["mock", "open-meteo"])] as const;

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
      const body = (await res.json()) as { results: GeoResult[]; error?: string };
      setResults(body.results);
      if (body.error) setMessage(body.error);
      else if (body.results.length === 0) setMessage("No places found.");
    } catch {
      setMessage("Location search needs a connection.");
    } finally {
      setSearching(false);
    }
  };

  const useDevice = () => {
    if (!("geolocation" in navigator)) {
      setMessage("This device can't share its location.");
      return;
    }
    setMessage("Asking for location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set({ location: { name: "Current location", latitude: pos.coords.latitude, longitude: pos.coords.longitude } });
        setMessage("Location saved.");
      },
      () => setMessage("Location permission was declined."),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 3_600_000 },
    );
  };

  return (
    <>
      <ProviderCard name="Weather" slot={data.weather} nowMs={nowMs} staleAfterMs={REFRESH.weather * 2} onRetry={data.refresh.weather} every="every 30 min" />
      <Segmented
        legend="provider"
        value={w.provider}
        options={providers.map((p) => ({ value: p, label: p === "default" && status ? `default · ${WEATHER_LABELS[status.defaultWeatherProvider]}` : WEATHER_LABELS[p]! }))}
        onChange={(provider) => set({ provider })}
        hint="Open-Meteo needs no key. OpenWeatherMap appears once OPENWEATHERMAP_API_KEY is set on the server."
      />
      <Segmented
        legend="temperature unit"
        value={w.unit}
        options={[
          { value: "c", label: "°C" },
          { value: "f", label: "°F" },
        ]}
        onChange={(unit) => set({ unit })}
      />
      <Group label={`location · ${w.location ? w.location.name : "not set"}`}>
        <form className={styles.inputRow} onSubmit={search} role="search">
          <input
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a city"
            aria-label="Search a city"
            enterKeyHint="search"
          />
          <button type="submit" className={styles.button} disabled={searching}>
            {searching ? "searching…" : "search"}
          </button>
          <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={useDevice}>
            <Icon name="location" size={16} /> use this device
          </button>
        </form>
        {message ? (
          <p className={styles.hint} role="status">
            {message}
          </p>
        ) : null}
        {results.length > 0 ? (
          <ul className={styles.results}>
            {results.map((r) => (
              <li key={`${r.latitude},${r.longitude}`}>
                <button
                  type="button"
                  className={styles.result}
                  onClick={() => {
                    set({ location: { name: r.name, latitude: r.latitude, longitude: r.longitude } });
                    setResults([]);
                    setQuery("");
                    setMessage(`Location set to ${r.name}.`);
                  }}
                >
                  <span>{r.name}</span>
                  <small>{r.detail}</small>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </Group>
    </>
  );
}

/* --------------------------------------------------------------- calendar */

export function CalendarSection({ settings, update, status, reloadStatus, data, nowMs }: SectionProps) {
  const c = settings.calendar;
  const set = (patch: Partial<typeof c>) => update((s) => ({ ...s, calendar: { ...s.calendar, ...patch } }));
  const isGoogle = status?.calendarProvider === "google";

  return (
    <>
      <ProviderCard name="Calendar" slot={data.calendar} nowMs={nowMs} staleAfterMs={REFRESH.calendar * 3} onRetry={data.refresh.calendar} every="every 5 min" />
      {isGoogle ? (
        <ConnectionCard
          provider="google"
          label="Google Calendar"
          connection={status.google}
          scopeNote="Read-only access to events (calendar.events.readonly). Tokens are encrypted on the server."
          onChanged={async () => {
            await reloadStatus();
            data.refresh.calendar();
          }}
        />
      ) : (
        <p className={styles.hint}>
          Showing the demo calendar. Set CALENDAR_PROVIDER=google and the Google OAuth variables on the server to connect your real
          calendar (see README).
        </p>
      )}
      <Segmented
        legend="look ahead"
        value={String(c.windowHours)}
        options={[
          { value: "12", label: "12 h" },
          { value: "24", label: "24 h" },
          { value: "48", label: "48 h" },
        ]}
        onChange={(v) => set({ windowHours: Number(v) })}
      />
      <Group label="hide">
        <Switch label="Declined events" checked={c.hideDeclined} onChange={(hideDeclined) => set({ hideDeclined })} />
        <Switch label="All-day events" checked={c.hideAllDay} onChange={(hideAllDay) => set({ hideAllDay })} />
        <Switch label="Private events" description="events marked private or confidential" checked={c.hidePrivate} onChange={(hidePrivate) => set({ hidePrivate })} />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------ inspiration */

export function InspirationSection({ settings, update, status, reloadStatus, data, nowMs }: SectionProps) {
  const i = settings.inspiration;
  const [draft, setDraft] = useState(i.boardUrl);
  const valid = draft.trim() === "" || parsePinterestBoardUrl(draft) !== null;
  const isPinterest = status?.inspirationProvider === "pinterest";

  return (
    <>
      <ProviderCard name="Inspiration" slot={data.inspiration} nowMs={nowMs} staleAfterMs={REFRESH.inspiration * 4} onRetry={data.refresh.inspiration} every="pins cached for 6 h" />
      {isPinterest ? (
        <ConnectionCard
          provider="pinterest"
          label="Pinterest"
          connection={status.pinterest}
          scopeNote="Uses Pinterest's API (boards:read, pins:read) for Pin images and links. No page scraping."
          onChanged={async () => {
            await reloadStatus();
            data.refresh.inspiration();
          }}
        />
      ) : (
        <p className={styles.hint}>
          Demo mode: local illustrations stand in for your board. Set INSPIRATION_PROVIDER=pinterest and the Pinterest app variables
          on the server to use a real board.
        </p>
      )}
      <Group label="pinterest board url">
        <form
          className={styles.inputRow}
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            update((s) => ({ ...s, inspiration: { ...s.inspiration, boardUrl: draft.trim() } }));
          }}
        >
          <input
            className={styles.input}
            type="url"
            inputMode="url"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://www.pinterest.com/username/board-name/"
            aria-label="Pinterest board URL"
            aria-invalid={!valid}
            aria-describedby="board-hint"
          />
          <button type="submit" className={styles.button} disabled={!valid || draft.trim() === i.boardUrl}>
            save
          </button>
        </form>
        <p id="board-hint" className={valid ? styles.hint : styles.error}>
          {valid ? "One image from this board is featured at a time. Tap it on the desk to open the original Pin." : "Use a board link like pinterest.com/username/board-name/"}
        </p>
      </Group>
      <Segmented
        legend="rotate the featured image"
        value={i.cadence}
        options={ROTATION_CADENCES.map((value) => ({ value, label: CADENCE_LABELS[value] }))}
        onChange={(cadence) => update((s) => ({ ...s, inspiration: { ...s.inspiration, cadence } }))}
        hint="The refresh button on the card always shows the next image."
      />
    </>
  );
}

/* ------------------------------------------------------------------- data */

export function DataSection({ status, data, nowMs, sync }: SectionProps & { sync: SettingsSync }) {
  const [cleared, setCleared] = useState(false);
  return (
    <>
      <ProviderCard name="Weather" slot={data.weather} nowMs={nowMs} staleAfterMs={REFRESH.weather * 2} onRetry={data.refresh.weather} every="every 30 min" />
      <ProviderCard name="Calendar" slot={data.calendar} nowMs={nowMs} staleAfterMs={REFRESH.calendar * 3} onRetry={data.refresh.calendar} every="every 5 min" />
      <ProviderCard name="Inspiration" slot={data.inspiration} nowMs={nowMs} staleAfterMs={REFRESH.inspiration * 4} onRetry={data.refresh.inspiration} every="every 6 h" />
      {data.remoteCues.fetchedAt || data.remoteCues.error ? (
        <ProviderCard name="Cue feed" slot={data.remoteCues} nowMs={nowMs} staleAfterMs={REFRESH.remoteCues * 4} onRetry={data.refresh.remoteCues} every="every 6 h" />
      ) : null}
      <div className={styles.inputRow}>
        <button type="button" className={`${styles.button} ${styles.accentButton}`} onClick={data.refresh.all}>
          <Icon name="refresh" size={16} /> refresh everything
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.ghost}`}
          onClick={() => {
            removeKey(STORAGE_KEYS.snapshot);
            setCleared(true);
          }}
        >
          clear offline snapshot
        </button>
      </div>
      {cleared ? (
        <p className={styles.ok} role="status">
          Snapshot cleared. It refills on the next successful refresh.
        </p>
      ) : null}
      <Group label="settings storage">
        <p className={styles.prose}>
          {sync === "saved" || status?.database
            ? "Settings are saved on this device and synced to your private database."
            : "Settings are saved on this device only. Add DATABASE_URL on the server to sync them."}
        </p>
      </Group>
      {status?.auth.enabled ? (
        <form method="post" action="/api/auth/logout">
          <button type="submit" className={`${styles.button} ${styles.ghost}`}>
            sign out
          </button>
        </form>
      ) : (
        <p className={styles.hint}>Sign-in is disabled in local development. Set DASHBORD_PASSPHRASE and AUTH_SECRET to require it.</p>
      )}
    </>
  );
}

/* ------------------------------------------------------------- shared bits */

export function ProviderCard<T>({
  name,
  slot,
  nowMs,
  staleAfterMs,
  onRetry,
  every,
}: {
  name: string;
  slot: Slot<T>;
  nowMs: number;
  staleAfterMs: number;
  onRetry: () => void;
  every: string;
}) {
  const stale = slot.fetchedAt ? nowMs - Date.parse(slot.fetchedAt) > staleAfterMs : false;
  const tone = slot.error ? "warn" : stale ? "warn" : slot.data ? "ok" : "idle";
  return (
    <div className={styles.statusCard}>
      <div className={styles.statusLine}>
        <span className={styles.statusName}>
          <StatusDot tone={tone} />
          {name}
          {slot.source ? <span className={styles.statusMeta}>· {slot.source}</span> : null}
        </span>
        <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={onRetry} disabled={slot.loading} aria-label={`Refresh ${name}`}>
          {slot.loading ? "refreshing…" : slot.error ? "retry" : "refresh"}
        </button>
      </div>
      <p className={styles.statusMeta} role="status">
        last updated {agoLabel(slot.fetchedAt, nowMs)} · {every}
        {slot.error ? ` · ${slot.error.message}` : ""}
      </p>
    </div>
  );
}

function ConnectionCard({
  provider,
  label,
  connection,
  scopeNote,
  onChanged,
}: {
  provider: "google" | "pinterest";
  label: string;
  connection: { configured: boolean; connected: boolean; accountLabel?: string };
  scopeNote: string;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/connect/${provider}/disconnect`, { method: "POST" });
      if (!res.ok) throw new Error();
      await onChanged();
    } catch {
      setError("Couldn't disconnect. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.statusCard}>
      <div className={styles.statusLine}>
        <span className={styles.statusName}>
          <StatusDot tone={connection.connected ? "ok" : "warn"} />
          {connection.connected ? `${label} · ${connection.accountLabel ?? "connected"}` : `${label} · not connected`}
        </span>
        {!connection.configured ? null : connection.connected ? (
          <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={disconnect} disabled={busy}>
            {busy ? "…" : "disconnect"}
          </button>
        ) : (
          <a className={styles.button} href={`/api/connect/${provider}`}>
            connect
          </a>
        )}
      </div>
      <p className={styles.statusMeta}>
        {connection.configured ? scopeNote : "OAuth client credentials are missing on the server — see README."}
      </p>
      <p className={styles.statusMeta}>
        Tip: on iPhone the Home Screen app has its own cookies. You can also connect from a desktop browser signed in to dash-bord — the
        connection is stored on the server.
      </p>
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
