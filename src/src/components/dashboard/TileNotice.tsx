import type { Slot } from "@/hooks/useResource";
import { agoLabel } from "@/lib/time";
import styles from "./dashboard.module.css";

/**
 * Bottom-of-tile status strip, shown only when something is off: the
 * provider failed while we still have cached data, or the data is stale.
 */
export function TileNotice<T>({
  slot,
  nowMs,
  staleAfterMs,
  onRetry,
  name,
}: {
  slot: Slot<T>;
  nowMs: number;
  staleAfterMs: number;
  onRetry: () => void;
  name: string;
}) {
  if (!slot.data) return null;
  const age = slot.fetchedAt ? nowMs - Date.parse(slot.fetchedAt) : 0;
  const stale = age > staleAfterMs;
  if (!slot.error && !stale) return null;

  const text = slot.error?.code === "offline" ? `offline · ${agoLabel(slot.fetchedAt, nowMs)}` : `${name} paused · ${agoLabel(slot.fetchedAt, nowMs)}`;

  return (
    <div className={styles.notice} role="status">
      <span className={styles.noticeText}>{text}</span>
      <button type="button" className={styles.retry} onClick={onRetry} aria-label={`Retry ${name}`}>
        {slot.loading ? "…" : "retry"}
      </button>
    </div>
  );
}

/** Full-tile state for when there is nothing cached to show. */
export function TileEmpty({
  title,
  body,
  action,
  art,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  art?: React.ReactNode;
}) {
  return (
    <div className={styles.empty}>
      {art ? <div className={styles.emptyArt}>{art}</div> : <span />}
      <div>
        <p className={styles.emptyTitle}>{title}</p>
        {body ? <p className={styles.emptyBody}>{body}</p> : null}
        {action ? <div style={{ marginTop: 10 }}>{action}</div> : null}
      </div>
    </div>
  );
}
