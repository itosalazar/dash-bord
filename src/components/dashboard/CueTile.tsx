import type { Cue } from "@/lib/types";
import styles from "./dashboard.module.css";

function lengthClass(text: string): "short" | "medium" | "long" {
  if (text.length <= 34) return "short";
  if (text.length <= 70) return "medium";
  return "long";
}

export function CueTile({
  cue,
  index,
  total,
  showAttribution,
  onNext,
}: {
  cue: Cue;
  index: number;
  total: number;
  showAttribution: boolean;
  onNext: () => void;
}) {
  return (
    <section className={`${styles.tile} ${styles.accent}`} aria-labelledby="cue-label">
      <button type="button" className={styles.cueButton} onClick={onNext} aria-describedby="cue-hint">
        <span className={styles.labelRow}>
          <span id="cue-label" className={styles.label}>
            a gentle cue
          </span>
          <span className={styles.counter} aria-hidden="true">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </span>
        <span key={cue.id} className={styles.cueText} data-length={lengthClass(cue.text)} aria-live="polite">
          {cue.text}
        </span>
        {showAttribution && cue.attribution ? <span className={styles.attribution}>— {cue.attribution}</span> : null}
        <span id="cue-hint" className="sr-only">
          Tap for another cue
        </span>
      </button>
    </section>
  );
}
