"use client";

import { useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { TIMER_PHASES, type TimerPhase, type TimerStatus } from "@/hooks/usePomodoro";
import styles from "./dashboard.module.css";

const TICKS = 60;
const SWIPE_PX = 28;
const PHASE_LABEL: Record<TimerPhase, string> = { focus: "focus", short: "short break", long: "long break" };

/** Quick lengths per phase (minutes); the user's own setting is always included. */
const PRESETS: Record<TimerPhase, number[]> = {
  focus: [15, 25, 45, 50, 90],
  short: [3, 5, 10, 15],
  long: [15, 20, 30],
};

export function lengthPresets(phase: TimerPhase, current: number): number[] {
  return [...new Set([...PRESETS[phase], current])].sort((a, b) => a - b);
}

/** The preset before/after `current`, or null at either end. */
export function neighbourLength(phase: TimerPhase, current: number, direction: -1 | 1): number | null {
  const list = lengthPresets(phase, current);
  return list[list.indexOf(current) + direction] ?? null;
}

function minutesSeconds(ms: number): [string, string] {
  const total = Math.ceil(ms / 1000);
  return [String(Math.floor(total / 60)).padStart(2, "0"), String(total % 60).padStart(2, "0")];
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

/**
 * Each phase has its own ring:
 * focus — 60 ticks that empty clockwise (the ticking dial from the references);
 * short break — a smooth accent gradient arc;
 * long break — a ring of round dots.
 */
function Ring({ phase, fraction, running }: { phase: TimerPhase; fraction: number; running: boolean }) {
  const lit = Math.ceil(fraction * TICKS);
  const head = TICKS - lit;

  if (phase === "short") {
    return (
      <span
        className={styles.timerGradient}
        style={{ "--elapsed": `${(1 - fraction).toFixed(4)}turn` } as React.CSSProperties}
        aria-hidden="true"
      />
    );
  }

  return (
    <svg className={styles.timerRing} viewBox="0 0 100 100" aria-hidden="true">
      {Array.from({ length: TICKS }, (_, i) => {
        const angle = (i / TICKS) * 360;
        const on = i >= head;
        const cls = running && i === head && lit > 0 ? styles.tickHead : on ? styles.tickOn : styles.tickOff;
        if (phase === "long") {
          return <circle key={i} cx="50" cy="6.5" r={i % 5 === 0 ? 1.9 : 1.3} transform={`rotate(${angle} 50 50)`} className={cls} />;
        }
        return <line key={i} x1="50" y1={i % 5 === 0 ? 3 : 4.5} x2="50" y2="10" transform={`rotate(${angle} 50 50)`} className={cls} />;
      })}
    </svg>
  );
}

/**
 * The focus timer tile. Tap the dial to start / pause. While stopped:
 * swipe sideways (or ← → keys) to switch focus / short break / long break,
 * and use the ‹ › arrows to step through preset lengths.
 */
export function PomodoroTimer({
  phase,
  status,
  remainingMs,
  totalMs,
  session,
  sessionsBeforeLong,
  shorter,
  longer,
  onToggle,
  onReset,
  onChangeLength,
  onSelectPhase,
}: {
  phase: TimerPhase;
  status: TimerStatus;
  remainingMs: number;
  totalMs: number;
  session: number;
  sessionsBeforeLong: number;
  /** Next shorter / longer preset in minutes, or null at the ends. */
  shorter: number | null;
  longer: number | null;
  onToggle: () => void;
  onReset: () => void;
  onChangeLength: (minutes: number) => void;
  onSelectPhase: (phase: TimerPhase) => void;
}) {
  const fraction = totalMs > 0 ? remainingMs / totalMs : 0;
  const minutesLeft = Math.ceil(remainingMs / 60_000);
  const [mm, ss] = minutesSeconds(remainingMs);
  const idle = status === "idle";
  const index = TIMER_PHASES.indexOf(phase);
  const previousPhase = TIMER_PHASES[index - 1] ?? null;
  const nextPhase = TIMER_PHASES[index + 1] ?? null;

  // Swipe detection: a sideways drag switches phase instead of toggling.
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const step = (direction: -1 | 1) => {
    const target = direction === 1 ? nextPhase : previousPhase;
    if (idle && target) onSelectPhase(target);
  };

  const label =
    status === "running"
      ? `Pause ${PHASE_LABEL[phase]} timer, ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"} left`
      : status === "paused"
        ? `Resume ${PHASE_LABEL[phase]} timer, ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"} left`
        : `Start ${PHASE_LABEL[phase]} timer, ${Math.round(totalMs / 60_000)} minutes`;

  return (
    <div className={styles.timer} data-status={status} data-phase={phase}>
      <button
        type="button"
        className={styles.timerButton}
        aria-label={label}
        aria-keyshortcuts={idle ? "ArrowLeft ArrowRight" : undefined}
        onPointerDown={(e) => {
          swiped.current = false;
          swipeStart.current = idle ? { x: e.clientX, y: e.clientY } : null;
        }}
        onPointerUp={(e) => {
          const start = swipeStart.current;
          swipeStart.current = null;
          if (!start) return;
          const dx = e.clientX - start.x;
          if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(e.clientY - start.y)) return;
          swiped.current = true;
          // Swipe left = next phase (focus → short → long), like flipping a page.
          step(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          swipeStart.current = null;
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            step(e.key === "ArrowRight" ? 1 : -1);
          }
        }}
        onClick={() => {
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          onToggle();
        }}
      >
        <Ring phase={phase} fraction={fraction} running={!idle} />
        <span className={styles.timerCenter} aria-hidden="true">
          <span className={styles.timerPhase}>{phase === "focus" ? "focus" : phase === "short" ? "break" : "long break"}</span>
          <span className={styles.timerTime}>
            {mm}
            <span className={styles.timerColon}>:</span>
            {ss}
          </span>
          <span className={styles.timerSub}>
            {idle ? "tap to start" : status === "paused" ? "paused" : phase === "focus" ? `${session} / ${sessionsBeforeLong}` : "rest"}
          </span>
          {idle ? (
            <span className={styles.timerPager}>
              {TIMER_PHASES.map((p) => (
                <i key={p} data-active={p === phase} />
              ))}
            </span>
          ) : null}
        </span>
      </button>

      {idle ? (
        <>
          {/* Screen-reader / switch-control path for what a swipe does. */}
          {previousPhase ? (
            <button type="button" className="sr-only" onClick={() => onSelectPhase(previousPhase)}>
              Switch timer to {PHASE_LABEL[previousPhase]}
            </button>
          ) : null}
          {nextPhase ? (
            <button type="button" className="sr-only" onClick={() => onSelectPhase(nextPhase)}>
              Switch timer to {PHASE_LABEL[nextPhase]}
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.timerArrow} ${styles.timerArrowLeft}`}
            onClick={() => shorter !== null && onChangeLength(shorter)}
            disabled={shorter === null}
            aria-label={shorter !== null ? `Shorter ${PHASE_LABEL[phase]}: ${shorter} minutes` : `Shortest ${PHASE_LABEL[phase]} length`}
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            className={`${styles.timerArrow} ${styles.timerArrowRight}`}
            onClick={() => longer !== null && onChangeLength(longer)}
            disabled={longer === null}
            aria-label={longer !== null ? `Longer ${PHASE_LABEL[phase]}: ${longer} minutes` : `Longest ${PHASE_LABEL[phase]} length`}
          >
            <Chevron direction="right" />
          </button>
        </>
      ) : (
        <button type="button" className={styles.timerReset} onClick={onReset} aria-label={`Reset ${PHASE_LABEL[phase]} timer`}>
          <Icon name="refresh" size={14} />
        </button>
      )}
    </div>
  );
}
