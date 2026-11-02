import { Icon } from "@/components/ui/Icon";
import type { TimerPhase, TimerStatus } from "@/hooks/usePomodoro";
import styles from "./dashboard.module.css";

const TICKS = 60;
const PHASE_LABEL: Record<TimerPhase, string> = { focus: "focus", short: "break", long: "long break" };

function minutesSeconds(ms: number): [string, string] {
  const total = Math.ceil(ms / 1000);
  return [String(Math.floor(total / 60)).padStart(2, "0"), String(total % 60).padStart(2, "0")];
}

/**
 * A ring of 60 ticks that empties clockwise as the phase runs — the ticking
 * dial from the references. Tap the ring to start / pause.
 */
export function PomodoroTimer({
  phase,
  status,
  remainingMs,
  totalMs,
  session,
  sessionsBeforeLong,
  onToggle,
  onReset,
}: {
  phase: TimerPhase;
  status: TimerStatus;
  remainingMs: number;
  totalMs: number;
  session: number;
  sessionsBeforeLong: number;
  onToggle: () => void;
  onReset: () => void;
}) {
  const fraction = totalMs > 0 ? remainingMs / totalMs : 0;
  const lit = Math.ceil(fraction * TICKS);
  const head = TICKS - lit;
  const minutesLeft = Math.ceil(remainingMs / 60_000);
  const [mm, ss] = minutesSeconds(remainingMs);

  const label =
    status === "running"
      ? `Pause ${PHASE_LABEL[phase]} timer, ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"} left`
      : status === "paused"
        ? `Resume ${PHASE_LABEL[phase]} timer, ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"} left`
        : `Start ${PHASE_LABEL[phase]} timer, ${Math.round(totalMs / 60_000)} minutes`;

  return (
    <div className={styles.timer} data-status={status} data-phase={phase}>
      <button type="button" className={styles.timerButton} onClick={onToggle} aria-label={label}>
        <svg className={styles.timerRing} viewBox="0 0 100 100" aria-hidden="true">
          {Array.from({ length: TICKS }, (_, i) => {
            const angle = (i / TICKS) * 360;
            const on = i >= head;
            const isHead = status !== "idle" && i === head && lit > 0;
            return (
              <line
                key={i}
                x1="50"
                y1={i % 5 === 0 ? 3 : 4.5}
                x2="50"
                y2="10"
                transform={`rotate(${angle} 50 50)`}
                className={isHead ? styles.tickHead : on ? styles.tickOn : styles.tickOff}
              />
            );
          })}
        </svg>
        <span className={styles.timerCenter} aria-hidden="true">
          <span className={styles.timerPhase}>{PHASE_LABEL[phase]}</span>
          <span className={styles.timerTime}>
            {mm}
            <span className={styles.timerColon}>:</span>
            {ss}
          </span>
          <span className={styles.timerSub}>
            {status === "idle" ? "tap to start" : status === "paused" ? "paused" : phase === "focus" ? `${session} / ${sessionsBeforeLong}` : "rest"}
          </span>
        </span>
      </button>
      {status !== "idle" ? (
        <button type="button" className={styles.timerReset} onClick={onReset} aria-label={`Reset ${PHASE_LABEL[phase]} timer`}>
          <Icon name="refresh" size={14} />
        </button>
      ) : null}
    </div>
  );
}
