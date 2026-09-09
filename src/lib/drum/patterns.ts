import { clonePattern, emptyPattern, type Pattern } from "./types";

/** `x` = hit, `-` = rest. Spaces ignored. Must be 16 steps. */
function steps(seq: string): boolean[] {
  const cells = seq.replace(/\s+/g, "").split("");
  if (cells.length !== 16) {
    throw new Error(`Pattern must have 16 steps, got ${cells.length}`);
  }
  return cells.map((c) => c === "x" || c === "X");
}

export type PresetId = "house" | "boom-bap" | "break" | "techno";

export const PRESETS: Record<
  PresetId,
  { label: string; pattern: Pattern }
> = {
  house: {
    label: "House",
    pattern: {
      kick: steps("x--- x--- x--- x---"),
      snare: steps("---- x--- ---- x---"),
      hats: steps("x-x- x-x- x-x- x-x-"),
      perc: steps("--x- ---- --x- --x-"),
    },
  },
  "boom-bap": {
    label: "Boom-bap",
    pattern: {
      kick: steps("x--x ---- x-x- ----"),
      snare: steps("---- x--- ---- x---"),
      hats: steps("x-x- x-x- x-xx x-x-"),
      perc: steps("---- --x- ---- --x-"),
    },
  },
  break: {
    label: "Break",
    pattern: {
      kick: steps("x--x --x- --x- ----"),
      snare: steps("--x- x--x --x- x-x-"),
      hats: steps("--x- --x- --x- --x-"),
      perc: steps("x--- ---- ---- x-x-"),
    },
  },
  techno: {
    label: "Techno",
    pattern: {
      kick: steps("x--- x--- x--- x---"),
      snare: steps("---- ---- x--- ----"),
      hats: steps("--x- --x- --x- --x-"),
      perc: steps("---- --x- ---- x--x"),
    },
  },
};

export const DEFAULT_PRESET: PresetId = "house";

export function defaultPattern(): Pattern {
  return clonePattern(PRESETS[DEFAULT_PRESET].pattern);
}

export function randomPattern(): Pattern {
  const next = emptyPattern();
  for (let i = 0; i < 16; i++) {
    const onBeat = i % 4 === 0;
    const onSnare = i === 4 || i === 12;
    next.kick[i] = Math.random() < (onBeat ? 0.72 : 0.12);
    next.snare[i] = Math.random() < (onSnare ? 0.9 : 0.08);
    next.hats[i] = Math.random() < 0.55;
    next.perc[i] = Math.random() < 0.18;
  }
  if (!next.kick.some(Boolean)) next.kick[0] = true;
  if (!next.snare.some(Boolean)) next.snare[4] = true;
  return next;
}
