import { useId } from "react";
import type { WeatherCondition } from "@/lib/types";
import styles from "./weatherIcons.module.css";

/**
 * dash-bord's weather icons: accent-filled shapes with ink details and tiny
 * faces (after the reference set the owner picked). 64×64 grid.
 */

export type WeatherIconName =
  | "clear"
  | "night"
  | "partly"
  | "partlyNight"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "storm"
  | "umbrella";

export function iconForCondition(condition: WeatherCondition, isDay: boolean): WeatherIconName {
  if (condition === "clear") return isDay ? "clear" : "night";
  if (condition === "partly") return isDay ? "partly" : "partlyNight";
  return condition;
}

const CLOUD =
  "M20 46C13.5 46 10 41.8 10 37.2C10 32.4 13.8 28.6 18.6 28.5C19.6 21.9 25.3 17 32 17C38.3 17 43.5 21.2 45 27C50.2 27.4 54 31.6 54 36.6C54 41.8 49.9 46 44.8 46Z";

type Face = "happy" | "sad" | "calm" | "neutral" | "grumpy";

function Eyes({ y = 34.5 }: { y?: number }) {
  return (
    <g className={styles.blink}>
      <circle className={styles.ink} cx="27" cy={y} r="1.8" />
      <circle className={styles.ink} cx="37" cy={y} r="1.8" />
    </g>
  );
}

function FaceMarks({ face }: { face: Face }) {
  const thin = `${styles.line} ${styles.thin}`;
  switch (face) {
    case "happy":
      return (
        <>
          <Eyes />
          <path className={thin} d="M29.3 38.6q2.7 2.6 5.4 0" />
        </>
      );
    case "sad":
      return (
        <>
          <Eyes y={35} />
          <path className={thin} d="M29.3 41.2q2.7-2.4 5.4 0" />
        </>
      );
    case "calm":
      return <path className={thin} d="M25 34.6q2 1.7 4 0M35 34.6q2 1.7 4 0M30.4 39q1.6 1.3 3.2 0" />;
    case "neutral":
      return (
        <>
          <Eyes />
          <path className={thin} d="M30 39.6h4" />
        </>
      );
    case "grumpy":
      return (
        <>
          <path className={thin} d="M24.6 30.8l4.2 1.6M39.4 30.8l-4.2 1.6" />
          <Eyes y={35} />
          <path className={thin} d="M29 40.6l1.7-1.2 1.6 1.2 1.6-1.2 1.6 1.2" />
        </>
      );
  }
}

function Cloud({ face, dy = 0, dx = 0 }: { face: Face; dy?: number; dx?: number }) {
  return (
    <g transform={`translate(${dx} ${dy})`}>
      <g className={styles.bob}>
        <path className={styles.fill} d={CLOUD} />
        <FaceMarks face={face} />
      </g>
    </g>
  );
}

function Drops({ drops }: { drops: [number, number, number][] }) {
  return (
    <>
      {drops.map(([x, y, delay]) => (
        <path key={`${x}-${y}`} className={`${styles.line} ${styles.fall}`} style={{ animationDelay: `${delay}s` }} d={`M${x} ${y}l-1.6 4.4`} />
      ))}
    </>
  );
}

function Flakes({ flakes }: { flakes: [number, number, number][] }) {
  return (
    <>
      {flakes.map(([x, y, delay]) => (
        <g key={`${x}-${y}`} className={styles.flake} style={{ animationDelay: `${delay}s` }}>
          <path
            className={`${styles.line} ${styles.thin}`}
            d={`M${x} ${y - 2.6}v5.2M${x - 2.3} ${y - 1.3}l4.6 2.6M${x - 2.3} ${y + 1.3}l4.6-2.6`}
          />
        </g>
      ))}
    </>
  );
}

function rays(cx: number, cy: number, r1: number, r2: number, angles: number[]): string {
  return angles
    .map((a) => {
      const t = (a * Math.PI) / 180;
      const p = (r: number) => `${(cx + r * Math.cos(t)).toFixed(2)} ${(cy + r * Math.sin(t)).toFixed(2)}`;
      return `M${p(r1)}L${p(r2)}`;
    })
    .join("");
}

function Sparkle({ x, y, size = 3, delay = 0 }: { x: number; y: number; size?: number; delay?: number }) {
  return (
    <g className={styles.twinkle} style={{ animationDelay: `${delay}s` }}>
      <path className={`${styles.line} ${styles.thin}`} d={`M${x} ${y - size}v${size * 2}M${x - size} ${y}h${size * 2}`} />
    </g>
  );
}

function Glyph({ name, maskId }: { name: WeatherIconName; maskId: string }) {
  const line = styles.line;
  switch (name) {
    case "clear":
      return (
        <>
          <g className={styles.spin} style={{ transformOrigin: "32px 32px" }}>
            <path className={line} d={rays(32, 32, 17.5, 22, [0, 45, 90, 135, 180, 225, 270, 315])} />
          </g>
          <g className={styles.bob}>
            <circle className={styles.fill} cx="32" cy="32" r="13" />
            <path className={`${line} ${styles.thin}`} d="M26 31.4q1.9-1.9 3.8 0M34.2 31.4q1.9-1.9 3.8 0M29.4 35.6q2.6 2.4 5.2 0" />
          </g>
        </>
      );
    case "night":
      return (
        <>
          <defs>
            <mask id={maskId}>
              <rect width="64" height="64" fill="#fff" />
              <circle cx="41" cy="23" r="13" fill="#000" />
            </mask>
          </defs>
          <g className={styles.bob}>
            <circle className={styles.fill} cx="30" cy="34" r="17" mask={`url(#${maskId})`} />
            <path className={`${line} ${styles.thin}`} d="M18.6 35.4q2.1 1.7 4.2 0M21.6 41.4q2 1.5 4 0" />
          </g>
          <Sparkle x={44} y={22} />
          <Sparkle x={53} y={32.2} size={2.2} delay={1.3} />
          <circle className={`${styles.ink} ${styles.twinkle}`} style={{ animationDelay: "0.7s" }} cx="51" cy="12" r="1.3" />
        </>
      );
    case "partly":
      return (
        <>
          <g className={styles.spin} style={{ transformOrigin: "42px 21px" }}>
            <path className={line} d={rays(42, 21, 12, 15.5, [-135, -90, -45, 0, 45])} />
          </g>
          <circle className={styles.outline} cx="42" cy="21" r="8.5" />
          <Cloud face="happy" dy={5} />
        </>
      );
    case "partlyNight":
      return (
        <>
          <g className={styles.bobSlow}>
            <path className={styles.outline} d="M21.7 12A10 10 0 1 0 31.7 24.5A8 8 0 0 1 21.7 12Z" />
          </g>
          <Sparkle x={50} y={12.5} size={2.5} delay={0.6} />
          <Cloud face="calm" dx={5} dy={6} />
        </>
      );
    case "cloudy":
      return (
        <>
          <g className={styles.drift}>
            <path className={styles.outline} vectorEffect="non-scaling-stroke" transform="translate(2 4) scale(.62)" d={CLOUD} />
          </g>
          <Cloud face="neutral" dx={5} dy={6} />
        </>
      );
    case "fog":
      return (
        <>
          <Cloud face="calm" dy={-8} />
          <path className={`${line} ${styles.slide}`} d="M12 46h17M35 46h17" />
          <path className={`${line} ${styles.slide}`} style={{ animationDelay: "-1.2s" }} d="M17 52.5h22M45 52.5h5" />
          <path className={`${line} ${styles.slide}`} style={{ animationDelay: "-2.4s" }} d="M11 59h13M30 59h21" />
        </>
      );
    case "drizzle":
      return (
        <>
          <Cloud face="neutral" dy={-8} />
          <Drops drops={[[25, 44, 0], [35, 46, 0.6], [45, 43, 0.3]]} />
        </>
      );
    case "rain":
      return (
        <>
          <Cloud face="sad" dy={-8} />
          <Drops drops={[[20, 43, 0], [28, 46, 0.45], [36, 43, 0.9], [44, 46, 0.25], [24, 52, 0.7], [40, 52, 1.1]]} />
        </>
      );
    case "snow":
      return (
        <>
          <Cloud face="happy" dy={-8} />
          <Flakes flakes={[[22, 47, 0], [33, 52, 1.1], [44, 47, 0.5], [27, 57, 2], [40, 58, 1.6]]} />
        </>
      );
    case "storm":
      return (
        <>
          <Cloud face="grumpy" dy={-8} />
          <path className={`${line} ${styles.flash}`} d="M33.5 41.5l-5 8.5h7l-4.5 8" />
          <Drops drops={[[20, 45, 0.2], [45, 45, 0.8]]} />
        </>
      );
    case "umbrella":
      return (
        <>
          <g className={styles.swing}>
            <path className={styles.fill} d="M12 34a20 20 0 0 1 40 0q-5-4-10 0q-5-4-10 0q-5-4-10 0q-5-4-10 0z" />
            <path className={line} d="M32 14v-3M32 34v14a4 4 0 0 1-8 0" />
            <g className={styles.blink}>
              <circle className={styles.ink} cx="27.5" cy="26" r="1.6" />
              <circle className={styles.ink} cx="36.5" cy="26" r="1.6" />
            </g>
            <path className={`${line} ${styles.thin}`} d="M30 29.4q2 1.8 4 0" />
          </g>
          <Drops drops={[[13, 44, 0.3], [50, 42, 0.9], [46, 52, 0.1]]} />
        </>
      );
  }
}

export function WeatherIcon({ name, className, label }: { name: WeatherIconName; className?: string; label?: string }) {
  const maskId = `moon-${useId().replace(/:/g, "")}`;
  return (
    <svg
      className={`${styles.icon} ${className ?? ""}`}
      viewBox="0 0 64 64"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Glyph name={name} maskId={maskId} />
    </svg>
  );
}

/* ------------------------------------------------------------- moon phase */

const SYNODIC_DAYS = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // 2000-01-06 18:14 UTC

const PHASE_NAMES = [
  "new moon",
  "waxing crescent",
  "first quarter",
  "waxing gibbous",
  "full moon",
  "waning gibbous",
  "last quarter",
  "waning crescent",
] as const;

/** Moon phase from the date alone (accurate to well under a day — plenty for a desk). */
export function moonPhase(nowMs: number): { fraction: number; illumination: number; name: string } {
  const days = (nowMs - KNOWN_NEW_MOON) / 86_400_000;
  const fraction = (((days / SYNODIC_DAYS) % 1) + 1) % 1; // 0 = new, 0.5 = full
  const illumination = (1 - Math.cos(2 * Math.PI * fraction)) / 2;
  const index = Math.floor(fraction * 8 + 0.5) % 8;
  return { fraction, illumination, name: PHASE_NAMES[index]! };
}

/**
 * The lit part of the disc, drawn as an outer half-circle plus an elliptical
 * terminator. Lit on the right while waxing (mirrored south of the equator).
 */
export function MoonPhase({ nowMs, southern = false, className }: { nowMs: number; southern?: boolean; className?: string }) {
  const { fraction, illumination, name } = moonPhase(nowMs);
  const r = 10;
  const c = 12;
  const rx = Math.abs(Math.cos(2 * Math.PI * fraction)) * r;
  const waxing = fraction < 0.5;
  const crescent = fraction < 0.25 || fraction > 0.75;
  const outerSweep = waxing ? 1 : 0;
  const innerSweep = waxing === crescent ? 0 : 1;
  const lit = `M${c} ${c - r}A${r} ${r} 0 0 ${outerSweep} ${c} ${c + r}A${rx.toFixed(3)} ${r} 0 0 ${innerSweep} ${c} ${c - r}Z`;
  const percent = Math.round(illumination * 100);

  return (
    <svg className={`${styles.moon} ${className ?? ""}`} viewBox="0 0 24 24" role="img" aria-label={`Moon: ${name}, ${percent}% lit`}>
      <title>{`${name} · ${percent}%`}</title>
      <circle className={styles.moonDisc} cx={c} cy={c} r={r} />
      {illumination > 0.02 ? (
        <path className={styles.moonLit} d={lit} transform={southern ? `matrix(-1 0 0 1 ${c * 2} 0)` : undefined} />
      ) : null}
    </svg>
  );
}
