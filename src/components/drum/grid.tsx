import { useRef, type PointerEvent } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { drumEngine } from "@/lib/drum/engine";
import { useDrum } from "@/lib/drum/store";
import { TRACK_META, TRACKS, type TrackId } from "@/lib/drum/types";
import { cn } from "@/lib/utils";

const BEATS = [0, 1, 2, 3] as const;

export function SequencerGrid() {
  const pattern = useDrum((s) => s.pattern);
  const muted = useDrum((s) => s.muted);
  const currentStep = useDrum((s) => s.currentStep);
  const isPlaying = useDrum((s) => s.isPlaying);
  const toggleStep = useDrum((s) => s.toggleStep);
  const toggleMute = useDrum((s) => s.toggleMute);
  const paint = useRef<{ track: TrackId; value: boolean } | null>(null);

  function applyPaint(track: TrackId, step: number, value: boolean) {
    if (pattern[track][step] === value) return;
    toggleStep(track, step, value);
    if (value) drumEngine.trigger(track);
  }

  function onPadPointerDown(
    event: PointerEvent<HTMLButtonElement>,
    track: TrackId,
    step: number,
  ) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const next = !pattern[track][step];
    paint.current = { track, value: next };
    applyPaint(track, step, next);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const mode = paint.current;
    if (!mode) return;
    const el = document.elementFromPoint(event.clientX, event.clientY);
    const target = el?.closest<HTMLElement>("[data-track][data-step]");
    if (!target) return;
    const track = target.dataset.track as TrackId | undefined;
    const step = Number(target.dataset.step);
    if (!track || track !== mode.track || Number.isNaN(step)) return;
    applyPaint(track, step, mode.value);
  }

  function endPaint() {
    paint.current = null;
  }

  return (
    <div
      className="flex flex-col gap-2 select-none touch-none"
      onPointerMove={onPointerMove}
      onPointerUp={endPaint}
      onPointerCancel={endPaint}
    >
      <PlayheadRow currentStep={currentStep} isPlaying={isPlaying} />
      {TRACKS.map((track) => (
        <div key={track} className="flex items-center gap-1.5 sm:gap-3">
          <div className="flex w-20 shrink-0 items-center sm:w-28">
            <button
              type="button"
              onClick={() => toggleMute(track)}
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-md text-muted transition-[color,background-color,opacity] duration-150 ease-out sm:size-11",
                "hover:bg-well hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                muted[track] && "text-fg",
              )}
              aria-pressed={muted[track]}
              aria-label={`${muted[track] ? "Unmute" : "Mute"} ${TRACK_META[track].label}`}
            >
              {muted[track] ? (
                <VolumeX className="size-3.5" strokeWidth={2} />
              ) : (
                <Volume2 className="size-3.5" strokeWidth={2} />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                drumEngine.unlock();
                drumEngine.trigger(track);
              }}
              className={cn(
                "flex h-10 min-w-0 flex-1 items-center rounded-md px-0.5 text-left text-xs font-medium text-fg transition-[opacity,background-color] duration-150 ease-out sm:h-11 sm:px-1 sm:text-sm",
                "hover:bg-well focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                muted[track] && "opacity-40",
              )}
              aria-label={`Preview ${TRACK_META[track].label}`}
            >
              <span className="sm:hidden">{TRACK_META[track].short}</span>
              <span className="hidden sm:inline">{TRACK_META[track].label}</span>
            </button>
          </div>
          <div className="flex min-w-0 flex-1 gap-1 sm:gap-1.5">
            {BEATS.map((beat) => (
              <div key={beat} className="flex min-w-0 flex-1 gap-0.5 sm:gap-1">
                {[0, 1, 2, 3].map((offset) => {
                  const step = beat * 4 + offset;
                  const on = pattern[track][step];
                  const current = isPlaying && currentStep === step;
                  return (
                    <button
                      key={step}
                      type="button"
                      data-track={track}
                      data-step={step}
                      aria-pressed={on}
                      aria-label={`${TRACK_META[track].label} step ${step + 1}`}
                      onPointerDown={(event) =>
                        onPadPointerDown(event, track, step)
                      }
                      className={cn(
                        "h-11 min-w-0 flex-1 rounded-md sm:h-14",
                        "motion-safe:transition-[background-color,box-shadow,transform] motion-safe:duration-150 motion-safe:ease-out",
                        "motion-safe:active:scale-96",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        on
                          ? "bg-accent shadow-lit"
                          : beat % 2 === 0
                            ? "bg-pad shadow-border hover:bg-well"
                            : "bg-well shadow-border hover:bg-pad",
                        current &&
                          "ring-2 ring-fg ring-offset-1 ring-offset-surface",
                        current && on && "brightness-125",
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ))}
      <StepNumbers />
    </div>
  );
}

function PlayheadRow({
  currentStep,
  isPlaying,
}: {
  currentStep: number;
  isPlaying: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-3">
      <div className="w-20 shrink-0 sm:w-28" />
      <div className="flex min-w-0 flex-1 gap-1 sm:gap-1.5">
        {BEATS.map((beat) => (
          <div key={beat} className="flex min-w-0 flex-1 gap-0.5 sm:gap-1">
            {[0, 1, 2, 3].map((offset) => {
              const step = beat * 4 + offset;
              const current = isPlaying && currentStep === step;
              const downbeat = offset === 0;
              return (
                <div
                  key={step}
                  className="flex h-2 min-w-0 flex-1 items-center"
                >
                  <span
                    className={cn(
                      "h-1 w-full rounded-full transition-[background-color,opacity] duration-150 ease-out",
                      current ? "bg-fg opacity-100" : "bg-border",
                      !current && downbeat && "opacity-80",
                      !current && !downbeat && "opacity-40",
                    )}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function StepNumbers() {
  return (
    <div className="flex items-center gap-1.5 sm:gap-3">
      <div className="w-20 shrink-0 sm:w-28" />
      <div className="flex min-w-0 flex-1 gap-1 sm:gap-1.5">
        {BEATS.map((beat) => (
          <div key={beat} className="flex min-w-0 flex-1 gap-0.5 sm:gap-1">
            {[0, 1, 2, 3].map((offset) => {
              const step = beat * 4 + offset;
              const downbeat = offset === 0;
              return (
                <div
                  key={step}
                  className={cn(
                    "min-w-0 flex-1 text-center font-mono text-2xs tabular-nums sm:text-xs",
                    downbeat ? "text-muted" : "text-subtle",
                  )}
                >
                  {step + 1}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
