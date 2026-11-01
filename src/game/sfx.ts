/**
 * Procedural sound effects with WebAudio — zero audio files, zero licensing
 * questions. Every sound is synthesized, so the build stays tiny and the
 * cold start stays fast.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = 'sine',
  gain = 0.5,
  delay = 0,
  slideTo?: number,
): void {
  const a = ac();
  if (!a || !master) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur: number, gain = 0.3, delay = 0): void {
  const a = ac();
  if (!a || !master) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  const g = a.createGain();
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 1800;
  g.gain.value = gain;
  src.buffer = buf;
  src.connect(f).connect(g).connect(master);
  src.start(a.currentTime + delay);
}

export const sfx = {
  setMuted(m: boolean) {
    muted = m;
  },
  isMuted: () => muted,
  unlock: () => void ac(),
  select: () => tone(880, 0.08, 'triangle', 0.35),
  deselect: () => tone(520, 0.08, 'triangle', 0.25),
  place: () => {
    tone(220, 0.12, 'square', 0.18);
    tone(440, 0.1, 'triangle', 0.3, 0.03);
  },
  deploy: () => tone(180, 0.45, 'sawtooth', 0.22, 0, 720),
  check: () => tone(1320, 0.03, 'square', 0.08),
  served: () => {
    tone(784, 0.1, 'sine', 0.3);
    tone(1175, 0.14, 'sine', 0.25, 0.06);
  },
  blocked: () => noise(0.18, 0.35),
  breach: () => {
    tone(440, 0.22, 'sawtooth', 0.35, 0, 220);
    tone(440, 0.22, 'sawtooth', 0.35, 0.25, 220);
  },
  outage: () => tone(300, 0.35, 'triangle', 0.35, 0, 120),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.3, i * 0.09)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'sine', 0.3, i * 0.12)),
};
