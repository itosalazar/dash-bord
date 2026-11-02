"use client";

import { useId } from "react";
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
