// Web Audio synthesized sound-effects module for Stellar Life.
// SSR-safe: the AudioContext is created lazily in the browser only.
// All sounds are fully synthesized (oscillators + gain envelopes) — no assets.

export type SfxName =
  | "roll"
  | "move"
  | "event"
  | "good"
  | "bad"
  | "gate"
  | "win"
  | "select";

const STORAGE_KEY = "stellar-life:sfx";
const MASTER_GAIN = 0.08;

let ctx: AudioContext | null = null;
let enabled: boolean | null = null;

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const w = window as AudioWindow;
  const Ctor = window.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

export function isSfxEnabled(): boolean {
  if (enabled !== null) return enabled;
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    enabled = stored === null ? true : stored === "1";
  } catch {
    enabled = true;
  }
  return enabled;
}

export function setSfxEnabled(on: boolean): void {
  enabled = on;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

type OscType = OscillatorType;

// Schedule a single tone with an attack/decay gain envelope.
function tone(
  ac: AudioContext,
  start: number,
  freq: number,
  duration: number,
  type: OscType = "square",
  peak = 1,
): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);

  const attack = Math.min(0.008, duration * 0.25);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(MASTER_GAIN * peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

// Schedule a frequency sweep (used for the "gate" whoosh).
function sweep(
  ac: AudioContext,
  start: number,
  fromFreq: number,
  toFreq: number,
  duration: number,
  type: OscType = "sawtooth",
  peak = 1,
): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(fromFreq, start);
  osc.frequency.exponentialRampToValueAtTime(toFreq, start + duration);

  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(MASTER_GAIN * peak, start + duration * 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function render(ac: AudioContext, name: SfxName, t0: number): void {
  switch (name) {
    case "roll": {
      // Quick ascending blips, like dice tumbling.
      const notes = [440, 554, 659, 784];
      notes.forEach((f, i) => {
        tone(ac, t0 + i * 0.05, f, 0.045, "square", 0.8);
      });
      break;
    }
    case "move": {
      // Short tick.
      tone(ac, t0, 660, 0.06, "square", 0.7);
      break;
    }
    case "event": {
      // Two-tone notification.
      tone(ac, t0, 784, 0.12, "triangle", 0.9);
      tone(ac, t0 + 0.13, 988, 0.16, "triangle", 0.9);
      break;
    }
    case "good": {
      // Bright ascending arpeggio.
      const notes = [523, 659, 784];
      notes.forEach((f, i) => {
        tone(ac, t0 + i * 0.07, f, 0.12, "triangle", 0.9);
      });
      break;
    }
    case "bad": {
      // Descending buzz.
      sweep(ac, t0, 330, 110, 0.32, "sawtooth", 0.7);
      break;
    }
    case "gate": {
      // Rising whoosh — rocket gate breakthrough.
      sweep(ac, t0, 180, 1200, 0.42, "sawtooth", 0.55);
      sweep(ac, t0 + 0.05, 240, 1600, 0.36, "triangle", 0.4);
      break;
    }
    case "win": {
      // Triumphant short arpeggio.
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => {
        tone(ac, t0 + i * 0.08, f, 0.18, "square", 0.85);
      });
      break;
    }
    case "select": {
      // Soft click.
      tone(ac, t0, 880, 0.04, "sine", 0.6);
      break;
    }
  }
}

export function playSfx(name: SfxName): void {
  if (!isSfxEnabled()) return;
  const ac = getContext();
  if (!ac) return;

  const begin = (): void => {
    render(ac, name, ac.currentTime + 0.001);
  };

  if (ac.state === "suspended") {
    // Respect autoplay policy: resume on the next user-gesture-driven call.
    ac.resume().then(begin).catch(() => {
      /* Ignore resume failures. */
    });
    return;
  }
  begin();
}
