import { i as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, o as require_react } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { a as Square, c as Minus, i as Trash2, n as Volume2, o as Shuffle, s as Plus, t as VolumeX } from "../_libs/lucide-react.mjs";
import { t as create } from "../_libs/zustand.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { i as SliderTrack, n as SliderRange, r as SliderThumb, t as Slider$1 } from "../_libs/@radix-ui/react-slider+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DgdOykKK.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var TRACKS = [
	"kick",
	"snare",
	"hats",
	"perc"
];
var TRACK_META = {
	kick: {
		label: "Kick",
		short: "KD"
	},
	snare: {
		label: "Snare",
		short: "SN"
	},
	hats: {
		label: "Hats",
		short: "HH"
	},
	perc: {
		label: "Perc",
		short: "PC"
	}
};
function emptyTrack() {
	return Array.from({ length: 16 }, () => false);
}
function emptyPattern() {
	return {
		kick: emptyTrack(),
		snare: emptyTrack(),
		hats: emptyTrack(),
		perc: emptyTrack()
	};
}
function clonePattern(pattern) {
	return {
		kick: [...pattern.kick],
		snare: [...pattern.snare],
		hats: [...pattern.hats],
		perc: [...pattern.perc]
	};
}
var LOOKAHEAD_MS = 25;
var SCHEDULE_AHEAD = .12;
var TRACK_GAIN = {
	kick: 1,
	snare: .72,
	hats: .42,
	perc: .55
};
function createAudioContext() {
	const w = globalThis;
	const Ctor = w.AudioContext ?? w.webkitAudioContext;
	if (!Ctor) throw new Error("Web Audio is not supported in this browser");
	return new Ctor({ latencyHint: "interactive" });
}
var DrumEngine = class {
	ctx = null;
	master = null;
	noise = null;
	hooks = null;
	timer = null;
	raf = 0;
	nextNoteTime = 0;
	step = 0;
	visuals = [];
	voices = [];
	playing = false;
	attach(hooks) {
		this.hooks = hooks;
	}
	unlock() {
		const ctx = this.ensureContext();
		if (ctx.state === "suspended") ctx.resume();
		return ctx;
	}
	setMaster(value) {
		if (!this.master || !this.ctx) return;
		const gain = Math.max(0, Math.min(1, value)) ** 2;
		this.master.gain.setTargetAtTime(gain, this.ctx.currentTime, .03);
	}
	trigger(track, velocity = 1) {
		const ctx = this.unlock();
		this.voice(track, ctx.currentTime, velocity);
	}
	start() {
		const ctx = this.unlock();
		if (this.playing) return;
		this.playing = true;
		this.step = 0;
		this.visuals = [];
		this.nextNoteTime = ctx.currentTime + .04;
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
		for (const node of this.voices) try {
			node.stop(now);
		} catch {}
		this.voices = [];
		this.hooks?.onStep(-1);
	}
	ensureContext() {
		if (this.ctx) return this.ctx;
		const ctx = createAudioContext();
		const master = ctx.createGain();
		master.gain.value = (this.hooks?.getMaster() ?? .85) ** 2;
		const compressor = ctx.createDynamicsCompressor();
		compressor.threshold.value = -18;
		compressor.knee.value = 8;
		compressor.ratio.value = 4;
		compressor.attack.value = .003;
		compressor.release.value = .12;
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
	schedule() {
		const ctx = this.ctx;
		const hooks = this.hooks;
		if (!ctx || !hooks || !this.playing) return;
		const stepDur = 60 / Math.max(40, Math.min(220, hooks.getBpm())) / 4;
		const swing = Math.max(0, Math.min(1, hooks.getSwing() / 100));
		while (this.nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
			const step = this.step;
			const when = this.nextNoteTime + (step % 2 === 1 ? swing * stepDur * .5 : 0);
			this.visuals.push({
				step,
				time: when
			});
			this.scheduleHits(step, when);
			this.nextNoteTime += stepDur;
			this.step = (this.step + 1) % 16;
		}
	}
	scheduleHits(step, when) {
		const hooks = this.hooks;
		if (!hooks) return;
		const pattern = hooks.getPattern();
		const muted = hooks.getMuted();
		for (const track of TRACKS) {
			if (muted[track] || !pattern[track][step]) continue;
			const velocity = .88 + Math.random() * .12;
			this.voice(track, when, velocity);
		}
	}
	flushVisuals = () => {
		const ctx = this.ctx;
		if (!this.playing || !ctx) return;
		const now = ctx.currentTime;
		while (this.visuals.length && this.visuals[0].time <= now) {
			const event = this.visuals.shift();
			if (event) this.hooks?.onStep(event.step);
		}
		this.raf = requestAnimationFrame(this.flushVisuals);
	};
	voice(track, time, velocity) {
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
			case "perc": this.perc(ctx, dest, time, level);
		}
	}
	kick(ctx, dest, time, level) {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(168, time);
		osc.frequency.exponentialRampToValueAtTime(42, time + .07);
		gain.gain.setValueAtTime(1e-4, time);
		gain.gain.exponentialRampToValueAtTime(level, time + .004);
		gain.gain.exponentialRampToValueAtTime(1e-4, time + .42);
		osc.connect(gain).connect(dest);
		osc.start(time);
		osc.stop(time + .46);
		this.track(osc);
		const click = ctx.createOscillator();
		const clickGain = ctx.createGain();
		click.type = "square";
		click.frequency.setValueAtTime(48, time);
		clickGain.gain.setValueAtTime(level * .22, time);
		clickGain.gain.exponentialRampToValueAtTime(1e-4, time + .03);
		click.connect(clickGain).connect(dest);
		click.start(time);
		click.stop(time + .04);
		this.track(click);
	}
	snare(ctx, dest, time, level) {
		const body = ctx.createOscillator();
		const bodyGain = ctx.createGain();
		body.type = "triangle";
		body.frequency.setValueAtTime(186, time);
		body.frequency.exponentialRampToValueAtTime(140, time + .08);
		bodyGain.gain.setValueAtTime(level * .45, time);
		bodyGain.gain.exponentialRampToValueAtTime(1e-4, time + .16);
		body.connect(bodyGain).connect(dest);
		body.start(time);
		body.stop(time + .18);
		this.track(body);
		const src = ctx.createBufferSource();
		src.buffer = this.noise;
		const filter = ctx.createBiquadFilter();
		filter.type = "highpass";
		filter.frequency.value = 1400;
		const snap = ctx.createGain();
		snap.gain.setValueAtTime(level * .7, time);
		snap.gain.exponentialRampToValueAtTime(1e-4, time + .14);
		src.connect(filter).connect(snap).connect(dest);
		src.start(time);
		src.stop(time + .16);
		this.track(src);
	}
	hat(ctx, dest, time, level) {
		const src = ctx.createBufferSource();
		src.buffer = this.noise;
		src.playbackRate.value = .96 + Math.random() * .1;
		const hp = ctx.createBiquadFilter();
		hp.type = "highpass";
		hp.frequency.value = 7200;
		const bp = ctx.createBiquadFilter();
		bp.type = "bandpass";
		bp.frequency.value = 9500;
		bp.Q.value = .8;
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(level, time);
		gain.gain.exponentialRampToValueAtTime(1e-4, time + .045);
		src.connect(hp).connect(bp).connect(gain).connect(dest);
		src.start(time);
		src.stop(time + .06);
		this.track(src);
	}
	perc(ctx, dest, time, level) {
		for (const freq of [845, 1280]) {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "square";
			osc.frequency.setValueAtTime(freq, time);
			gain.gain.setValueAtTime(level * .16, time);
			gain.gain.exponentialRampToValueAtTime(1e-4, time + .07);
			osc.connect(gain).connect(dest);
			osc.start(time);
			osc.stop(time + .09);
			this.track(osc);
		}
		const src = ctx.createBufferSource();
		src.buffer = this.noise;
		const hp = ctx.createBiquadFilter();
		hp.type = "highpass";
		hp.frequency.value = 4e3;
		const tick = ctx.createGain();
		tick.gain.setValueAtTime(level * .28, time);
		tick.gain.exponentialRampToValueAtTime(1e-4, time + .03);
		src.connect(hp).connect(tick).connect(dest);
		src.start(time);
		src.stop(time + .04);
		this.track(src);
	}
	track(node) {
		this.voices.push(node);
		node.onended = () => {
			this.voices = this.voices.filter((n) => n !== node);
		};
	}
};
function makeNoiseBuffer(ctx) {
	const length = Math.floor(ctx.sampleRate * .8);
	const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
	return buffer;
}
var drumEngine = new DrumEngine();
/** `x` = hit, `-` = rest. Spaces ignored. Must be 16 steps. */
function steps(seq) {
	const cells = seq.replace(/\s+/g, "").split("");
	if (cells.length !== 16) throw new Error(`Pattern must have 16 steps, got ${cells.length}`);
	return cells.map((c) => c === "x" || c === "X");
}
var PRESETS = {
	house: {
		label: "House",
		pattern: {
			kick: steps("x--- x--- x--- x---"),
			snare: steps("---- x--- ---- x---"),
			hats: steps("x-x- x-x- x-x- x-x-"),
			perc: steps("--x- ---- --x- --x-")
		}
	},
	"boom-bap": {
		label: "Boom-bap",
		pattern: {
			kick: steps("x--x ---- x-x- ----"),
			snare: steps("---- x--- ---- x---"),
			hats: steps("x-x- x-x- x-xx x-x-"),
			perc: steps("---- --x- ---- --x-")
		}
	},
	break: {
		label: "Break",
		pattern: {
			kick: steps("x--x --x- --x- ----"),
			snare: steps("--x- x--x --x- x-x-"),
			hats: steps("--x- --x- --x- --x-"),
			perc: steps("x--- ---- ---- x-x-")
		}
	},
	techno: {
		label: "Techno",
		pattern: {
			kick: steps("x--- x--- x--- x---"),
			snare: steps("---- ---- x--- ----"),
			hats: steps("--x- --x- --x- --x-"),
			perc: steps("---- --x- ---- x--x")
		}
	}
};
var DEFAULT_PRESET = "house";
function defaultPattern() {
	return clonePattern(PRESETS[DEFAULT_PRESET].pattern);
}
function randomPattern() {
	const next = emptyPattern();
	for (let i = 0; i < 16; i++) {
		const onBeat = i % 4 === 0;
		const onSnare = i === 4 || i === 12;
		next.kick[i] = Math.random() < (onBeat ? .72 : .12);
		next.snare[i] = Math.random() < (onSnare ? .9 : .08);
		next.hats[i] = Math.random() < .55;
		next.perc[i] = Math.random() < .18;
	}
	if (!next.kick.some(Boolean)) next.kick[0] = true;
	if (!next.snare.some(Boolean)) next.snare[4] = true;
	return next;
}
var STORAGE_KEY = "lane-drum-v1";
var silentMuted = () => ({
	kick: false,
	snare: false,
	hats: false,
	perc: false
});
var useDrum = create((set, get) => ({
	pattern: defaultPattern(),
	bpm: 120,
	swing: 8,
	master: .85,
	muted: silentMuted(),
	isPlaying: false,
	currentStep: -1,
	preset: DEFAULT_PRESET,
	toggleStep: (track, step, value) => {
		const pattern = clonePattern(get().pattern);
		pattern[track][step] = value ?? !pattern[track][step];
		set({
			pattern,
			preset: null
		});
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
		set({ muted: {
			...get().muted,
			[track]: !get().muted[track]
		} });
	},
	play: () => {
		bindEngine(get, set);
		drumEngine.start();
		set({ isPlaying: true });
	},
	stop: () => {
		drumEngine.stop();
		set({
			isPlaying: false,
			currentStep: -1
		});
	},
	togglePlay: () => {
		if (get().isPlaying) get().stop();
		else get().play();
	},
	clear: () => {
		set({
			pattern: emptyPattern(),
			preset: null
		});
		persist(get());
	},
	randomize: () => {
		set({
			pattern: randomPattern(),
			preset: null
		});
		persist(get());
	},
	loadPreset: (id) => {
		set({
			pattern: clonePattern(PRESETS[id].pattern),
			preset: id
		});
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
			preset: saved.preset
		});
		drumEngine.setMaster(saved.master);
	}
}));
function bindEngine(get, set) {
	drumEngine.attach({
		getPattern: () => get().pattern,
		getBpm: () => get().bpm,
		getSwing: () => get().swing,
		getMuted: () => get().muted,
		getMaster: () => get().master,
		onStep: (step) => set({ currentStep: step })
	});
}
function persist(state) {
	if (typeof window === "undefined") return;
	const payload = {
		pattern: state.pattern,
		bpm: state.bpm,
		swing: state.swing,
		master: state.master,
		preset: state.preset
	};
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
	} catch {}
}
function readPersisted() {
	if (typeof window === "undefined") return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const data = JSON.parse(raw);
		if (!data.pattern) return null;
		const pattern = emptyPattern();
		for (const track of TRACKS) {
			const row = data.pattern[track];
			if (!Array.isArray(row) || row.length !== 16) return null;
			pattern[track] = row.map(Boolean);
		}
		const preset = data.preset && data.preset in PRESETS ? data.preset : null;
		return {
			pattern,
			bpm: clampNum(data.bpm, 60, 200, 120),
			swing: clampNum(data.swing, 0, 100, 8),
			master: clampNum(data.master, 0, 1, .85),
			preset
		};
	} catch {
		return null;
	}
}
function clampNum(value, min, max, fallback) {
	return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var BEATS = [
	0,
	1,
	2,
	3
];
function SequencerGrid() {
	const pattern = useDrum((s) => s.pattern);
	const muted = useDrum((s) => s.muted);
	const currentStep = useDrum((s) => s.currentStep);
	const isPlaying = useDrum((s) => s.isPlaying);
	const toggleStep = useDrum((s) => s.toggleStep);
	const toggleMute = useDrum((s) => s.toggleMute);
	const paint = (0, import_react.useRef)(null);
	function applyPaint(track, step, value) {
		if (pattern[track][step] === value) return;
		toggleStep(track, step, value);
		if (value) drumEngine.trigger(track);
	}
	function onPadPointerDown(event, track, step) {
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		const next = !pattern[track][step];
		paint.current = {
			track,
			value: next
		};
		applyPaint(track, step, next);
	}
	function onPointerMove(event) {
		const mode = paint.current;
		if (!mode) return;
		const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-track][data-step]");
		if (!target) return;
		const track = target.dataset.track;
		const step = Number(target.dataset.step);
		if (!track || track !== mode.track || Number.isNaN(step)) return;
		applyPaint(track, step, mode.value);
	}
	function endPaint() {
		paint.current = null;
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-2 select-none touch-none",
		onPointerMove,
		onPointerUp: endPaint,
		onPointerCancel: endPaint,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayheadRow, {
				currentStep,
				isPlaying
			}),
			TRACKS.map((track) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1.5 sm:gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex w-20 shrink-0 items-center sm:w-28",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => toggleMute(track),
						className: cn("flex size-10 shrink-0 items-center justify-center rounded-md text-muted transition-[color,background-color,opacity] duration-150 ease-out sm:size-11", "hover:bg-well hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", muted[track] && "text-fg"),
						"aria-pressed": muted[track],
						"aria-label": `${muted[track] ? "Unmute" : "Mute"} ${TRACK_META[track].label}`,
						children: muted[track] ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, {
							className: "size-3.5",
							strokeWidth: 2
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, {
							className: "size-3.5",
							strokeWidth: 2
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => {
							drumEngine.unlock();
							drumEngine.trigger(track);
						},
						className: cn("flex h-10 min-w-0 flex-1 items-center rounded-md px-0.5 text-left text-xs font-medium text-fg transition-[opacity,background-color] duration-150 ease-out sm:h-11 sm:px-1 sm:text-sm", "hover:bg-well focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", muted[track] && "opacity-40"),
						"aria-label": `Preview ${TRACK_META[track].label}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "sm:hidden",
							children: TRACK_META[track].short
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "hidden sm:inline",
							children: TRACK_META[track].label
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex min-w-0 flex-1 gap-1 sm:gap-1.5",
					children: BEATS.map((beat) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex min-w-0 flex-1 gap-0.5 sm:gap-1",
						children: [
							0,
							1,
							2,
							3
						].map((offset) => {
							const step = beat * 4 + offset;
							const on = pattern[track][step];
							const current = isPlaying && currentStep === step;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"data-track": track,
								"data-step": step,
								"aria-pressed": on,
								"aria-label": `${TRACK_META[track].label} step ${step + 1}`,
								onPointerDown: (event) => onPadPointerDown(event, track, step),
								className: cn("h-11 min-w-0 flex-1 rounded-md sm:h-14", "motion-safe:transition-[background-color,box-shadow,transform] motion-safe:duration-150 motion-safe:ease-out", "motion-safe:active:scale-96", "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", on ? "bg-accent shadow-lit" : beat % 2 === 0 ? "bg-pad shadow-border hover:bg-well" : "bg-well shadow-border hover:bg-pad", current && "ring-2 ring-fg ring-offset-1 ring-offset-surface", current && on && "brightness-125")
							}, step);
						})
					}, beat))
				})]
			}, track)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepNumbers, {})
		]
	});
}
function PlayheadRow({ currentStep, isPlaying }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-1.5 sm:gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-20 shrink-0 sm:w-28" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex min-w-0 flex-1 gap-1 sm:gap-1.5",
			children: BEATS.map((beat) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex min-w-0 flex-1 gap-0.5 sm:gap-1",
				children: [
					0,
					1,
					2,
					3
				].map((offset) => {
					const step = beat * 4 + offset;
					const current = isPlaying && currentStep === step;
					const downbeat = offset === 0;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex h-2 min-w-0 flex-1 items-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("h-1 w-full rounded-full transition-[background-color,opacity] duration-150 ease-out", current ? "bg-fg opacity-100" : "bg-border", !current && downbeat && "opacity-80", !current && !downbeat && "opacity-40") })
					}, step);
				})
			}, beat))
		})]
	});
}
function StepNumbers() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-1.5 sm:gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-20 shrink-0 sm:w-28" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex min-w-0 flex-1 gap-1 sm:gap-1.5",
			children: BEATS.map((beat) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex min-w-0 flex-1 gap-0.5 sm:gap-1",
				children: [
					0,
					1,
					2,
					3
				].map((offset) => {
					const step = beat * 4 + offset;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: cn("min-w-0 flex-1 text-center font-mono text-2xs tabular-nums sm:text-xs", offset === 0 ? "text-muted" : "text-subtle"),
						children: step + 1
					}, step);
				})
			}, beat))
		})]
	});
}
function PlayGlyph({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		viewBox: "0 0 24 24",
		className,
		fill: "currentColor",
		"aria-hidden": "true",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 6.8v10.4c0 .7.8 1.1 1.4.7l8.2-5.2c.6-.4.6-1.2 0-1.6L10.4 6.1c-.6-.4-1.4 0-1.4.7Z" })
	});
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[background-color,color,box-shadow,transform,opacity] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 motion-safe:active:not-disabled:scale-96 select-none", {
	variants: {
		variant: {
			default: "bg-accent text-accent-fg hover:bg-fg",
			secondary: "bg-well text-fg shadow-border hover:shadow-border-hover hover:bg-pad",
			ghost: "text-muted hover:text-fg hover:bg-well",
			play: "bg-accent text-accent-fg hover:bg-fg min-w-28"
		},
		size: {
			default: "h-11 px-4 text-sm",
			sm: "h-9 px-3 text-sm",
			lg: "h-12 px-5 text-sm",
			icon: "size-11"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = (0, import_react.forwardRef)(function Button({ className, variant, size, type = "button", ...props }, ref) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		ref,
		type,
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
});
function Slider({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Slider$1, {
		className: cn("relative flex h-11 w-full touch-none items-center select-none", className),
		...props,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderTrack, {
			className: "relative h-1.5 w-full grow overflow-hidden rounded-full bg-well",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderRange, { className: "absolute h-full bg-accent" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderThumb, {
			className: "block size-4 rounded-full bg-fg shadow-border transition-[box-shadow] duration-150 ease-out hover:shadow-border-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
			"aria-label": props["aria-label"]
		})]
	});
}
var PRESET_ORDER = [
	"house",
	"boom-bap",
	"break",
	"techno"
];
function Transport() {
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2 sm:gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "play",
						size: "lg",
						onClick: () => isPlaying ? stop() : play(),
						"aria-pressed": isPlaying,
						"aria-label": isPlaying ? "Stop" : "Play",
						className: "min-w-28",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "relative size-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: cn("absolute inset-0 flex items-center justify-center transition-[opacity,transform,filter] duration-250 ease-in-out", isPlaying ? "scale-25 opacity-0 blur-sm" : "scale-100 opacity-100 blur-none"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayGlyph, { className: "size-4" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: cn("absolute inset-0 flex items-center justify-center transition-[opacity,transform,filter] duration-250 ease-in-out", isPlaying ? "scale-100 opacity-100 blur-none" : "scale-25 opacity-0 blur-sm"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, {
									className: "size-3.5 fill-current",
									strokeWidth: 2
								})
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isPlaying ? "Stop" : "Play" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1 rounded-lg bg-well px-1 shadow-border",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon",
								className: "size-11 text-muted",
								"aria-label": "Decrease tempo",
								onClick: () => setBpm(bpm - 1),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "size-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-16 text-center",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-mono text-xl font-medium tabular-nums leading-none tracking-tight",
									children: bpm
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1 text-2xs font-medium uppercase tracking-wider text-subtle",
									children: "BPM"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon",
								className: "size-11 text-muted",
								"aria-label": "Increase tempo",
								onClick: () => setBpm(bpm + 1),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" })
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ml-auto flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "secondary",
							onClick: randomize,
							"aria-label": "Randomize pattern",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shuffle, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hidden sm:inline",
								children: "Random"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "secondary",
							onClick: clear,
							"aria-label": "Clear pattern",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hidden sm:inline",
								children: "Clear"
							})]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-1.5",
				children: PRESET_ORDER.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => loadPreset(id),
					className: cn("h-9 rounded-full px-3 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ease-out", "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", preset === id ? "bg-accent text-accent-fg" : "bg-well text-muted shadow-border hover:text-fg hover:shadow-border-hover"),
					children: PRESETS[id].label
				}, id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 sm:grid-cols-3 sm:gap-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex min-w-0 flex-col gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-baseline justify-between text-xs font-medium text-muted",
							children: ["Tempo", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono tabular-nums text-subtle",
								children: bpm
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							min: 60,
							max: 200,
							step: 1,
							value: [bpm],
							onValueChange: ([value]) => {
								if (value !== void 0) setBpm(value);
							},
							"aria-label": "Tempo"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex min-w-0 flex-col gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-baseline justify-between text-xs font-medium text-muted",
							children: ["Swing", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono tabular-nums text-subtle",
								children: [swing, "%"]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							min: 0,
							max: 100,
							step: 1,
							value: [swing],
							onValueChange: ([value]) => {
								if (value !== void 0) setSwing(value);
							},
							"aria-label": "Swing"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex min-w-0 flex-col gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-center justify-between text-xs font-medium text-muted",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-3.5" }), "Volume"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono tabular-nums text-subtle",
								children: Math.round(master * 100)
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							min: 0,
							max: 1,
							step: .01,
							value: [master],
							onValueChange: ([value]) => {
								if (value !== void 0) setMaster(value);
							},
							"aria-label": "Master volume"
						})]
					})
				]
			})
		]
	});
}
function DrumMachine() {
	const hydrate = useDrum((s) => s.hydrate);
	const togglePlay = useDrum((s) => s.togglePlay);
	const randomize = useDrum((s) => s.randomize);
	const clear = useDrum((s) => s.clear);
	const isPlaying = useDrum((s) => s.isPlaying);
	(0, import_react.useEffect)(() => {
		hydrate();
	}, [hydrate]);
	(0, import_react.useEffect)(() => {
		function onKey(event) {
			const tag = event.target?.tagName;
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
	}, [
		togglePlay,
		randomize,
		clear
	]);
	(0, import_react.useEffect)(() => {
		function onVis() {
			if (document.visibilityState === "visible") drumEngine.unlock();
		}
		document.addEventListener("visibilitychange", onVis);
		return () => document.removeEventListener("visibilitychange", onVis);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "min-h-dvh bg-bg px-4 py-6 text-fg sm:px-6 sm:py-10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex w-full max-w-5xl flex-col gap-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "flex items-end justify-between gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium uppercase tracking-kicker text-subtle",
							children: "Drum machine"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-3xl font-medium tracking-tight text-fg sm:text-4xl",
							children: "LANE"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "max-w-xs text-right text-sm leading-snug text-muted",
						children: "Sixteen steps. Four lanes. Tap a pad, then play."
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
					className: "rounded-3xl bg-surface p-4 shadow-border sm:p-5",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-5 rounded-2xl",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Transport, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-px bg-border" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SequencerGrid, {})
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
					className: "flex flex-col gap-1 text-xs leading-relaxed text-subtle sm:flex-row sm:items-center sm:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Space plays. Drag across a lane to paint. Mute with the speaker." }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "tabular-nums",
						children: [isPlaying ? "Running" : "Stopped", " · R random · C clear"]
					})]
				})
			]
		})
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrumMachine, {});
}
//#endregion
export { Home as component };
