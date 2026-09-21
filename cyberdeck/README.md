# CYBERDECK // TERMINAL v1.0

A futuristic sci-fi OS productivity dashboard — a task command center, focus
timer, telemetry HUD and Web Audio soundboard, wrapped in a draggable
glassmorphism window shell with a parallaxed video backdrop.

Built with **Vite**, **React 18**, **Tailwind CSS**, **Framer Motion**,
**Lucide React** and **canvas-confetti**. No backend, no API keys, no sample
files — every sound in the deck is synthesised live in the browser.

---

## Quick start

```bash
cd cyberdeck
npm install
npm run dev          # http://localhost:5173
```

| Script            | Does                                           |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | Dev server with HMR on port 5173               |
| `npm run build`   | Production bundle into `dist/`                 |
| `npm run preview` | Serve the built bundle locally                 |
| `npm run lint`    | ESLint over `src/`                             |

The deck runs fine with no configuration. Everything below is optional polish.

---

## Higgsfield backdrop

The background engine looks for operator-supplied media and falls through
three tiers, so the interface never boots onto a blank canvas:

1. **`/public/assets/background.mp4`** — a seamless looping video
2. **`/public/assets/background.jpg`** — a still frame (also the video poster)
3. **Procedural CSS gradient** — always present, no files needed

### 1. Generate the media

In [Higgsfield](https://higgsfield.ai), generate a **looping** clip or still.
Prompts that suit the deck's palette:

> *Cyberpunk megacity at night from a high rooftop, volumetric cyan and
> magenta haze, rain-slick surfaces, slow parallax drift, anamorphic bokeh,
> cinematic, 4k, seamless loop*

> *Abstract holographic data lattice, deep navy void, cyan and pink light
> trails, slow orbital rotation, dark negative space in the centre*

Two things matter far more than the subject:

- **Keep it dark and low-contrast.** The UI lives on top. Bright, busy
  footage fights every label on screen.
- **Keep the centre calm.** Detail belongs at the edges, where the vignette
  sits — not under the panels.

### 2. Place the file

Save the export to `/public/assets/`, named exactly:

```
cyberdeck/public/assets/background.mp4      # video
cyberdeck/public/assets/background.jpg      # still / poster
```

Both names are in `.gitignore` — your media stays out of the repo.

### 3. Encode for the web

A backdrop is decorative; it should not cost megabytes. Aim for **under 8 MB**,
1080p, no audio track:

```bash
ffmpeg -i source.mp4 \
  -an -movflags +faststart \
  -vf "scale=1920:-2,fps=30" \
  -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p \
  public/assets/background.mp4
```

`-an` strips audio (the deck synthesises its own), and `-movflags +faststart`
lets playback begin before the file finishes downloading.

### 4. Tune readability

Open the deck, hit the **settings gear** in the status bar, and adjust:

- **Backdrop mask** — raise it until the UI text is comfortable. This is the
  single most important control for bright media.
- **Grid overlay**, **Scanlines**, **Vignette**, **Parallax tracking** — each
  toggles independently.

`npm run dev` picks up a newly added file on reload; no config change needed.

---

## Interface

### Status bar

Live clock with a **UTC/local toggle**, a seconds pulse and a stardate strip;
simulated CPU / memory / network traces; a deck status chip; the command
palette trigger; the global sound switch; and the configuration drawer.

> Browsers expose no real CPU or network counters, so telemetry is a bounded
> random walk with occasional spikes and plateaus — plausible motion, honestly
> fake. It is shared from one source, so the status bar and the Diagnostics
> panel never disagree.

### Windows

Every widget lives in a floating frame: **drag** by the title bar, **resize**
from any edge or corner, **double-click** the title bar to maximise.

| Control | Action                                                   |
| ------- | -------------------------------------------------------- |
| ◈       | Transparency — cycles SOLID → GLASS → GHOST               |
| ▁       | Minimise — collapses to the title bar in place            |
| ⛶       | Maximise — fills the area between header and dock         |
| ✕       | Close — the panel returns to the dock, ready to restore   |

Geometry persists to `localStorage`. *Reset window layout* (settings drawer, or
the palette) restores the defaults.

Below 1024px the deck switches to a scrolling stack — panels keep their chrome
but drop their pixel geometry, because dragging positioned windows on a phone
is hostile.

### Widgets

- **Task Command** — add, inline-edit (double-click), reorder, delete and
  filter directives by `[CRITICAL]` / `[HIGH]` / `[STABLE]`, status and free
  text, each with a time estimate. Completing one fires a neon confetti burst
  anchored to the row itself plus a success arpeggio; clearing the whole queue
  escalates to a full-width celebration.
- **Neural Sync** — Pomodoro timer with an animated SVG countdown ring, tick
  bezel and a pip riding the arc head. Deep Work (25m) / Short Break (5m) /
  Long Break (15m), with Start, Pause, Skip and Reset, a four-block cycle
  tracker and optional auto-advance. The countdown derives from a wall-clock
  deadline, so a throttled background tab cannot make it drift.
- **Diagnostics** — telemetry sparklines, segmented load meters and the
  rolling deck event log.
- **Spectrum** — SVG bar analyser reading the real Web Audio analyser node when
  audio is playing, and synthesising a plausible idle waveform when it is not.
  Bar geometry is mutated directly on the SVG nodes; re-rendering 36 rects at
  45fps through React would be pure overhead.
- **Ambient Bay** — three synthesised beds with per-layer levels and a master
  bus.

### Command palette — `Ctrl+K` / `⌘K`

Fuzzy search across every panel, timer action, ambient bed, deck setting and
bookmark. Two input modes beyond plain search:

- `+ some directive` — queues that task immediately
- `react.dev` — offers to launch the URL in a new tab

`↑` `↓` navigate, `⏎` executes, `Esc` closes. Sections are ordered by match
quality, so the best hit is always the one under the cursor.

### Keyboard

| Keys              | Action                     |
| ----------------- | -------------------------- |
| `Ctrl/⌘ + K`      | Toggle the command palette |
| `Ctrl/⌘ + J`      | Cycle window focus         |
| `Ctrl/⌘ + M`      | Mute / unmute the audio bus|
| `Esc`             | Close the palette          |

---

## Audio

One shared `AudioContext` drives everything:

- **UI effects** — clicks, beeps, sweeps, confirms, arpeggios and alarms, each
  an enveloped oscillator voice.
- **Ambient beds** — *White Noise* (shelved static), *Cyber Rain* (band-passed
  noise on a wandering LFO with sparse resonant droplets) and *Deep Space Hum*
  (three detuned sub-bass partials with a breathing filter).
- **Analyser tap** — what the Spectrum widget reads.

Browsers refuse to start an `AudioContext` outside a user gesture, so the graph
is built lazily on your first click or keypress. Until then the dock reads
`AUDIO IDLE`. Nothing is downloaded — the beds are generated, so they loop
forever without seams.

---

## Architecture

```
cyberdeck/
├── public/assets/          # background.mp4 / background.jpg go here
└── src/
    ├── components/
    │   ├── BackgroundLayer.jsx   # 3-tier media + parallax + overlays
    │   ├── BootSequence.jsx      # cold-boot overlay
    │   ├── CommandPalette.jsx    # Ctrl+K quick launcher
    │   ├── Desktop.jsx           # window surface / compact fallback
    │   ├── Dock.jsx              # bottom taskbar
    │   ├── Header.jsx            # status bar + settings drawer
    │   ├── Window.jsx            # draggable, resizable frame
    │   ├── widgetRegistry.jsx    # single source of truth for widgets
    │   ├── ui/                   # NeonButton, StatGraph, Meter, Toasts
    │   └── widgets/              # the five panels
    ├── context/            # System, Telemetry, Task, Pomodoro, Window
    ├── hooks/              # storage, clock, pointer, hotkeys, drag/resize…
    ├── lib/                # audioEngine, confetti, fuzzy, cn, format
    └── styles/index.css    # Tailwind layers + neon/glass utilities
```

Adding a widget is one entry in `widgetRegistry.jsx` — the window manager, the
dock and the command palette all derive their entries from that list, so a new
panel wires itself into every surface at once.

The design system lives in `tailwind.config.js` (neon palette, glow shadows,
grid and vignette backgrounds, keyframes) and `src/styles/index.css`
(`.glass-panel`, `.btn-hud`, `.text-neon`, `.scanlines`, `.bracketed`, …).

### Persistence

`localStorage` holds deck settings, the task queue and filters, window geometry
and ambient levels. Every read and write is wrapped — a blocked or corrupt
store degrades to defaults rather than throwing.

### Motion

Panels stagger in on load, buttons scale and intensify their glow on hover, and
list items animate on add, reorder and delete.

`prefers-reduced-motion: reduce` is honoured on all three fronts, because each
needs its own handling: the stylesheet flattens CSS animations and transitions,
`<MotionConfig reducedMotion="user">` covers Framer's JS-driven motion, and
confetti opts out via `disableForReducedMotion`. The spectrum analyser keeps
animating — it is a live read-out, not decoration.

---

## Browser support

Any evergreen browser. Requires Web Audio (all modern engines), `backdrop-filter`
(the glass panels degrade to flat dark surfaces without it) and Pointer Events.
