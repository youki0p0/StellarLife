// Web Audio synthesized background-music module for Stellar Life.
// SSR-safe: the AudioContext is created lazily in the browser only.
// A gentle, ambient chiptune loop — fully synthesized (oscillators + gain
// envelopes), no asset files. Disabled by default so it never autostarts
// without an explicit user opt-in.

const STORAGE_KEY = "stellar-life:bgm";
const MASTER_GAIN = 0.05;

// Scheduler tuning (lookahead pattern).
const TICK_MS = 100; // How often the scheduler wakes up.
const LOOKAHEAD = 0.25; // Seconds of audio to schedule ahead of currentTime.
const STEP_DURATION = 0.36; // Seconds per arpeggio step.

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let enabled: boolean | null = null;

let timer: ReturnType<typeof setInterval> | null = null;
let playing = false;
// Absolute AudioContext time of the next step still to be scheduled.
let nextStepTime = 0;
// Index of the next step within the looping pattern.
let stepIndex = 0;

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
  masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(MASTER_GAIN, ctx.currentTime);
  masterGain.connect(ctx.destination);
  return ctx;
}

export function isBgmEnabled(): boolean {
  if (enabled !== null) return enabled;
  if (typeof window === "undefined") return false;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    enabled = stored === "1"; // Default DISABLED when unset.
  } catch {
    enabled = false;
  }
  return enabled;
}

export function setBgmEnabled(on: boolean): void {
  enabled = on;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
    } catch {
      // Ignore storage failures (private mode, quota, etc.).
    }
  }
  if (on) {
    startBgm();
  } else {
    stopBgm();
  }
}

// --- Musical material -------------------------------------------------------
// A space-y A minor pattern: a slow bassline plus a gentle arpeggio.
// Frequencies in Hz. The pattern loops every BASS.length steps.

// Bassline (one note per step), low octave.
const BASS: number[] = [
  110.0, // A2
  110.0,
  146.83, // D3
  146.83,
  130.81, // C3
  130.81,
  98.0, // G2
  98.0,
];

// Arpeggio notes layered above; null = rest for a more open, ambient feel.
const ARP: (number | null)[] = [
  440.0, // A4
  659.25, // E5
  523.25, // C5
  659.25, // E5
  587.33, // D5
  null,
  392.0, // G4
  493.88, // B4
];

// Schedule one tone with a soft attack/decay envelope through the master bus.
function tone(
  ac: AudioContext,
  out: GainNode,
  start: number,
  freq: number,
  duration: number,
  type: OscillatorType,
  peak: number,
): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);

  const attack = Math.min(0.04, duration * 0.4);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(out);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

// Render the bass + arpeggio for a single step at the given start time.
function scheduleStep(ac: AudioContext, out: GainNode, start: number): void {
  const i = stepIndex % BASS.length;

  // Bass: soft triangle, sustained across the step.
  tone(ac, out, start, BASS[i], STEP_DURATION * 0.95, "triangle", 0.6);

  // Arpeggio: brighter, shorter square blip (skipped on rests).
  const arp = ARP[i];
  if (arp !== null) {
    tone(ac, out, start, arp, STEP_DURATION * 0.7, "square", 0.28);
  }

  stepIndex += 1;
}

// Lookahead scheduler: schedule any steps that fall inside the lookahead window.
function scheduler(): void {
  const ac = ctx;
  const out = masterGain;
  if (!ac || !out) return;
  while (nextStepTime < ac.currentTime + LOOKAHEAD) {
    scheduleStep(ac, out, nextStepTime);
    nextStepTime += STEP_DURATION;
  }
}

export function startBgm(): void {
  if (!isBgmEnabled()) return;
  const ac = getContext();
  if (!ac || !masterGain) return;
  if (playing) return;

  const begin = (): void => {
    if (playing) return;
    playing = true;
    nextStepTime = ac.currentTime + 0.1;
    scheduler();
    timer = setInterval(scheduler, TICK_MS);
  };

  if (ac.state === "suspended") {
    // Respect autoplay policy: resume on a user-gesture-driven call.
    ac.resume().then(begin).catch(() => {
      /* Ignore resume failures. */
    });
    return;
  }
  begin();
}

export function stopBgm(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  playing = false;
  stepIndex = 0;
  nextStepTime = 0;
}
