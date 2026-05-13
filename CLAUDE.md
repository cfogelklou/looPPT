# CLAUDE.md — looppt (LooPPT)

Offline-first PWA that loops PowerPoint presentations on kiosk screens. 24/7 unattended operation.

## Tech Stack

- **Runtime**: Node 22 (`.nvmrc`)
- **Package Manager**: bun
- **Framework**: React 19 + TypeScript 6
- **Build**: Vite 8
- **Styling**: Tailwind CSS 4 + MUI 5 (emotion)
- **Persistence**: Dexie.js (IndexedDB)
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
  App.tsx                 # Entry: context providers, SW update checks, routes Uploader↔Player
  components/
    Player.tsx            # Core: PPTX parse/render, sliding window (prev/cur/next only), wake lock
    Uploader.tsx          # .pptx upload with quota check, stores blob to IndexedDB
    SettingsOverlay.tsx   # MUI Drawer: interval, fullscreen, storage usage
    KioskEntryOverlay.tsx # Fullscreen prompt overlay (user gesture gate)
  store/
    PlaybackContext.tsx   # useReducer state machine, auto-advance timer, debounced (500ms) persist
    DiagnosticContext.tsx # Ring buffer error logger (max 100)
    db.ts                 # Dexie schema: presentations + settings tables
  hooks/
    useWakeLock.ts        # Screen wake lock with visibility re-acquire
  test/                   # Vitest setup + smoke/integration/milestone tests
```

## Key Patterns

- **Sliding window**: Only 3 slides in DOM at once (prev/current/next) to prevent memory leaks during 24/7 playback
- **Reducer state machine**: `PlaybackContext` uses `useReducer` for predictable transitions
- **Debounced persistence**: 500ms debounce on IndexedDB writes
- **Error failover**: Render errors logged to ring buffer, playback auto-advances
- **PWA auto-update**: Hourly service worker update checks

## Testing

All DB/PPTX/navigator/PWA calls mocked in tests. 14 tests across 4 files, all passing.

```bash
bun run test:run       # Run all tests
```

## Deployment

- **Base path**: `/looppt/`
- **HTTPS required**: Wake Lock, Fullscreen API, SW all need secure context
- No CI/CD configured yet — manual build + deploy

## Tips

- **Gemini CLI for visual analysis**: Use `gemini` CLI to compare screenshots when debugging rendering issues. Example: `gemini "Compare these two screenshots and list all visual differences" --yolo`

## Documentation

PRD, milestones, and delivery summaries in `vibe-model/`.
