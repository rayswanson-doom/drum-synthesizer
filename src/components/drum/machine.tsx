import { useEffect } from "react";
import { SequencerGrid } from "./grid";
import { Transport } from "./transport";
import { drumEngine } from "@/lib/drum/engine";
import { useDrum } from "@/lib/drum/store";

export function DrumMachine() {
  const hydrate = useDrum((s) => s.hydrate);
  const togglePlay = useDrum((s) => s.togglePlay);
  const randomize = useDrum((s) => s.randomize);
  const clear = useDrum((s) => s.clear);
  const isPlaying = useDrum((s) => s.isPlaying);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.code === "Space") {
        if (tag === "BUTTON") return;
        event.preventDefault();
        togglePlay();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        randomize();
      }
      if (event.key === "c" || event.key === "C") {
        event.preventDefault();
        clear();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, randomize, clear]);

  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "visible") drumEngine.unlock();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <main className="min-h-dvh bg-bg px-4 py-6 text-fg sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-kicker text-subtle">
              Drum machine
            </p>
            <h1 className="text-3xl font-medium tracking-tight text-fg sm:text-4xl">
              LANE
            </h1>
          </div>
          <p className="max-w-xs text-right text-sm leading-snug text-muted">
            Sixteen steps. Four lanes. Tap a pad, then play.
          </p>
        </header>

        <section className="rounded-3xl bg-surface p-4 shadow-border sm:p-5">
          <div className="flex flex-col gap-5 rounded-2xl">
            <Transport />
            <div className="h-px bg-border" />
            <SequencerGrid />
          </div>
        </section>

        <footer className="flex flex-col gap-1 text-xs leading-relaxed text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            Space plays. Drag across a lane to paint. Mute with the speaker.
          </p>
          <p className="tabular-nums">
            {isPlaying ? "Running" : "Stopped"} · R random · C clear
          </p>
        </footer>
      </div>
    </main>
  );
}
