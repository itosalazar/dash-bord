import { DotText } from "@/components/ui/DotMatrix";
import { iconForCondition, MoonPhase, moonPhase, WeatherIcon } from "@/components/ui/WeatherIcon";
import type { Slot } from "@/hooks/useResource";
import { REFRESH } from "@/hooks/useDashboardData";
import type { WeatherSnapshot } from "@/lib/types";
import { TileEmpty, TileNotice } from "./TileNotice";
import styles from "./dashboard.module.css";

export function WeatherTile({
  slot,
  nowMs,
  southern,
  wide,
  onRetry,
  onOpenSettings,
}: {
  slot: Slot<WeatherSnapshot>;
  nowMs: number;
  /** Mirror the moon for the southern hemisphere. */
  southern: boolean;
  /** Calendar is off: the tile spans both slots and shows more detail. */
  wide: boolean;
  onRetry: () => void;
  onOpenSettings: () => void;
}) {
  const w = slot.data;
  const moon = moonPhase(nowMs);

  return (
    <section className={`${styles.tile} ${styles.light}`} data-wide={wide} aria-labelledby="weather-label">
      {w ? (
        <div className={`${styles.padded} ${styles.weather}`}>
          <div className={styles.weatherTop}>
            <h2 id="weather-label" className={styles.label}>
              {wide ? `outside · ${w.locationName.toLowerCase()}` : "outside"}
            </h2>
            <WeatherIcon name={iconForCondition(w.condition, w.isDay)} className={styles.weatherIcon} />
          </div>
          <p className={styles.temp} aria-label={`${w.temperature} degrees ${w.unit === "f" ? "Fahrenheit" : "Celsius"}, ${w.summary}`}>
            <span className={styles.tempValue} aria-hidden="true">
              {w.temperature}
              <span className={styles.deg}>°</span>
            </span>
          </p>
          <div className={styles.weatherFoot}>
            <div className={styles.summaryRow}>
              <p className={styles.summary}>{w.summary.toLowerCase()}</p>
              {wide && w.precipitationChance !== undefined ? (
                <p className={styles.detail} aria-label={`${w.precipitationChance}% chance of rain`}>
                  <WeatherIcon name="umbrella" className={styles.detailIcon} />
                  {w.precipitationChance}%
                </p>
              ) : null}
              <p className={styles.detail}>
                {wide ? <span className={styles.moonName}>{moon.name}</span> : null}
                <MoonPhase nowMs={nowMs} southern={southern} className={styles.moonIcon} />
              </p>
            </div>
            <RangeBar low={w.low} high={w.high} current={w.temperature} />
          </div>
        </div>
      ) : slot.loading ? (
        <TileEmpty art={<DotText text="--" className={styles.skeleton} />} title="" body="checking the sky…" />
      ) : (
        <>
          <h2 id="weather-label" className="sr-only">
            Weather
          </h2>
          <TileEmpty
            art={<WeatherIcon name="cloudy" className={styles.weatherIcon} />}
            title={slot.error?.code === "not_configured" ? "Add a location" : "Weather unavailable"}
            body={slot.error?.message}
            action={
              <button
                type="button"
                className={styles.retry}
                onClick={slot.error?.code === "not_configured" ? onOpenSettings : onRetry}
              >
                {slot.error?.code === "not_configured" ? "settings" : "retry"}
              </button>
            }
          />
        </>
      )}
      <TileNotice slot={slot} nowMs={nowMs} staleAfterMs={REFRESH.weather * 2} onRetry={onRetry} name="weather" />
    </section>
  );
}

function RangeBar({ low, high, current }: { low: number; high: number; current: number }) {
  const span = Math.max(1, high - low);
  const pct = Math.min(100, Math.max(0, ((current - low) / span) * 100));
  return (
    <div className={styles.range} aria-label={`Low ${low}, high ${high}`}>
      <span>l {low}</span>
      <span className={styles.rangeBar} aria-hidden="true">
        <span className={styles.rangeMark} style={{ left: `${pct}%` }} />
      </span>
      <span>h {high}</span>
    </div>
  );
}
