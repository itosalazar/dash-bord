"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { SettingsSheet, type SettingsSection } from "@/components/settings/SettingsSheet";
import { useAppStatus } from "@/hooks/useAppStatus";
import { useClock } from "@/hooks/useClock";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useOnline } from "@/hooks/useOnline";
import { phaseMinutes, remainingFor, usePomodoro, type TimerPhase } from "@/hooks/usePomodoro";
import { bucketFor, pickIndex, useRotation } from "@/hooks/useRotation";
import { useSettings } from "@/hooks/useSettings";
import { useWakeLock } from "@/hooks/useWakeLock";
import { contextLine } from "@/lib/context-line";
import { buildCuePool } from "@/lib/cues";
import { resolveTimeZone, zonedParts, zoneOffsetMinutes } from "@/lib/time";
import { CalendarTile } from "./CalendarTile";
import { ClockPanel } from "./ClockPanel";
import { CueTile } from "./CueTile";
import { InspirationTile } from "./InspirationTile";
import { PomodoroTimer } from "./PomodoroTimer";
import { WeatherTile } from "./WeatherTile";
import styles from "./dashboard.module.css";

const OAUTH_MESSAGES: Record<string, string> = {
  connected: "Connected. Fetching fresh data…",
  denied: "Connection was cancelled.",
  state: "That sign-in link expired. Please try again.",
  config: "This server is missing OAuth settings — see the README.",
  database: "Connecting needs DATABASE_URL on the server.",
  encryption: "Connecting needs TOKEN_ENCRYPTION_KEY on the server.",
  client: "OAuth client id/secret are not configured on the server.",
  no_refresh_token: "No refresh token was returned. Remove dash-bord's access in your account settings and connect again.",
  scope: "The read-only calendar permission was not granted.",
  exchange: "The provider rejected the sign-in. Try again in a moment.",
  open: "Account sign-ins are off in open mode — paste your calendar and board links in Settings instead.",
};

/** Reads ?settings=…&connected=1|error=… left by an OAuth round-trip, once. */
function readLaunchIntent(): { section: SettingsSection | null; message: string | null } {
  const params = new URLSearchParams(window.location.search);
  const target = params.get("settings");
  const section: SettingsSection | null =
    target === "google" ? "calendar" : target === "pinterest" ? "inspiration" : target ? "display" : null;
  const error = params.get("error");
  const message = params.get("connected") ? OAUTH_MESSAGES.connected! : error ? (OAUTH_MESSAGES[error] ?? "Something went wrong.") : null;
  if (target || error) window.history.replaceState(null, "", "/");
  return { section, message };
}

function isIosSafariTab(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  const ipadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || ipadOs;
  return ios && nav.standalone === false;
}

export default function Dashboard() {
  const nowMs = useClock();
  const online = useOnline();
  const { settings, update, sync } = useSettings();
  const { status, reload: reloadStatus } = useAppStatus();
  const desk = useWakeLock();
  const { offsets, advance } = useRotation();

  const [launch] = useState(readLaunchIntent);
  const [settingsOpen, setSettingsOpen] = useState<SettingsSection | null>(launch.section);
  const [toast, setToast] = useState<string | null>(launch.message);
  const [showInstall] = useState(isIosSafariTab);

  const timeZone = resolveTimeZone(settings.display.timeZone);
  const data = useDashboardData(settings, timeZone);

  const now = new Date(nowMs);
  const parts = zonedParts(now, timeZone);
  const offsetMin = zoneOffsetMinutes(now, timeZone);

  /* -- inspiration: one featured Pin, rotated by cadence */
  const pins = data.inspiration.data?.pins ?? [];
  const pinIndex = pickIndex(pins.length, bucketFor(settings.inspiration.cadence, nowMs, offsetMin), offsets.pin);
  const pin = pinIndex >= 0 ? (pins[pinIndex] ?? null) : null;

  /* -- cue: one prompt from the selected source */
  const cueHour = parts.hour;
  const cueDay = parts.weekday;
  const pool = buildCuePool(settings.cues, data.remoteCues.data, { day: cueDay, hour: cueHour });
  const cueIndex = pickIndex(pool.length, bucketFor(settings.cues.cadence, nowMs, offsetMin), offsets.cue);
  const cue = pool[cueIndex] ?? pool[0]!;

  const context = contextLine({
    nowMs,
    hour: parts.hour,
    timeZone,
    timeFormat: settings.display.timeFormat,
    events: data.calendar.data?.events ?? null,
    weather: data.weather.data,
  });

  const dim = settings.display.nightDim && (parts.hour >= 22 || parts.hour < 6);

  const openSettings = useCallback((section: SettingsSection = "display") => setSettingsOpen(section), []);

  /* -- focus timer */
  const timerConfig = settings.timer;
  const onTimerComplete = useCallback(
    (finished: TimerPhase, next: TimerPhase) => {
      const minutes = phaseMinutes(next, timerConfig);
      setToast(
        finished === "focus"
          ? `Focus done. Time for a ${minutes}-minute ${next === "long" ? "long break" : "break"}.`
          : `Break's over. Ready for ${minutes} minutes of focus?`,
      );
    },
    [timerConfig],
  );
  const pomodoro = usePomodoro(timerConfig, onTimerComplete);
  const timerRemaining = remainingFor(pomodoro.state, timerConfig, nowMs);
  const timerTotal = phaseMinutes(pomodoro.state.phase, timerConfig) * 60_000;

  const toggleDesk = useCallback(() => {
    if (desk.state === "unsupported") {
      setSettingsOpen("desk");
      return;
    }
    if (desk.state === "on") void desk.disable();
    else desk.enable();
  }, [desk]);

  // Register the service worker (production builds only; dev caching is a trap).
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <>
      <main className={styles.desk} data-dim={dim} aria-label="dash-bord desk">
        <div className={styles.main}>
          <ClockPanel
            nowMs={nowMs}
            timeZone={timeZone}
            timeFormat={settings.display.timeFormat}
            showSeconds={settings.display.showSeconds}
            context={context}
            deskState={desk.state}
            online={online}
            showInstall={showInstall}
            onToggleDesk={toggleDesk}
            onOpenSettings={() => openSettings()}
            timer={
              timerConfig.enabled ? (
                <PomodoroTimer
                  phase={pomodoro.state.phase}
                  status={pomodoro.state.status}
                  remainingMs={timerRemaining}
                  totalMs={timerTotal}
                  session={(pomodoro.state.completedFocus % timerConfig.sessionsBeforeLong) + 1}
                  sessionsBeforeLong={timerConfig.sessionsBeforeLong}
                  onToggle={pomodoro.toggle}
                  onReset={pomodoro.reset}
                />
              ) : null
            }
          />
          <div className={styles.info}>
            <WeatherTile slot={data.weather} nowMs={nowMs} onRetry={data.refresh.weather} onOpenSettings={() => openSettings("weather")} />
            <CalendarTile
              slot={data.calendar}
              nowMs={nowMs}
              timeZone={timeZone}
              timeFormat={settings.display.timeFormat}
              windowHours={settings.calendar.windowHours}
              onRetry={data.refresh.calendar}
              onOpenSettings={() => openSettings("calendar")}
            />
          </div>
        </div>
        <div className={styles.side}>
          <CueTile
            cue={cue}
            index={Math.max(0, cueIndex)}
            total={pool.length}
            showAttribution={settings.cues.showAttribution}
            onNext={() => advance("cue")}
          />
          <InspirationTile
            slot={data.inspiration}
            pin={pin}
            nowMs={nowMs}
            onNext={() => advance("pin")}
            onRetry={data.refresh.inspiration}
            onOpenSettings={() => openSettings("inspiration")}
          />
        </div>
      </main>

      <div className={styles.rotate} role="alert">
        <Icon name="rotate" className={styles.rotateIcon} />
        <p className={styles.rotateTitle}>Turn me sideways</p>
        <p className={styles.rotateBody}>dash-bord is a landscape desk display on phones. Rest it horizontally on its stand.</p>
      </div>

      {toast ? (
        <div className={styles.toast} role="status">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss">
            ok
          </button>
        </div>
      ) : null}

      <SettingsSheet
        open={settingsOpen !== null}
        section={settingsOpen ?? "display"}
        onSectionChange={setSettingsOpen}
        onClose={() => setSettingsOpen(null)}
        settings={settings}
        update={update}
        sync={sync}
        status={status}
        reloadStatus={reloadStatus}
        data={data}
        nowMs={nowMs}
        deskState={desk.state}
        onEnableDesk={desk.enable}
        onDisableDesk={() => void desk.disable()}
      />
    </>
  );
}
