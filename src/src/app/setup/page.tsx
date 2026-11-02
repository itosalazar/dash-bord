import type { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";
import Link from "next/link";
import styles from "../pages.module.css";

export const metadata: Metadata = { title: "Install · dash-bord" };

export default function SetupPage() {
  return (
    <main className={styles.page}>
      <section className={styles.brand} aria-label="dash-bord">
        <div>
          <p className={styles.mark}>
            dash<span>-</span>bord
          </p>
          <p className={styles.tagline}>install on your iPhone or iPad</p>
        </div>
        <p className={styles.tagline}>
          works best on a charging stand ·{" "}
          <a href="https://itosalazar.com" target="_blank" rel="noopener noreferrer" className={styles.credit}>
            © Ito Salazar
          </a>
        </p>
      </section>

      <section className={styles.card}>
        <h1 className={styles.title}>Add to Home Screen</h1>
        <ol className={styles.steps}>
          <li className={styles.step}>
            <span>
              Open this page in <strong>Safari</strong> on the iPhone or iPad.
            </span>
          </li>
          <li className={styles.step}>
            <span>
              Tap <strong>Share</strong> <Icon name="share" size={18} className={styles.inlineIcon} /> — bottom toolbar on iPhone, top-right
              on iPad.
            </span>
          </li>
          <li className={styles.step}>
            <span>
              Choose <strong>Add to Home Screen</strong> <Icon name="addSquare" size={18} className={styles.inlineIcon} />, keep the name
              “dash-bord”, tap <strong>Add</strong>.
            </span>
          </li>
          <li className={styles.step}>
            <span>Open dash-bord from the Home Screen and sign in there — the installed app keeps its own session.</span>
          </li>
          <li className={styles.step}>
            <span>
              Rest the iPhone sideways (an iPad works either way) and tap <strong>desk mode</strong> to keep the screen awake.
            </span>
          </li>
        </ol>
        <p className={styles.label}>
          If the screen still sleeps (Low Power Mode, older iOS): Settings → Display &amp; Brightness → Auto-Lock → Never while docked.
        </p>
        <div className={styles.row}>
          <Link className={styles.button} href="/">
            open the desk
          </Link>
        </div>
      </section>
    </main>
  );
}
