import { create } from "zustand";
import { drumEngine } from "./engine";
import {
  clonePattern,
  emptyPattern,
  type Pattern,
  type TrackId,
  TRACKS,
} from "./types";
import {
  DEFAULT_PRESET,
  defaultPattern,
  PRESETS,
  randomPattern,
  type PresetId,
} from "./patterns";

const STORAGE_KEY = "lane-drum-v1";

type Persisted = {
  pattern: Pattern;
  bpm: number;
  swing: number;
  master: number;
  preset: PresetId | null;
};

export type DrumState = {
  pattern: Pattern;
  bpm: number;
  swing: number;
  master: number;
  muted: Record<TrackId, boolean>;
  isPlaying: boolean;
  currentStep: number;
  preset: PresetId | null;
  toggleStep: (track: TrackId, step: number, value?: boolean) => void;
  setBpm: (bpm: number) => void;
  setSwing: (swing: number) => void;
  setMaster: (master: number) => void;
  toggleMute: (track: TrackId) => void;
  play: () => void;
  stop: () => void;
  togglePlay: () => void;
  clear: () => void;
  randomize: () => void;
  loadPreset: (id: PresetId) => void;
  setCurrentStep: (step: number) => void;
  hydrate: () => void;
};

const silentMuted = (): Record<TrackId, boolean> => ({
  kick: false,
  snare: false,
  hats: false,
  perc: false,
});

export const useDrum = create<DrumState>((set, get) => ({
  pattern: defaultPattern(),
  bpm: 120,
  swing: 8,
  master: 0.85,
  muted: silentMuted(),
  isPlaying: false,
  currentStep: -1,
  preset: DEFAULT_PRESET,

  toggleStep: (track, step, value) => {
    const pattern = clonePattern(get().pattern);
    pattern[track][step] = value ?? !pattern[track][step];
    set({ pattern, preset: null });
    persist(get());
  },

  setBpm: (bpm) => {
    set({ bpm: Math.round(Math.min(200, Math.max(60, bpm))) });
    persist(get());
  },

  setSwing: (swing) => {
    set({ swing: Math.round(Math.min(100, Math.max(0, swing))) });
    persist(get());
  },

  setMaster: (master) => {
    const next = Math.min(1, Math.max(0, master));
    set({ master: next });
    drumEngine.setMaster(next);
    persist(get());
  },

  toggleMute: (track) => {
    set({ muted: { ...get().muted, [track]: !get().muted[track] } });
  },

  play: () => {
    bindEngine(get, set);
    drumEngine.start();
    set({ isPlaying: true });
  },

  stop: () => {
    drumEngine.stop();
    set({ isPlaying: false, currentStep: -1 });
  },

  togglePlay: () => {
    if (get().isPlaying) get().stop();
    else get().play();
  },

  clear: () => {
    set({ pattern: emptyPattern(), preset: null });
    persist(get());
  },

  randomize: () => {
    set({ pattern: randomPattern(), preset: null });
    persist(get());
  },

  loadPreset: (id) => {
    set({ pattern: clonePattern(PRESETS[id].pattern), preset: id });
    persist(get());
  },

  setCurrentStep: (step) => set({ currentStep: step }),

  hydrate: () => {
    const saved = readPersisted();
    if (!saved) return;
    set({
      pattern: saved.pattern,
      bpm: saved.bpm,
      swing: saved.swing,
      master: saved.master,
      preset: saved.preset,
    });
    drumEngine.setMaster(saved.master);
  },
}));

function bindEngine(
  get: () => DrumState,
  set: (partial: Partial<DrumState>) => void,
) {
  drumEngine.attach({
    getPattern: () => get().pattern,
    getBpm: () => get().bpm,
    getSwing: () => get().swing,
    getMuted: () => get().muted,
    getMaster: () => get().master,
    onStep: (step) => set({ currentStep: step }),
  });
}

function persist(state: DrumState) {
  if (typeof window === "undefined") return;
  const payload: Persisted = {
    pattern: state.pattern,
    bpm: state.bpm,
    swing: state.swing,
    master: state.master,
    preset: state.preset,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

function readPersisted(): Persisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Persisted>;
    if (!data.pattern) return null;
    const pattern = emptyPattern();
    for (const track of TRACKS) {
      const row = data.pattern[track];
      if (!Array.isArray(row) || row.length !== 16) return null;
      pattern[track] = row.map(Boolean);
    }
    const preset =
      data.preset && data.preset in PRESETS ? data.preset : null;
    return {
      pattern,
      bpm: clampNum(data.bpm, 60, 200, 120),
      swing: clampNum(data.swing, 0, 100, 8),
      master: clampNum(data.master, 0, 1, 0.85),
      preset,
    };
  } catch {
    return null;
  }
}

function clampNum(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}
