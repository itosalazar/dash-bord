import { DotText } from "@/components/ui/DotMatrix";
import { Group } from "./controls";
import styles from "./settings.module.css";

// Keep in sync with package.json "version".
const VERSION = "0.1.0";

const PRINCIPLES = [
  { title: "Glanceable", body: "Readable from across the desk: big time, one line of context, no scrolling." },
  { title: "One of each", body: "One image to rest your eyes on, one cue to nudge you. Never a feed." },
  { title: "Private", body: "Behind your own passphrase. Accounts are connected server-side; secrets never reach the device." },
  { title: "Calm offline", body: "The last good snapshot stays on screen when the Wi-Fi wobbles, clearly labelled." },
];

export function AboutSection({ nowMs }: { nowMs: number }) {
  const year = new Date(nowMs || Date.UTC(2026, 0, 1)).getFullYear();

  return (
    <>
      <div className={styles.aboutHero}>
        <p className={styles.aboutMark}>
          dash<span>-</span>bord
        </p>
        <DotText text={String(year)} className={styles.aboutVersion} />
      </div>

      <Group label="the idea">
        <p className={styles.prose}>
          dash-bord turns a spare iPhone or iPad on a charging stand into a quiet desk companion. It isn&apos;t a notification
          centre or a StandBy replacement — it&apos;s a single, deliberate screen you leave open while you work: the time, the
          sky outside, what&apos;s coming up next, one image from a board you love, and one gentle cue to help you keep good
          habits.
        </p>
      </Group>

      <ul className={styles.principles}>
        {PRINCIPLES.map((p) => (
          <li key={p.title} className={styles.principle}>
            <strong>{p.title}</strong>
            <span>{p.body}</span>
          </li>
        ))}
      </ul>

      <Group label="how to use it">
        <ul className={styles.howTo}>
          <li>Tap <strong>desk mode</strong> to keep the screen awake while dash-bord is open.</li>
          <li>Long-press the clock (or the settings button) to open settings.</li>
          <li>Tap the cue card for another cue; tap the image to open the original Pin.</li>
          <li>Rest an iPhone sideways; an iPad works in either orientation.</li>
        </ul>
      </Group>

      <Group label="credits">
        <p className={styles.hint}>
          Typefaces: Geist and Geist Mono by Vercel, Instrument Serif by Instrument — all under the SIL Open Font License.
          Weather from Open-Meteo or OpenWeatherMap when enabled. Google Calendar and Pinterest are trademarks of their
          respective owners; dash-bord is not affiliated with them. Demo illustrations and built-in cues are original.
        </p>
      </Group>

      <footer className={styles.copyright}>
        <span>
          © {year} Ito Salazar. All rights reserved.
        </span>
        <a href="https://itosalazar.com" target="_blank" rel="noopener noreferrer">
          itosalazar.com ↗
        </a>
        <span className={styles.versionLine}>version {VERSION}</span>
      </footer>
    </>
  );
}
