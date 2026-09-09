import type { Pattern, TrackId } from "./types";
import { TRACKS } from "./types";

export type EngineHooks = {
  getPattern: () => Pattern;
  getBpm: () => number;
  getSwing: () => number;
  getMuted: () => Record<TrackId, boolean>;
  getMaster: () => number;
  onStep: (step: number) => void;
};

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;
const TRACK_GAIN: Record<TrackId, number> = {
  kick: 1,
  snare: 0.72,
  hats: 0.42,
  perc: 0.55,
};

type VisualEvent = { step: number; time: number };

function createAudioContext(): AudioContext {
  const w = globalThis as typeof globalThis & {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) {
    throw new Error("Web Audio is not supported in this browser");
  }
  return new Ctor({ latencyHint: "interactive" });
}


export class DrumEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private hooks: EngineHooks | null = null;
  private timer: number | null = null;
  private raf = 0;
  private nextNoteTime = 0;
  private step = 0;
  private visuals: VisualEvent[] = [];
  private voices: AudioScheduledSourceNode[] = [];
  playing = false;

  attach(hooks: EngineHooks) {
    this.hooks = hooks;
  }

  unlock() {
    const ctx = this.ensureContext();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    return ctx;
  }

  setMaster(value: number) {
    if (!this.master || !this.ctx) return;
    const gain = Math.max(0, Math.min(1, value)) ** 2;
    this.master.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.03);
  }

  trigger(track: TrackId, velocity = 1) {
    const ctx = this.unlock();
    this.voice(track, ctx.currentTime, velocity);
  }

  start() {
    const ctx = this.unlock();
    if (this.playing) return;
    this.playing = true;
    this.step = 0;
    this.visuals = [];
    this.nextNoteTime = ctx.currentTime + 0.04;
    this.timer = window.setInterval(() => this.schedule(), LOOKAHEAD_MS);
    this.raf = requestAnimationFrame(this.flushVisuals);
    this.schedule();
  }

  stop() {
    this.playing = false;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    this.visuals = [];
    const now = this.ctx?.currentTime ?? 0;
    for (const node of this.voices) {
      try {
        node.stop(now);
      } catch {
        /* already stopped */
      }
    }
    this.voices = [];
    this.hooks?.onStep(-1);
  }

  private ensureContext(): AudioContext {
    if (this.ctx) return this.ctx;
    const ctx = createAudioContext();
    const master = ctx.createGain();
    master.gain.value = (this.hooks?.getMaster() ?? 0.85) ** 2;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 8;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.12;
    const hipass = ctx.createBiquadFilter();
    hipass.type = "highpass";
    hipass.frequency.value = 20;
    master.connect(compressor);
    compressor.connect(hipass);
    hipass.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    this.noise = makeNoiseBuffer(ctx);
    return ctx;
  }

  private schedule() {
    const ctx = this.ctx;
    const hooks = this.hooks;
    if (!ctx || !hooks || !this.playing) return;
    const bpm = Math.max(40, Math.min(220, hooks.getBpm()));
    const stepDur = 60 / bpm / 4;
    const swing = Math.max(0, Math.min(1, hooks.getSwing() / 100));

    while (this.nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
      const step = this.step;
      const when =
        this.nextNoteTime + (step % 2 === 1 ? swing * stepDur * 0.5 : 0);
      this.visuals.push({ step, time: when });
      this.scheduleHits(step, when);
      this.nextNoteTime += stepDur;
      this.step = (this.step + 1) % 16;
    }
  }

  private scheduleHits(step: number, when: number) {
    const hooks = this.hooks;
    if (!hooks) return;
    const pattern = hooks.getPattern();
    const muted = hooks.getMuted();
    for (const track of TRACKS) {
      if (muted[track] || !pattern[track][step]) continue;
      const velocity = 0.88 + Math.random() * 0.12;
      this.voice(track, when, velocity);
    }
  }

  private flushVisuals = () => {
    const ctx = this.ctx;
    if (!this.playing || !ctx) return;
    const now = ctx.currentTime;
    while (this.visuals.length && this.visuals[0].time <= now) {
      const event = this.visuals.shift();
      if (event) this.hooks?.onStep(event.step);
    }
    this.raf = requestAnimationFrame(this.flushVisuals);
  };

  private voice(track: TrackId, time: number, velocity: number) {
    const ctx = this.ctx;
    const dest = this.master;
    if (!ctx || !dest || !this.noise) return;
    const level = TRACK_GAIN[track] * velocity;
    switch (track) {
      case "kick":
        this.kick(ctx, dest, time, level);
        break;
      case "snare":
        this.snare(ctx, dest, time, level);
        break;
      case "hats":
        this.hat(ctx, dest, time, level);
        break;
      case "perc":
        this.perc(ctx, dest, time, level);
        break;
    }
  }

  private kick(
    ctx: AudioContext,
    dest: AudioNode,
    time: number,
    level: number,
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(168, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.07);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.42);
    osc.connect(gain).connect(dest);
    osc.start(time);
    osc.stop(time + 0.46);
    this.track(osc);

    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = "square";
    click.frequency.setValueAtTime(48, time);
    clickGain.gain.setValueAtTime(level * 0.22, time);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
    click.connect(clickGain).connect(dest);
    click.start(time);
    click.stop(time + 0.04);
    this.track(click);
  }

  private snare(
    ctx: AudioContext,
    dest: AudioNode,
    time: number,
    level: number,
  ) {
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = "triangle";
    body.frequency.setValueAtTime(186, time);
    body.frequency.exponentialRampToValueAtTime(140, time + 0.08);
    bodyGain.gain.setValueAtTime(level * 0.45, time);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    body.connect(bodyGain).connect(dest);
    body.start(time);
    body.stop(time + 0.18);
    this.track(body);

    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1400;
    const snap = ctx.createGain();
    snap.gain.setValueAtTime(level * 0.7, time);
    snap.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
    src.connect(filter).connect(snap).connect(dest);
    src.start(time);
    src.stop(time + 0.16);
    this.track(src);
  }

  private hat(ctx: AudioContext, dest: AudioNode, time: number, level: number) {
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.96 + Math.random() * 0.1;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7200;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 9500;
    bp.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    src.connect(hp).connect(bp).connect(gain).connect(dest);
    src.start(time);
    src.stop(time + 0.06);
    this.track(src);
  }

  private perc(
    ctx: AudioContext,
    dest: AudioNode,
    time: number,
    level: number,
  ) {
    for (const freq of [845, 1280]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(level * 0.16, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);
      osc.connect(gain).connect(dest);
      osc.start(time);
      osc.stop(time + 0.09);
      this.track(osc);
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 4000;
    const tick = ctx.createGain();
    tick.gain.setValueAtTime(level * 0.28, time);
    tick.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
    src.connect(hp).connect(tick).connect(dest);
    src.start(time);
    src.stop(time + 0.04);
    this.track(src);
  }

  private track(node: AudioScheduledSourceNode) {
    this.voices.push(node);
    node.onended = () => {
      this.voices = this.voices.filter((n) => n !== node);
    };
  }
}

function makeNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 0.8);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export const drumEngine = new DrumEngine();
