"use client";

import { Icon } from "@/components/ui/Icon";
import { useLongPress } from "@/hooks/useLongPress";
import type { DeskModeState } from "@/hooks/useWakeLock";
import { clockFace, longDate, shortDate } from "@/lib/time";
import styles from "./dashboard.module.css";

const DESK_LABEL: Record<DeskModeState, string> = {
  unsupported: "screen may sleep",
  off: "desk mode",
  pending: "desk mode …",
  on: "desk mode on",
  interrupted: "tap to resume",
  error: "desk mode paused",
};

export function ClockPanel({
  nowMs,
  timeZone,
  timeFormat,
  showSeconds,
  context,
  deskState,
  online,
  showInstall,
  onToggleDesk,
  onOpenSettings,
  timer,
}: {
  nowMs: number;
  timeZone: string;
  timeFormat: "12h" | "24h";
  showSeconds: boolean;
  context: string;
  deskState: DeskModeState;
  online: boolean;
  showInstall: boolean;
  onToggleDesk: () => void;
  onOpenSettings: () => void;
  /** Optional focus timer shown to the right of the time. */
  timer?: React.ReactNode;
}) {
  const longPress = useLongPress(onOpenSettings);
  const date = new Date(nowMs);
  const face = clockFace(date, timeZone, timeFormat);
  const spoken = `${face.hours}:${face.minutes}${face.period ? ` ${face.period}` : ""}, ${longDate(date, timeZone)}`;

  const dot = deskState === "on" ? "on" : deskState === "interrupted" || deskState === "error" ? "warn" : "off";

  return (
    <section className={styles.clockZone} aria-label="Clock">
      <div className={styles.clockRow}>
      <div
        className={styles.clockFace}
        {...longPress}
        title="Long-press for settings"
      >
        <p className="sr-only">{spoken}</p>
        <div className={styles.time} aria-hidden="true">
          <span className={styles.digits}>
            {face.hours}
            <span className={styles.colon}>:</span>
            {face.minutes}
          </span>
          {showSeconds || face.period ? (
            <span className={styles.timeSide}>
              {face.period ? <span className={styles.period}>{face.period}</span> : null}
              {showSeconds ? <span className={styles.seconds}>{face.seconds}</span> : null}
            </span>
          ) : null}
        </div>
      </div>
      {timer}
      </div>

      <div className={styles.meta}>
        <p className={styles.dateLine}>
          <span>{shortDate(date, timeZone)}</span>
          <span className={styles.context}>{context}</span>
        </p>
        <div className={styles.controls}>
          {!online ? (
            <span className={styles.pill} role="status">
              <span className={styles.statusDot} data-state="warn" aria-hidden="true" />
              offline
            </span>
          ) : null}
          {showInstall ? (
            <a className={styles.pill} href="/setup">
              install
            </a>
          ) : null}
          <button
            type="button"
            className={styles.pill}
            aria-pressed={deskState === "on"}
            onClick={onToggleDesk}
            aria-label={
              deskState === "unsupported"
                ? "Desk mode unavailable on this device. Open display tips."
                : deskState === "on"
                  ? "Desk mode on: screen stays awake. Turn off."
                  : "Turn on desk mode to keep the screen awake"
            }
          >
            <span className={styles.statusDot} data-state={dot} aria-hidden="true" />
            <span className={styles.deskLabel}>{DESK_LABEL[deskState]}</span>
          </button>
          <button type="button" className={styles.iconButton} onClick={onOpenSettings} aria-label="Settings" aria-haspopup="dialog">
            <Icon name="settings" />
          </button>
        </div>
      </div>
    </section>
  );
}
