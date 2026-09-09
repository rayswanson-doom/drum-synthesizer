import { Minus, Plus, Shuffle, Square, Trash2, Volume2 } from "lucide-react";
import { PlayGlyph } from "./play-glyph";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PRESETS, type PresetId } from "@/lib/drum/patterns";
import { useDrum } from "@/lib/drum/store";
import { cn } from "@/lib/utils";

const PRESET_ORDER: PresetId[] = ["house", "boom-bap", "break", "techno"];

export function Transport() {
  const isPlaying = useDrum((s) => s.isPlaying);
  const bpm = useDrum((s) => s.bpm);
  const swing = useDrum((s) => s.swing);
  const master = useDrum((s) => s.master);
  const preset = useDrum((s) => s.preset);
  const play = useDrum((s) => s.play);
  const stop = useDrum((s) => s.stop);
  const setBpm = useDrum((s) => s.setBpm);
  const setSwing = useDrum((s) => s.setSwing);
  const setMaster = useDrum((s) => s.setMaster);
  const clear = useDrum((s) => s.clear);
  const randomize = useDrum((s) => s.randomize);
  const loadPreset = useDrum((s) => s.loadPreset);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Button
          variant="play"
          size="lg"
          onClick={() => (isPlaying ? stop() : play())}
          aria-pressed={isPlaying}
          aria-label={isPlaying ? "Stop" : "Play"}
          className="min-w-28"
        >
          <span className="relative size-4">
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-[opacity,transform,filter] duration-250 ease-in-out",
                isPlaying
                  ? "scale-25 opacity-0 blur-sm"
                  : "scale-100 opacity-100 blur-none",
              )}
            >
              <PlayGlyph className="size-4" />
            </span>
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-[opacity,transform,filter] duration-250 ease-in-out",
                isPlaying
                  ? "scale-100 opacity-100 blur-none"
                  : "scale-25 opacity-0 blur-sm",
              )}
            >
              <Square className="size-3.5 fill-current" strokeWidth={2} />
            </span>
          </span>
          <span>{isPlaying ? "Stop" : "Play"}</span>
        </Button>

        <div className="flex items-center gap-1 rounded-lg bg-well px-1 shadow-border">
          <Button
            variant="ghost"
            size="icon"
            className="size-11 text-muted"
            aria-label="Decrease tempo"
            onClick={() => setBpm(bpm - 1)}
          >
            <Minus className="size-4" />
          </Button>
          <div className="min-w-16 text-center">
            <div className="font-mono text-xl font-medium tabular-nums leading-none tracking-tight">
              {bpm}
            </div>
            <div className="mt-1 text-2xs font-medium uppercase tracking-wider text-subtle">
              BPM
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 text-muted"
            aria-label="Increase tempo"
            onClick={() => setBpm(bpm + 1)}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={randomize}
            aria-label="Randomize pattern"
          >
            <Shuffle className="size-4" />
            <span className="hidden sm:inline">Random</span>
          </Button>
          <Button variant="secondary" onClick={clear} aria-label="Clear pattern">
            <Trash2 className="size-4" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESET_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => loadPreset(id)}
            className={cn(
              "h-9 rounded-full px-3 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ease-out",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              preset === id
                ? "bg-accent text-accent-fg"
                : "bg-well text-muted shadow-border hover:text-fg hover:shadow-border-hover",
            )}
          >
            {PRESETS[id].label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-6">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="flex items-baseline justify-between text-xs font-medium text-muted">
            Tempo
            <span className="font-mono tabular-nums text-subtle">{bpm}</span>
          </span>
          <Slider
            min={60}
            max={200}
            step={1}
            value={[bpm]}
            onValueChange={([value]) => {
              if (value !== undefined) setBpm(value);
            }}
            aria-label="Tempo"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="flex items-baseline justify-between text-xs font-medium text-muted">
            Swing
            <span className="font-mono tabular-nums text-subtle">{swing}%</span>
          </span>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[swing]}
            onValueChange={([value]) => {
              if (value !== undefined) setSwing(value);
            }}
            aria-label="Swing"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="flex items-center justify-between text-xs font-medium text-muted">
            <span className="flex items-center gap-1.5">
              <Volume2 className="size-3.5" />
              Volume
            </span>
            <span className="font-mono tabular-nums text-subtle">
              {Math.round(master * 100)}
            </span>
          </span>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[master]}
            onValueChange={([value]) => {
              if (value !== undefined) setMaster(value);
            }}
            aria-label="Master volume"
          />
        </label>
      </div>
    </div>
  );
}
