"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { REFRESH } from "@/hooks/useDashboardData";
import { BUILTIN_CUES } from "@/lib/providers/quotes/builtin";
import { CUE_CADENCES, CUE_SOURCES, DAY_WINDOWS, type DayWindow, type PersonalCue } from "@/lib/settings";
import type { ProviderResult, Cue } from "@/lib/types";
import { Group, Segmented, Switch } from "./controls";
import { ProviderCard } from "./sections";
import type { SectionProps } from "./SettingsSheet";
import styles from "./settings.module.css";

const SOURCE_LABELS: Record<(typeof CUE_SOURCES)[number], string> = {
  builtin: `built-in (${BUILTIN_CUES.length})`,
  personal: "my cues",
  remote: "remote feed",
  mixed: "mix of all",
};

const CADENCE_LABELS: Record<(typeof CUE_CADENCES)[number], string> = {
  manual: "manual",
  "15m": "15 min",
  hourly: "hourly",
  daily: "daily",
  launch: "on launch",
};

const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function newId() {
  return `cue-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function scheduleLabel(cue: PersonalCue): string {
  if (!cue.schedule) return "any time";
  const days = cue.schedule.days.length === 0 || cue.schedule.days.length === 7 ? "every day" : cue.schedule.days.map((d) => DAY_LONG[d]!.slice(0, 3).toLowerCase()).join(" ");
  return cue.schedule.window === "any" ? days : `${days} · ${cue.schedule.window}`;
}

export function CuesSection({ settings, update, data, nowMs }: SectionProps) {
  const c = settings.cues;
  const set = (patch: Partial<typeof c>) => update((s) => ({ ...s, cues: { ...s.cues, ...patch } }));
  const setPersonal = (personal: PersonalCue[]) => set({ personal });

  const [editing, setEditing] = useState<string | null>(null);
  const [feedDraft, setFeedDraft] = useState(c.remoteUrl);
  const [feedTest, setFeedTest] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const move = (index: number, delta: number) => {
    const list = [...c.personal];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target]!, list[index]!];
    setPersonal(list);
  };

  const testFeed = async () => {
    setTesting(true);
    setFeedTest(null);
    try {
      const res = await fetch(`/api/cues/remote?url=${encodeURIComponent(feedDraft.trim())}`);
      const body = (await res.json()) as ProviderResult<Cue[]>;
      setFeedTest(body.ok ? { ok: true, text: `Feed looks good — ${body.data.length} cues.` } : { ok: false, text: body.error.message });
    } catch {
      setFeedTest({ ok: false, text: "Couldn't reach dash-bord's server." });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <Segmented legend="source" value={c.source} options={CUE_SOURCES.map((value) => ({ value, label: SOURCE_LABELS[value] }))} onChange={(source) => set({ source })} />
      <Segmented
        legend="rotate"
        value={c.cadence}
        options={CUE_CADENCES.map((value) => ({ value, label: CADENCE_LABELS[value] }))}
        onChange={(cadence) => set({ cadence })}
        hint="Tap the cue card on the desk any time to see the next one."
      />
      <Switch label="Show attribution" description="when a cue has one (built-in cues never do)" checked={c.showAttribution} onChange={(showAttribution) => set({ showAttribution })} />

      <Group label={`my cues · ${c.personal.length}`}>
        {c.personal.length === 0 ? <p className={styles.hint}>Write your own prompts. Schedule them for certain days or times of day if you like.</p> : null}
        <ul className={styles.cueList}>
          {c.personal.map((cue, index) =>
            editing === cue.id ? (
              <li key={cue.id}>
                <CueEditor
                  initial={cue}
                  onCancel={() => setEditing(null)}
                  onSave={(next) => {
                    setPersonal(c.personal.map((p) => (p.id === cue.id ? next : p)));
                    setEditing(null);
                  }}
                />
              </li>
            ) : (
              <li key={cue.id} className={styles.cueItem}>
                <div style={{ minWidth: 0 }}>
                  <p className={styles.cueItemText}>{cue.text}</p>
                  <p className={styles.cueItemMeta}>
                    {cue.attribution ? `— ${cue.attribution} · ` : ""}
                    {scheduleLabel(cue)}
                  </p>
                </div>
                <div className={styles.cueActions}>
                  <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconOnly}`} onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move "${cue.text}" up`}>
                    <Icon name="up" size={16} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.ghost} ${styles.iconOnly}`}
                    onClick={() => move(index, 1)}
                    disabled={index === c.personal.length - 1}
                    aria-label={`Move "${cue.text}" down`}
                  >
                    <Icon name="down" size={16} />
                  </button>
                  <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconOnly}`} onClick={() => setEditing(cue.id)} aria-label={`Edit "${cue.text}"`}>
                    <Icon name="edit" size={16} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.ghost} ${styles.iconOnly}`}
                    onClick={() => setPersonal(c.personal.filter((p) => p.id !== cue.id))}
                    aria-label={`Delete "${cue.text}"`}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
        {editing === "new" ? (
          <CueEditor
            onCancel={() => setEditing(null)}
            onSave={(cue) => {
              setPersonal([...c.personal, cue]);
              setEditing(null);
            }}
          />
        ) : (
          <div>
            <button type="button" className={styles.button} onClick={() => setEditing("new")} disabled={c.personal.length >= 200}>
              <Icon name="plus" size={16} /> add a cue
            </button>
          </div>
        )}
      </Group>

      <Group label="remote json feed">
        <p className={styles.hint}>
          An HTTPS URL returning <code>[{"{"} &quot;text&quot;: &quot;…&quot;, &quot;attribution&quot;?: &quot;…&quot;, &quot;tags&quot;?: [&quot;…&quot;] {"}"}]</code>.
          Fetched by the server, validated, cached on this device.
        </p>
        <form
          className={styles.inputRow}
          onSubmit={(e) => {
            e.preventDefault();
            set({ remoteUrl: feedDraft.trim() });
          }}
        >
          <input
            className={styles.input}
            type="url"
            inputMode="url"
            value={feedDraft}
            onChange={(e) => setFeedDraft(e.target.value)}
            placeholder="https://example.com/cues.json"
            aria-label="Remote cue feed URL"
            aria-invalid={feedDraft.trim() !== "" && !feedDraft.trim().startsWith("https://")}
          />
          <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={testFeed} disabled={!feedDraft.trim().startsWith("https://") || testing}>
            {testing ? "testing…" : "test"}
          </button>
          <button type="submit" className={styles.button} disabled={feedDraft.trim() === c.remoteUrl || (feedDraft.trim() !== "" && !feedDraft.trim().startsWith("https://"))}>
            save
          </button>
        </form>
        {feedTest ? (
          <p className={feedTest.ok ? styles.ok : styles.error} role="status">
            {feedTest.text}
          </p>
        ) : null}
        {c.remoteUrl && (c.source === "remote" || c.source === "mixed") ? (
          <ProviderCard name="Cue feed" slot={data.remoteCues} nowMs={nowMs} staleAfterMs={REFRESH.remoteCues * 4} onRetry={data.refresh.remoteCues} every="every 6 h" />
        ) : null}
      </Group>
    </>
  );
}

function CueEditor({ initial, onSave, onCancel }: { initial?: PersonalCue; onSave: (cue: PersonalCue) => void; onCancel: () => void }) {
  const [text, setText] = useState(initial?.text ?? "");
  const [attribution, setAttribution] = useState(initial?.attribution ?? "");
  const [days, setDays] = useState<number[]>(initial?.schedule?.days ?? []);
  const [dayWindow, setDayWindow] = useState<DayWindow>(initial?.schedule?.window ?? "any");
  const textId = useId();
  const tooLong = text.trim().length > 220;

  const toggleDay = (day: number) => setDays((list) => (list.includes(day) ? list.filter((d) => d !== day) : [...list, day].sort()));

  return (
    <form
      className={styles.editor}
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim() || tooLong) return;
        const scheduled = days.length > 0 || dayWindow !== "any";
        onSave({
          id: initial?.id ?? newId(),
          text: text.trim(),
          attribution: attribution.trim() || undefined,
          schedule: scheduled ? { days, window: dayWindow } : undefined,
        });
      }}
    >
      <label className={styles.groupLabel} htmlFor={textId}>
        {initial ? "edit cue" : "new cue"} · {text.trim().length}/220
      </label>
      <textarea id={textId} className={styles.textarea} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write something kind and useful." aria-invalid={tooLong} />
      <input className={styles.input} value={attribution} onChange={(e) => setAttribution(e.target.value)} placeholder="Attribution (optional)" aria-label="Attribution (optional)" maxLength={80} />
      <fieldset className={styles.group}>
        <legend>days · none selected = every day</legend>
        <div className={`${styles.segmented} ${styles.days}`}>
          {DAY_NAMES.map((name, day) => (
            <label key={day} className={styles.segment}>
              <input type="checkbox" checked={days.includes(day)} onChange={() => toggleDay(day)} aria-label={DAY_LONG[day]} />
              <span aria-hidden="true">{name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Segmented legend="time of day" value={dayWindow} options={DAY_WINDOWS.map((value) => ({ value, label: value }))} onChange={setDayWindow} />
      <div className={styles.inputRow}>
        <button type="submit" className={`${styles.button} ${styles.accentButton}`} disabled={!text.trim() || tooLong}>
          <Icon name="check" size={16} /> save cue
        </button>
        <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={onCancel}>
          cancel
        </button>
      </div>
    </form>
  );
}
