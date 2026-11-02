"use client";

import dynamic from "next/dynamic";
import { DotText } from "@/components/ui/DotMatrix";

/**
 * The dashboard is entirely device-local (clock, wake lock, cached snapshot),
 * so it renders on the client only. The server sends a quiet shell.
 */
const Dashboard = dynamic(() => import("./Dashboard"), {
  ssr: false,
  loading: () => (
    <div
      style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", color: "var(--bg-muted)", fontSize: 28 }}
      aria-busy="true"
      aria-label="Loading dash-bord"
    >
      <DotText text="--:--" />
    </div>
  ),
});

export function DashboardLoader() {
  return <Dashboard />;
}
