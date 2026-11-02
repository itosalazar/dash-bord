"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { playChime, unlockAudio } from "@/lib/client/chime";
import { Group, Segmented, Stepper, Switch } from "./controls";
import type { SectionProps } from "./SettingsSheet";
import styles from "./settings.module.css";

export function TimerSection({ settings, update }: SectionProps) {
  const t = settings.timer;
  const set = (patch: Partial<typeof t>) => update((s) => ({ ...s, timer: { ...s.timer, ...patch } }));
  const [soundNote, setSoundNote] = useState<string | null>(null);

  return (
    <>
      <Switch label="Show the focus timer" description="a Pomodoro dial beside the clock — tap it to start or pause" checked={t.enabled} onChange={(enabled) => set({ enabled })} />

      <Group label="lengths">
        <Stepper label="Focus" value={t.focusMinutes} min={1} max={180} step={5} unit="min" onChange={(focusMinutes) => set({ focusMinutes })} />
        <Stepper label="Short break" value={t.shortBreakMinutes} min={1} max={60} unit="min" onChange={(shortBreakMinutes) => set({ shortBreakMinutes })} />
        <Stepper label="Long break" value={t.longBreakMinutes} min={1} max={90} step={5} unit="min" onChange={(longBreakMinutes) => set({ longBreakMinutes })} />
        <Stepper
          label="Focus sessions before a long break"
          value={t.sessionsBeforeLong}
          min={2}
          max={8}
          onChange={(sessionsBeforeLong) => set({ sessionsBeforeLong })}
        />
      </Group>

      <Switch label="Start the next phase automatically" description="otherwise each focus or break waits for a tap" checked={t.autoStartNext} onChange={(autoStartNext) => set({ autoStartNext })} />

      <Group label="sound alert">
        <Switch label="Play a chime when time is up" checked={t.sound} onChange={(sound) => set({ sound })} />
        <Segmented
          legend="volume"
          value={t.volume}
          options={[
            { value: "soft", label: "soft" },
            { value: "medium", label: "medium" },
            { value: "loud", label: "loud" },
          ]}
          onChange={(volume) => set({ volume })}
        />
        <div className={styles.inputRow}>
          <button
            type="button"
            className={`${styles.button} ${styles.ghost}`}
            onClick={() => {
              unlockAudio();
              setSoundNote(playChime(t.volume) ? null : "This browser can't play sounds.");
            }}
          >
            <Icon name="check" size={16} /> play test sound
          </button>
        </div>
        {soundNote ? <p className={styles.error}>{soundNote}</p> : null}
        <p className={styles.hint}>
          On iPhone and iPad the chime follows the silent switch and volume buttons. Keep dash-bord open (Desk Mode helps): iOS pauses
          web apps in the background, so a timer that ends while the app is hidden shows its message when you come back.
        </p>
      </Group>
    </>
  );
}
