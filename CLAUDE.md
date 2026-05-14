# CLAUDE.md — looppt (LooPPT)

Offline-first PWA that loops PDF and PowerPoint presentations on kiosk screens. 24/7 unattended operation.

## Tech Stack

- **Runtime**: Node 22 (`.nvmrc`)
- **Package Manager**: bun
- **Framework**: React 19 + TypeScript 6
- **Build**: Vite 8
- **Styling**: Tailwind CSS 4 + MUI 5 (emotion)
- **Persistence**: Dexie.js (IndexedDB) — DB currently at v6 with migrations
- **PDF Rendering**: `pdfjs-dist`
- **PPTX Rendering**: `@kandiforge/pptx-renderer`
- **Testing**: Vitest + React Testing Library + jsdom
- **PWA**: `vite-plugin-pwa` (auto-update, standalone)

## Commands

```bash
bun install          # Install deps
bun run dev          # Dev server
bun run build        # Production build (tsc + vite)
bun run lint         # ESLint
bun run test         # Vitest watch mode
bun run test:run     # Vitest single run
bun run preview      # Preview production build
```

## Architecture

```
src/
  main.tsx                # DOM mount, React.StrictMode
  App.tsx                 # Providers (Diagnostic→Playback→Animation), SW update, Uploader↔Player routing
  index.css               # Tailwind imports, dark theme, full-viewport kiosk styles
  components/
    Player.tsx            # Routes to PdfPlayer or PptxPlayer based on file type, wake lock
    PlayerShell.tsx       # Shared wrapper: error/loading states, manual controls, settings gear
    PdfPlayer.tsx         # PDF canvas rendering via pdfjs-dist, sliding window (prev/cur/next)
    PptxPlayer.tsx        # PPTX rendering via @kandiforge/pptx-renderer, sliding window
    Uploader.tsx          # File upload (.pdf/.pptx), drag-drop, quota check, blob→IndexedDB
    SettingsOverlay.tsx   # MUI Drawer: interval, fullscreen, transitions, overlays, upload, storage
    AnimationOverlay.tsx  # Renders SVG overlays with CSS animations, custom uploads via blob URL
    TransitionLayer.tsx   # Slide transitions (crossfade/slide/wipe/dissolve), CSS-only
    AnimationErrorBoundary.tsx  # Error boundary for AnimationOverlay, logs to diagnostics
    TransitionErrorBoundary.tsx # Error boundary for TransitionLayer, fallback to instant swap
    overlays/
      index.ts            # Preset registry, component mapping, metadata
      ArrowOverlay.tsx    # Bounce preset — gradient arrow SVG
      CircleHighlight.tsx # Pulse preset — concentric circles SVG
      StarBurst.tsx       # Fly-across preset — star shape SVG
  store/
    PlaybackContext.tsx   # useReducer state machine, auto-advance timer, debounced (500ms) persist
    AnimationContext.tsx  # Overlay + transition state, sanitizer for invalid settings, debounced persist
    DiagnosticContext.tsx # Ring buffer error logger (max 100)
    db.ts                 # Dexie schema (v6): presentations, settings, overlays tables + migrations
  hooks/
    useWakeLock.ts        # Screen wake lock with visibility re-acquire
  styles/
    animations.css        # Keyframe overlays (bounce/fly-across/pulse), slide transitions, GPU-only
  test/
    setup.ts              # jsdom, pdfjs-dist mock (no DOMMatrix in jsdom), cleanup
    smoke.test.tsx        # Basic rendering, file type validation
    integration.test.tsx  # Upload→playback→navigation flow, quota errors
    milestone1.test.tsx   # Overlay MVP: context, error boundaries, DB migration, CSS animations
    milestone2.test.tsx   # Production kiosk: persistence, auto-resume, wake lock, sliding window
    milestone2-transitions.test.tsx  # All 5 transition types, rapid changes, cleanup
    milestone3.test.tsx   # Settings UI: transition controls, overlay grid, uploads, speed
  store/
    PlaybackContext.test.tsx  # Playback context unit: auto-advance, timer reset on navigation
```

## Key Patterns

- **Sliding window**: Only 3 slides in DOM at once (prev/current/next) to prevent memory leaks during 24/7 playback
- **Triple context**: Diagnostic → Playback → Animation, each with own reducer and debounced persistence
- **Debounced persistence**: 500ms debounce on all IndexedDB writes (single-writer invariant)
- **Error failover**: Error boundaries log to ring buffer, degrade gracefully (skip overlay/instant swap)
- **PWA auto-update**: Hourly service worker update checks
- **CSS-only animations**: GPU-composited properties only (transform, opacity) — no JS animation loops
- **Custom overlay format**: `custom:<id>` string preserves type union, rendered via blob URL with cleanup

## Z-Index Layer Map

| Layer | Z-Index | Component |
|-------|---------|-----------|
| Slides | 0 | PdfPlayer, PptxPlayer |
| Transitions | 2-4 | TransitionLayer |
| Overlay | 5 | AnimationOverlay |
| Controls | 10 | PlayerShell manual controls |
| Loading | 20 | Loading spinner |
| Warning | 30 | Error/warning banners |
| Settings | 50 | SettingsOverlay MUI Drawer |

## DB Schema (Dexie v6)

Tables: `presentations`, `settings`, `overlays`

Migrations v1→v6 add fields incrementally. All migrations are idempotent — safe to re-run. `ensureSettings()` initializes defaults on first load.

## Supported File Formats

- **PDF** — Canvas rendering via pdfjs-dist, viewport scaling preserves aspect ratio
- **PPTX** — Experimental, via @kandiforge/pptx-renderer (shows warning banner)

## Testing

All DB/PDF/PPTX/navigator/PWA calls mocked in tests. 74 tests across 8 files.

```bash
bun run test:run       # Run all tests (single run)
bun run test           # Vitest watch mode
```

Key mock: pdfjs-dist requires fake viewport/render in jsdom (no DOMMatrix). See `src/test/setup.ts`.

## Deployment

- **Base path**: `/looppt/`
- **HTTPS required**: Wake Lock, Fullscreen API, SW all need secure context
- No CI/CD configured yet — manual build + deploy

## Pre-existing errors

- There is no such thing as "pre-existing" errors. Merges are never allowed with errors in CI, so errors in any branch MUST be considered "yours to fix." Take ownership!

## Tips

- **Gemini CLI for visual analysis**: Use `gemini` CLI to compare screenshots when debugging rendering issues. Example: `gemini "Compare these two screenshots and list all visual differences" --yolo`

## vibe-model workflow notes

- This app lives inside a monorepo. When using `vibe-model`, always target this app explicitly:
  ```bash
  ~/.bin/vibe-model --project-dir /Volumes/Projects/dev/applicaudia_web/looPPT "your goal"
  ```
- Use `~/.bin/vibe-model`, not `~/bin/vibe-model`.
- The local `vibe-model` source repo is at:
  - `/Volumes/Projects/dev/vibe_apps/vibe-model`
- After fixing `vibe-model` source, rebuild and reinstall the binary with:
  ```bash
  cd /Volumes/Projects/dev/vibe_apps/vibe-model
  bun test
  bun run build
  cp bin/vibe-model ~/.bin/vibe-model
  ```
- Long autonomous runs in this project may be monitored with:
  - `.vibe-model-watch.sh`
  - `.vibe-model-watchdog.sh`
- If the watchdog restarts a run, inspect forensic bundles under `_watchdog/stuck-*/` before deleting anything.
- Detailed local operating notes live in:
  - `LooPPT-vibe-model-use.md`

## Documentation

- PRD, milestones, and delivery summaries live in `vibe-model/`.
- Local `vibe-model` operating procedure lives in `LooPPT-vibe-model-use.md`.
