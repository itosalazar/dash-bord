/** Minimal line icons on a 24px grid. Decorative unless given a label. */

const PATHS = {
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  settings: "M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6",
  close: "M6 6l12 12M18 6L6 18",
  external: "M9 6h9v9M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M6 13l6 6 6-6",
  trash: "M5 7h14M10 4h4M8 7l1 13h6l1-13",
  edit: "M5 19h4L19 9l-4-4L5 15v4z",
  check: "M5 12.5l4.5 4.5L19 7",
  location: "M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  rotate: "M7 4h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM10 17h4",
  share: "M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6",
  addSquare: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM12 8v8M8 12h8",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, label, className }: { name: IconName; size?: number; label?: string; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
