import { DotText } from "@/components/ui/DotMatrix";
import { REFRESH } from "@/hooks/useDashboardData";
import type { Slot } from "@/hooks/useResource";
import type { CalendarSnapshot } from "@/lib/types";
import { eventTime, untilLabel } from "@/lib/time";
import { TileEmpty, TileNotice } from "./TileNotice";
import styles from "./dashboard.module.css";

// Rendered up to 4; CSS container queries show 2–4 depending on tile height.
const MAX_VISIBLE = 4;

export function CalendarTile({
  slot,
  nowMs,
  timeZone,
  timeFormat,
  windowHours,
  onRetry,
  onOpenSettings,
}: {
  slot: Slot<CalendarSnapshot>;
  nowMs: number;
  timeZone: string;
  timeFormat: "12h" | "24h";
  windowHours: number;
  onRetry: () => void;
  onOpenSettings: () => void;
}) {
  // Drop events that ended since the last fetch so the list stays honest offline.
  // Timed events lead; all-day events follow so "next" always means a real time.
  const live = (slot.data?.events ?? []).filter((e) => Date.parse(e.end) > nowMs);
  const events = [...live.filter((e) => !e.allDay), ...live.filter((e) => e.allDay)];
  const visible = events.slice(0, MAX_VISIBLE);
  const needsConnection = !slot.data && (slot.error?.code === "not_connected" || slot.error?.code === "unauthorized" || slot.error?.code === "not_configured");

  return (
    <section className={`${styles.tile} ${styles.dark}`} aria-labelledby="calendar-label">
      <div className={styles.padded}>
        <div className={styles.labelRow}>
          <h2 id="calendar-label" className={styles.label}>
            up next
          </h2>
          {events.length > 0 ? <span className={styles.counter}>{String(events.length).padStart(2, "0")}</span> : null}
        </div>

        {slot.data && visible.length > 0 ? (
          <ul className={styles.events}>
            {visible.map((event, index) => {
              const start = Date.parse(event.start);
              const inProgress = start <= nowMs;
              const when = event.allDay
                ? "all day"
                : `${eventTime(event.start, timeZone, timeFormat)} – ${eventTime(event.end, timeZone, timeFormat)}`;
              return (
                <li key={event.id} className={styles.event} data-next={index === 0}>
                  <span className={styles.eventBar} aria-hidden="true" />
                  <div style={{ minWidth: 0 }}>
                    <p className={styles.eventTitle}>{event.title}</p>
                    <p className={styles.eventTime}>
                      {when}
                      {index === 0 && !event.allDay ? (
                        <span className={styles.nowTag}> · {inProgress ? "now" : untilLabel(nowMs, start)}</span>
                      ) : null}
                      {event.status === "declined" ? " · declined" : event.status === "tentative" ? " · maybe" : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : slot.data ? (
          <div className={styles.events}>
            <DotText text="00" className={styles.emptyArt} />
            <p className={styles.eventTime}>clear for the next {windowHours} h</p>
          </div>
        ) : null}
      </div>

      {!slot.data && slot.loading ? (
        <div style={{ position: "absolute", inset: 0 }}>
          <TileEmpty art={<DotText text="--" className={styles.skeleton} />} title="" body="reading the calendar…" />
        </div>
      ) : null}

      {!slot.data && !slot.loading && slot.error ? (
        <div style={{ position: "absolute", inset: 0 }}>
          <TileEmpty
            title={needsConnection ? "Calendar not connected" : "Calendar unavailable"}
            body={slot.error.message}
            action={
              <button type="button" className={styles.retry} onClick={needsConnection ? onOpenSettings : onRetry}>
                {needsConnection ? "connect" : "retry"}
              </button>
            }
          />
        </div>
      ) : null}

      <TileNotice slot={slot} nowMs={nowMs} staleAfterMs={REFRESH.calendar * 3} onRetry={onRetry} name="calendar" />
    </section>
  );
}
