import type { Metadata } from "next";
import { DotText } from "@/components/ui/DotMatrix";
import styles from "../pages.module.css";

export const metadata: Metadata = { title: "Offline · dash-bord" };

/** Served by the service worker when nothing better is cached. */
export default function OfflinePage() {
  return (
    <main className={styles.page}>
      <section className={styles.brand} aria-label="dash-bord">
        <p className={styles.mark}>
          dash<span>-</span>bord
        </p>
        <div style={{ fontSize: 48, color: "var(--accent)" }}>
          <DotText text="--:--" />
        </div>
      </section>
      <section className={styles.card}>
        <h1 className={styles.title}>Waiting for Wi-Fi</h1>
        <p className={styles.body}>
          dash-bord couldn&apos;t load and has no saved copy yet. Once it opens online one time, the desk keeps working from its last
          snapshot when the connection drops.
        </p>
        <div className={styles.row}>
          {/* A full reload on purpose: retry the network, not a client-side transition. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className={styles.button} href="/">
            try again
          </a>
        </div>
      </section>
    </main>
  );
}
