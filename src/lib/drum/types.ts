export const TRACKS = ["kick", "snare", "hats", "perc"] as const;

export type TrackId = (typeof TRACKS)[number];

export type Pattern = Record<TrackId, boolean[]>;

export const STEP_COUNT = 16;

export const TRACK_META: Record<
  TrackId,
  { label: string; short: string }
> = {
  kick: { label: "Kick", short: "KD" },
  snare: { label: "Snare", short: "SN" },
  hats: { label: "Hats", short: "HH" },
  perc: { label: "Perc", short: "PC" },
};

export function emptyTrack(): boolean[] {
  return Array.from({ length: STEP_COUNT }, () => false);
}

export function emptyPattern(): Pattern {
  return {
    kick: emptyTrack(),
    snare: emptyTrack(),
    hats: emptyTrack(),
    perc: emptyTrack(),
  };
}

export function clonePattern(pattern: Pattern): Pattern {
  return {
    kick: [...pattern.kick],
    snare: [...pattern.snare],
    hats: [...pattern.hats],
    perc: [...pattern.perc],
  };
}
