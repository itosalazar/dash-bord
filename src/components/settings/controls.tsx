"use client";

import { useId, useState } from "react";
import styles from "./settings.module.css";

/** Native radio inputs styled as pills — free keyboard + screen-reader support. */
export function Segmented<T extends string>({
  legend,
  value,
  options,
  onChange,
  hint,
}: {
  legend: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  hint?: string;
}) {
  const name = useId();
  return (
    <fieldset className={styles.group}>
      <legend>{legend}</legend>
      <div className={styles.segmented}>
        {options.map((option) => (
          <label key={option.value} className={styles.segment}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </fieldset>
  );
}

export function Switch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <label className={styles.switchRow} htmlFor={id}>
      <span className={styles.switchText}>
        {label}
        {description ? <small>{description}</small> : null}
      </span>
      <input id={id} type="checkbox" role="switch" className={styles.switch} checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function Group({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <div className={styles.group} role="group" aria-labelledby={id}>
      <p id={id} className={styles.groupLabel}>
        {label}
      </p>
      {children}
    </div>
  );
}

export function StatusDot({ tone }: { tone: "ok" | "warn" | "idle" }) {
  return <span className={styles.dot} data-tone={tone} aria-hidden="true" />;
}

/** Number field with −/+ buttons; commits on blur or Enter, clamped to [min, max]. */
export function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)));
  const commit = () => {
    if (draft === null) return;
    const n = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(n)) onChange(clamp(n));
    setDraft(null);
  };

  return (
    <div className={styles.stepperRow}>
      <label htmlFor={id} className={styles.switchText}>
        {label}
      </label>
      <div className={styles.stepper}>
        <button type="button" className={styles.stepperButton} onClick={() => onChange(clamp(value - step))} disabled={value <= min} aria-label={`Decrease ${label}`}>
          −
        </button>
        <input
          id={id}
          className={styles.stepperInput}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={draft ?? String(value)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
        />
        {unit ? <span className={styles.stepperUnit}>{unit}</span> : null}
        <button type="button" className={styles.stepperButton} onClick={() => onChange(clamp(value + step))} disabled={value >= max} aria-label={`Increase ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}
