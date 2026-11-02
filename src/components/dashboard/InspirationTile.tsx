import { DotText } from "@/components/ui/DotMatrix";
import { Icon } from "@/components/ui/Icon";
import { REFRESH } from "@/hooks/useDashboardData";
import type { Slot } from "@/hooks/useResource";
import type { InspirationBoard, InspirationPin } from "@/lib/types";
import { TileEmpty, TileNotice } from "./TileNotice";
import styles from "./dashboard.module.css";

export function InspirationTile({
  slot,
  pin,
  index,
  nowMs,
  onNext,
  onRetry,
  onOpenSettings,
}: {
  slot: Slot<InspirationBoard>;
  pin: InspirationPin | null;
  index: number;
  nowMs: number;
  onNext: () => void;
  onRetry: () => void;
  onOpenSettings: () => void;
}) {
  const board = slot.data;
  const total = board?.pins.length ?? 0;

  if (!board || !pin) {
    const pending = slot.error?.code === "not_connected" || slot.error?.code === "not_configured" || slot.error?.code === "unauthorized";
    return (
      <section className={`${styles.tile} ${styles.dark}`} aria-labelledby="inspiration-label">
        <h2 id="inspiration-label" className="sr-only">
          Inspiration
        </h2>
        {slot.loading && !slot.error ? (
          <TileEmpty art={<DotText text="--" className={styles.skeleton} />} title="" body="finding something lovely…" />
        ) : (
          <TileEmpty
            art={<DotText text="00" />}
            title={pending ? "Pinterest connection pending" : board ? "This board has no images yet" : "Inspiration unavailable"}
            body={
              pending
                ? "Connect Pinterest and add a board URL in Settings. One Pin from that board will rest here, rotating on your schedule."
                : (slot.error?.message ?? "Add a few image Pins to the board, then refresh.")
            }
            action={
              <button type="button" className={styles.retry} onClick={pending ? onOpenSettings : onRetry}>
                {pending ? "open settings" : "retry"}
              </button>
            }
          />
        )}
      </section>
    );
  }

  const image = (
    // Remote Pinterest CDN or local demo art; cached by the service worker.
    <img
      key={pin.id}
      className={styles.pinImage}
      src={pin.imageUrl}
      alt={pin.alt}
      width={pin.width}
      height={pin.height}
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );

  return (
    <section
      className={`${styles.tile} ${styles.inspiration}`}
      style={pin.dominantColor ? { background: pin.dominantColor } : undefined}
      aria-labelledby="inspiration-label"
    >
      {pin.link ? (
        <a className={styles.pinLink} href={pin.link} target="_blank" rel="noopener noreferrer" aria-label={`Open Pin on Pinterest: ${pin.title ?? pin.alt}`}>
          {image}
        </a>
      ) : (
        image
      )}

      <div className={styles.overlay}>
        <div className={styles.overlayRow}>
          <div className={styles.chips}>
            <h2 id="inspiration-label" className={styles.chip} style={{ margin: 0, fontWeight: 400 }}>
              inspiration
            </h2>
            <span className={`${styles.chip} ${styles.chipLight}`}>{board.boardName}</span>
          </div>
          {total > 1 ? (
            <button type="button" className={styles.roundButton} onClick={onNext} aria-label="Show another image from the board">
              <Icon name="refresh" size={18} />
            </button>
          ) : null}
        </div>
        <div className={styles.overlayRow}>
          <span className={styles.chip} aria-label={`Image ${index + 1} of ${total}`}>
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          {pin.link ? (
            <span className={styles.chip} aria-hidden="true">
              pin <Icon name="external" size={12} />
            </span>
          ) : null}
        </div>
      </div>

      <TileNotice slot={slot} nowMs={nowMs} staleAfterMs={REFRESH.inspiration * 4} onRetry={onRetry} name="inspiration" />
    </section>
  );
}
