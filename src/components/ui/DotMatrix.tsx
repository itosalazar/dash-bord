import type { WeatherCondition } from "@/lib/types";

/**
 * Dot-matrix rendering, after the LED/dot displays in the references.
 * Unlit dots are drawn faintly so the grid reads as hardware.
 */

const GLYPHS: Record<string, string[]> = {
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["#####", "...#.", "..#..", "...#.", "....#", "#...#", ".###."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  ":": [".....", "..#..", ".....", ".....", ".....", "..#..", "....."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
};

interface DotTextProps {
  text: string;
  /** Diameter-to-pitch ratio of each dot. */
  dot?: number;
  ghost?: boolean;
  className?: string;
  title?: string;
}

/** Renders digits (and `:` `-`) as a 5×7 dot-matrix SVG that scales with font-size. */
export function DotText({ text, dot = 0.78, ghost = true, className, title }: DotTextProps) {
  const chars = [...text].map((c) => GLYPHS[c] ?? GLYPHS[" "]!);
  const cols = chars.length * 6 - 1;
  const r = dot / 2;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${cols} 7`}
      style={{ height: "1em", width: `${cols / 7}em` }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {chars.map((rows, ci) =>
        rows.map((row, y) =>
          [...row].map((cell, x) => {
            const on = cell === "#";
            if (!on && !ghost) return null;
            return (
              <circle
                key={`${ci}-${x}-${y}`}
                cx={ci * 6 + x + 0.5}
                cy={y + 0.5}
                r={r}
                fill="currentColor"
                opacity={on ? 1 : 0.12}
              />
            );
          }),
        ),
      )}
    </svg>
  );
}

/* --------------------------------------------------------------- icons */

// 11×11 bitmaps. "x" = ink, "a" = accent, "." = unlit.
const ICONS: Record<string, string[]> = {
  sun: [
    ".....a.....",
    "..a.....a..",
    "...........",
    "....aaa....",
    "...aaaaa...",
    "a..aaaaa..a",
    "...aaaaa...",
    "....aaa....",
    "...........",
    "..a.....a..",
    ".....a.....",
  ],
  moon: [
    "...xxxx....",
    "..xxx......",
    ".xxx.......",
    ".xx........",
    "xxx........",
    "xxx........",
    "xxx........",
    ".xxx......x",
    ".xxxx...xx.",
    "..xxxxxxx..",
    "....xxx....",
  ],
  partly: [
    ".a.........",
    "...aaa.....",
    "a.aaaaa....",
    "..aaaxxx...",
    "..aaxxxxx..",
    "...xxxxxxx.",
    ".xxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    ".xxxxxxxxx.",
    "...........",
  ],
  partlyNight: [
    "xx.........",
    ".xx........",
    ".xx........",
    "xx...xxx...",
    "....xxxxx..",
    "...xxxxxxx.",
    ".xxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    ".xxxxxxxxx.",
    "...........",
  ],
  cloudy: [
    "...........",
    "...........",
    "....xxx....",
    "..xxxxxxx..",
    ".xxxxxxxxx.",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    ".xxxxxxxxx.",
    "...........",
    "...........",
    "...........",
  ],
  fog: [
    "...........",
    "xxxxxxxx...",
    "...........",
    "..xxxxxxxxx",
    "...........",
    "xxxxxxxxx..",
    "...........",
    "..xxxxxxx..",
    "...........",
    "xxxxx......",
    "...........",
  ],
  drizzle: [
    "...xxx.....",
    ".xxxxxxx...",
    "xxxxxxxxxx.",
    "xxxxxxxxxxx",
    ".xxxxxxxxx.",
    "...........",
    "..a....a...",
    "...........",
    "....a....a.",
    "...........",
    "...........",
  ],
  rain: [
    "...xxx.....",
    ".xxxxxxx...",
    "xxxxxxxxxx.",
    "xxxxxxxxxxx",
    ".xxxxxxxxx.",
    "...........",
    ".a..a..a...",
    "...........",
    "a..a..a....",
    "...........",
    ".a..a..a...",
  ],
  snow: [
    "...xxx.....",
    ".xxxxxxx...",
    "xxxxxxxxxx.",
    "xxxxxxxxxxx",
    ".xxxxxxxxx.",
    "...........",
    ".a...a...a.",
    "...a...a...",
    ".a...a...a.",
    "...........",
    "...........",
  ],
  storm: [
    "...xxx.....",
    ".xxxxxxx...",
    "xxxxxxxxxx.",
    "xxxxxxxxxxx",
    ".xxxxxxxxx.",
    ".....aa....",
    "....aa.....",
    "...aaaa....",
    ".....aa....",
    "....aa.....",
    "...a.......",
  ],
};

export function weatherIconName(condition: WeatherCondition, isDay: boolean): string {
  if (condition === "clear") return isDay ? "sun" : "moon";
  if (condition === "partly") return isDay ? "partly" : "partlyNight";
  return condition;
}

export function DotIcon({ name, className, label }: { name: string; className?: string; label?: string }) {
  const rows = ICONS[name] ?? ICONS.cloudy!;
  return (
    <svg
      className={className}
      viewBox="0 0 11 11"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {rows.map((row, y) =>
        [...row].map((cell, x) => (
          <circle
            key={`${x}-${y}`}
            cx={x + 0.5}
            cy={y + 0.5}
            r={0.4}
            fill={cell === "a" ? "var(--accent)" : "currentColor"}
            opacity={cell === "." ? 0.08 : 1}
          />
        )),
      )}
    </svg>
  );
}
