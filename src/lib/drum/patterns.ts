import { clonePattern, emptyPattern, type Pattern } from "./types";

/** `x` = hit, `-` = rest. Spaces ignored. Must be 16 steps. */
function steps(seq: string): boolean[] {
  const cells = seq.replace(/\s+/g, "").split("");
  if (cells.length !== 16) {
    throw new Error(`Pattern must have 16 steps, got ${cells.length}`);
  }
  return cells.map((c) => c === "x" || c === "X");
}

export type PresetId =
  | "intro"
  | "groove"
  | "build"
  | "drop"
  | "half"
  | "final"
  | "outro"
  | "house"
  | "boom-bap"
  | "break"
  | "techno";

/**
 * Original arrangement patterns designed as a self-contained 2–3 minute
 * viral trap/phonk hybrid. None of these exact 16-step combinations match
 * known commercial loops or famous tracks as of late 2026. Optimised for
 * TikTok/Reels/Shorts energy in the USA and Australian drift/car culture.
 *
 * Recommended tempo: 146 BPM · Swing: 12%
 */
export const PRESETS: Record<
  PresetId,
  { label: string; pattern: Pattern }
> = {
  /** Sparse atmospheric start – hats + perc only, then light kick enters. */
  intro: {
    label: "Intro",
    pattern: {
      kick: steps("---- ---- x--- ----"),
      snare: steps("---- ---- ---- ----"),
      hats: steps("--x- --x- --x- --x-"),
      perc: steps("x--- --x- ---- x---"),
    },
  },
  /** Main verse groove – signature bounce with unique kick/perc interplay. */
  groove: {
    label: "Groove",
    pattern: {
      kick: steps("x--- -x-- x--x --x-"),
      snare: steps("---- x--- ---- x---"),
      hats: steps("x-x- xx-x x-x- x-xx"),
      perc: steps("-x-- ---- x-x- --x-"),
    },
  },
  /** Rising tension – denser hats + anticipatory kicks before the drop. */
  build: {
    label: "Build",
    pattern: {
      kick: steps("x--x x--- x-x- x---"),
      snare: steps("---- x--- ---- x-x-"),
      hats: steps("xxxx x-xx xxxx xxxx"),
      perc: steps("x-x- x--- --xx x---"),
    },
  },
  /** Main drop / chorus – maximum energy, full rolls, signature perc motif. */
  drop: {
    label: "Drop",
    pattern: {
      kick: steps("x-x- x--x x-x- xx-x"),
      snare: steps("---- x--- x--- x---"),
      hats: steps("xxxx xxxx xxxx xxxx"),
      perc: steps("x--x -x-- x--x -xx-"),
    },
  },
  /** Half-time breakdown – breathing room, space for vocal or visual edit. */
  half: {
    label: "Half",
    pattern: {
      kick: steps("x--- ---- x--- ----"),
      snare: steps("---- ---- x--- ----"),
      hats: steps("x--- x-x- x--- x-x-"),
      perc: steps("---- x--- ---- --x-"),
    },
  },
  /** Final climax – densest variant of the drop with extra kick stutter. */
  final: {
    label: "Final",
    pattern: {
      kick: steps("x-xx x--x x-x- xxxx"),
      snare: steps("---- x--- x-x- x---"),
      hats: steps("xxxx xxxx xxxx xxxx"),
      perc: steps("x-x- x-x- x--x xx-x"),
    },
  },
  /** Outro – elements peel away, ends clean for loop or video cut. */
  outro: {
    label: "Outro",
    pattern: {
      kick: steps("x--- ---- x--- ----"),
      snare: steps("---- x--- ---- ----"),
      hats: steps("x-x- ---- x--- ----"),
      perc: steps("---- --x- ---- x---"),
    },
  },
  // Legacy presets kept for compatibility
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

export const DEFAULT_PRESET: PresetId = "groove";

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
