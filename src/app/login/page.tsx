import type { Metadata } from "next";
import { authMode } from "@/lib/server/session";
import Link from "next/link";
import styles from "../pages.module.css";

export const metadata: Metadata = { title: "Sign in · dash-bord" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  invalid: "That passphrase didn't match.",
  locked: "Too many attempts. Wait 15 minutes and try again.",
  config: "Sign-in isn't configured on this server yet.",
};

function safeNext(value: string | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const mode = authMode();
  const next = safeNext(params.next);

  return (
    <main className={styles.page}>
      <section className={styles.brand} aria-label="dash-bord">
        <div>
          <p className={styles.mark}>
            dash<span>-</span>bord
          </p>
          <p className={styles.tagline}>a private desk display</p>
        </div>
        <p className={styles.tagline}>
          {params.signedOut ? "signed out" : "single-user · private"} ·{" "}
          <a href="https://itosalazar.com" target="_blank" rel="noopener noreferrer" className={styles.credit}>
            © Ito Salazar
          </a>
        </p>
      </section>

      <section className={styles.card}>
        {mode.kind === "misconfigured" ? (
          <>
            <h1 className={styles.title}>Almost there</h1>
            <p className={styles.body}>
              This deployment is locked because sign-in isn&apos;t configured. {mode.reason} Add <code>DASHBORD_PASSPHRASE</code> and{" "}
              <code>AUTH_SECRET</code> in your Vercel project settings and redeploy.
            </p>
          </>
        ) : mode.kind === "open" || mode.kind === "public" ? (
          <>
            <h1 className={styles.title}>No sign-in needed</h1>
            <p className={styles.body}>
              {mode.kind === "public"
                ? "This dash-bord is open. Your calendar and Pinterest links are saved only on your own device."
                : "Local development without a passphrase — the desk is open."}
            </p>
            <div className={styles.row}>
              <Link className={styles.button} href="/">
                open the desk
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className={styles.title}>Welcome back</h1>
            <form className={styles.form} method="post" action="/api/auth/login">
              <input type="hidden" name="next" value={next} />
              <label className="sr-only" htmlFor="passphrase">
                Passphrase
              </label>
              <input
                id="passphrase"
                className={styles.input}
                type="password"
                name="passphrase"
                autoComplete="current-password"
                placeholder="Passphrase"
                required
                autoFocus
              />
              <button type="submit" className={styles.button}>
                sign in
              </button>
            </form>
            {params.error ? (
              <p className={styles.error} role="alert">
                {ERRORS[params.error] ?? "Couldn't sign in."}
              </p>
            ) : null}
            <p className={styles.label}>
              Sign in from inside the Home Screen app — iOS keeps its cookies separate from Safari. <a href="/setup">Install guide</a>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
