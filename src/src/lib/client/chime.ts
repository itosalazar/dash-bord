/**
 * A soft three-note chime synthesised with Web Audio — no audio files to ship
 * or cache. iOS only lets a page make sound after a tap, so `unlockAudio()`
 * runs from the timer's start button; the chime can then play when it ends.
 * (The iPhone's silent switch still mutes web audio.)
 */

export type ChimeVolume = "soft" | "medium" | "loud";

const GAIN: Record<ChimeVolume, number> = { soft: 0.12, medium: 0.28, loud: 0.55 };

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  return context;
}

/** Call from a tap/click so later chimes are allowed to play. */
export function unlockAudio(): void {
  const ctx = audioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  // A silent blip completes the unlock on older iOS versions.
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const osc = ctx.createOscillator();
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.01);
}

function tone(ctx: AudioContext, frequency: number, start: number, peak: number) {
  const osc = ctx.createOscillator();
  const overtone = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  overtone.type = "sine";
  osc.frequency.value = frequency;
  overtone.frequency.value = frequency * 2.01; // a touch of bell shimmer
  const overtoneGain = ctx.createGain();
  overtoneGain.gain.value = 0.18;

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.6);

  osc.connect(gain);
  overtone.connect(overtoneGain).connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  overtone.start(start);
  osc.stop(start + 1.7);
  overtone.stop(start + 1.7);
}

/** Plays the chime twice (≈3 s). Returns false if audio isn't available. */
export function playChime(volume: ChimeVolume = "medium"): boolean {
  const ctx = audioContext();
  if (!ctx) return false;
  if (ctx.state === "suspended") void ctx.resume();
  const peak = GAIN[volume];
  const now = ctx.currentTime + 0.05;
  // E6 – G#6 – B6, a gentle major arpeggio, repeated once.
  for (const offset of [0, 1.4]) {
    tone(ctx, 1318.5, now + offset, peak);
    tone(ctx, 1661.2, now + offset + 0.16, peak * 0.85);
    tone(ctx, 1975.5, now + offset + 0.32, peak * 0.7);
  }
  return true;
}
