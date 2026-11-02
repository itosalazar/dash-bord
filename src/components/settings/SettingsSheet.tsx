"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import type { DashboardData } from "@/hooks/useDashboardData";
import type { SettingsSync } from "@/hooks/useSettings";
import type { DeskModeState } from "@/hooks/useWakeLock";
import type { Settings } from "@/lib/settings";
import type { AppStatus } from "@/lib/types";
import { AboutSection } from "./AboutSection";
import { CuesSection } from "./CuesSection";
import { CalendarSection, DataSection, DeskSection, DisplaySection, InspirationSection, WeatherSection } from "./sections";
import styles from "./settings.module.css";

export type SettingsSection = "display" | "desk" | "weather" | "calendar" | "inspiration" | "cues" | "data" | "about";

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: "display", label: "Display" },
  { id: "desk", label: "Desk mode" },
  { id: "weather", label: "Weather" },
  { id: "calendar", label: "Calendar" },
  { id: "inspiration", label: "Inspiration" },
  { id: "cues", label: "Cues" },
  { id: "data", label: "Sources & data" },
  { id: "about", label: "About" },
];

export interface SectionProps {
  settings: Settings;
  update: (change: (current: Settings) => Settings) => void;
  status: AppStatus | null;
  reloadStatus: () => Promise<void>;
  data: DashboardData;
  nowMs: number;
}

export function SettingsSheet({
  open,
  section,
  onSectionChange,
  onClose,
  sync,
  deskState,
  onEnableDesk,
  onDisableDesk,
  ...props
}: SectionProps & {
  open: boolean;
  section: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  onClose: () => void;
  sync: SettingsSync;
  deskState: DeskModeState;
  onEnableDesk: () => void;
  onDisableDesk: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const hasIssue = (id: SettingsSection) => {
    const d = props.data;
    if (id === "weather") return Boolean(d.weather.error && !d.weather.data);
    if (id === "calendar") return Boolean(d.calendar.error && !d.calendar.data);
    if (id === "inspiration") return Boolean(d.inspiration.error && !d.inspiration.data);
    if (id === "desk") return deskState === "error" || deskState === "interrupted";
    return false;
  };

  const onTabKey = (event: React.KeyboardEvent, index: number) => {
    const delta = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + SECTIONS.length) % SECTIONS.length;
    onSectionChange(SECTIONS[next]!.id);
    tabs.current[next]?.focus();
  };

  const current = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0]!;

  return (
    <dialog ref={dialog} className={styles.sheet} onClose={onClose} aria-labelledby="settings-title">
      {open ? (
        <div className={styles.layout}>
          <nav className={styles.nav} aria-label="Settings sections">
            <p className={styles.navTitle} id="settings-title">
              settings
              <span>{sync === "saved" ? "synced" : sync === "saving" ? "saving…" : sync === "error" ? "sync failed" : "this device"}</span>
            </p>
            <div role="tablist" aria-orientation="vertical" style={{ display: "contents" }}>
              {SECTIONS.map((s, i) => (
                <button
                  key={s.id}
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`tab-${s.id}`}
                  aria-selected={s.id === section}
                  aria-controls="settings-panel"
                  tabIndex={s.id === section ? 0 : -1}
                  className={styles.tab}
                  onClick={() => onSectionChange(s.id)}
                  onKeyDown={(e) => onTabKey(e, i)}
                >
                  {s.label}
                  {hasIssue(s.id) ? <span className={styles.tabDot} aria-label="needs attention" /> : null}
                </button>
              ))}
            </div>
          </nav>

          <section className={styles.panel} id="settings-panel" role="tabpanel" aria-labelledby={`tab-${current.id}`}>
            <header className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>{current.label}</h2>
              <button type="button" className={styles.close} onClick={onClose} aria-label="Close settings">
                <Icon name="close" />
              </button>
            </header>
            <div className={styles.panelInner}>
              {section === "display" ? <DisplaySection {...props} /> : null}
              {section === "desk" ? <DeskSection state={deskState} onEnable={onEnableDesk} onDisable={onDisableDesk} /> : null}
              {section === "weather" ? <WeatherSection {...props} /> : null}
              {section === "calendar" ? <CalendarSection {...props} /> : null}
              {section === "inspiration" ? <InspirationSection {...props} /> : null}
              {section === "cues" ? <CuesSection {...props} /> : null}
              {section === "data" ? <DataSection {...props} sync={sync} /> : null}
              {section === "about" ? <AboutSection nowMs={props.nowMs} /> : null}
            </div>
          </section>
        </div>
      ) : null}
    </dialog>
  );
}
