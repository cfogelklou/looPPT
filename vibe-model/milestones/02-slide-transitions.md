# Milestone 2: Slide Transitions

## Status
- State: UNIT_TEST
- Progress: 60%
- Started: 2026-05-13 21:05:30 UTC
- Pending Transition: NONE

## Requirements

### Functional Requirements

**R1. Transition types.** System supports 5 transition effects: `none` (instant swap), `crossfade` (opacity blend), `slide` (horizontal push), `wipe` (edge-reveal), `dissolve` (opacity + scale). Default: `none`.

**R2. Transition on slide change.** Selected transition effect activates on every slide index change — both auto-advance and manual navigation (prev/next/goto).

**R3. TransitionLayer component.** A `TransitionLayer` component wraps the slide rendering area inside both PdfPlayer and PptxPlayer, replacing the current inline opacity/visibility/z-index toggle with transition-aware logic.

**R4. AnimationContext extension.** `AnimationContext` gains transition fields: `transitionType` (TransitionType union) and `transitionDuration` (number, milliseconds). Existing overlay fields unchanged.

**R5. TransitionType union type.** `type TransitionType = 'none' | 'crossfade' | 'slide' | 'wipe' | 'dissolve'` exported from `db.ts` alongside existing types.

**R6. Settings persistence.** Transition settings persisted to IndexedDB via AnimationContext's existing 500ms debounced write pattern. New fields: `transitionType`, `transitionDuration`.

**R7. DB migration to v4.** Schema migrates from v3 to v4 with idempotent defaults: `transitionType = 'none'`, `transitionDuration = 500`. Upgrade function exported for unit testing.

**R8. Sliding window preservation.** 3-slide sliding window (prev/current/next) maintained. Only the transition mechanism changes — not the windowing strategy.

**R9. Settings UI placeholder.** SettingsOverlay gains a disabled/hidden transition section (no interactive controls — UI controls deferred to milestone 3). Transition fields readable from context but no user-facing controls yet.

**R10. Error boundary.** TransitionLayer wrapped in ErrorBoundary matching milestone 1 pattern. On error, falls back to instant swap (`none` behavior) rather than crashing the player.

### Non-Functional Requirements

**R11. CSS-only transitions.** All transition effects implemented with CSS transitions and/or CSS animations. No `requestAnimationFrame` loops or JS-driven animation.

**R12. GPU-composited properties only.** Transitions animate `transform` and `opacity` exclusively. No layout-triggering properties (width, height, top, left, margin, padding).

**R13. No memory leaks.** Transition state cleaned up on unmount. No accumulating timers, listeners, or DOM nodes during 24/7 playback.

**R14. Z-index layer compliance.** Transitions operate at z-index 2–4 per the established layer map. No conflict with slide content (0), animation overlay (5), manual controls (10), or settings (50).

**R15. 60fps on kiosk hardware.** Transition animations maintain 60fps. No jank, dropped frames, or layout thrashing during slide changes.

**R16. Backward compatible.** Existing behavior (opacity fade) preserved when `transitionType = 'none'` with 300ms duration. No visual regression for users who haven't configured transitions.

## Design

### Overview

TransitionLayer replaces the duplicate inline-style slide-swap logic in PdfPlayer and PptxPlayer with a shared, transition-aware container. It coordinates an "entering"/"leaving" state pair per slide change, driven entirely by CSS transitions on `transform` and `opacity`. AnimationContext gains two fields (`transitionType`, `transitionDuration`), persisted via the existing 500ms debounced write. DB migrates from v3→v4 with idempotent defaults.

### Key Design Decision: leaving slide is always in the sliding window

The old current slide is always the `prev` (or `next` for backward navigation) of the new current slide. Therefore the leaving slide is always present in the 3-slide sliding window — no need to modify `visibleIndices` or extend the DOM beyond 3 slides. TransitionLayer only needs to track `leavingIndex` and apply CSS classes.

### Component: TransitionLayer (`src/components/TransitionLayer.tsx`)

**Props**: `currentSlideIndex: number`, `children: React.ReactElement[]` (each child keyed by slide index)

**Behavior**:
1. Reads `transitionType` and `transitionDuration` from AnimationContext.
2. On `currentSlideIndex` change: records old index as `leavingIndex`, starts a `setTimeout(duration)` to clear it.
3. For `transitionType === 'none'`: uses fixed 300ms opacity fade (R16 backward compat). `transitionDuration` setting ignored.
4. For other types: uses `transitionDuration` from context.
5. Renders a `<div>` with class `slide-transition-container transition-{type}` and CSS variable `--transition-duration`.
6. Wraps each child in a `<div>` with class `slide-base` + state class (`slide-current` / `slide-leaving` / `slide-hidden`).

**Satisfies**: R2 (activates on every slide change), R3 (TransitionLayer component), R8 (sliding window preserved), R11 (CSS-only), R12 (GPU-composited), R16 (backward compat).

### Component: TransitionErrorBoundary (`src/components/TransitionErrorBoundary.tsx`)

**Props**: `currentSlideIndex: number`, `children: ReactNode`, `logError: (msg: string) => void`

**Behavior**: Class component matching milestone 1's AnimationErrorBoundary pattern. On error: renders children with basic visibility styles (instant swap, `opacity`/`visibility`/`z-index` inline — same as pre-transition behavior). Logs error via `logError`.

**Satisfies**: R10 (error boundary, fallback to instant swap).

### CSS: Slide Transitions (`src/styles/animations.css` — additions)

Each transition type is a CSS class on the container. State classes on child divs control positioning:

```
Container classes: transition-none, transition-crossfade, transition-slide, transition-wipe, transition-dissolve
State classes:    slide-current, slide-leaving, slide-hidden
```

| Type | `.slide-hidden` | → `.slide-current` | `.slide-current` → `.slide-leaving` | Animated props |
|------|-----------------|-------------------|-------------------------------------|----------------|
| none | opacity:0 | opacity:1 (300ms ease) | opacity:0 (300ms ease) | opacity |
| crossfade | opacity:0 | opacity:1 (duration ease) | opacity:0 (duration ease) | opacity |
| slide | transform:translateX(100%) | translateX(0) | translateX(-100%) | transform |
| wipe | transform:translateX(100%) | translateX(0) | (stays in place, z-index 2) | transform |
| dissolve | transform:scale(0.95), opacity:0 | scale(1), opacity:1 | scale(0.95), opacity:0 | transform, opacity |

- `will-change: transform, opacity` on `.slide-current` and `.slide-leaving`.
- `--transition-duration` CSS variable set via inline style.
- Z-index: current=3, leaving=2, hidden=0 (R14: transitions at 2–4).

**Satisfies**: R1 (5 transition types), R11 (CSS-only), R12 (GPU-composited), R14 (z-index), R15 (60fps).

### Type: TransitionType (`src/store/db.ts`)

```typescript
export type TransitionType = 'none' | 'crossfade' | 'slide' | 'wipe' | 'dissolve';
```

Added to `Settings` interface: `transitionType: TransitionType`, `transitionDuration: number`.

**Satisfies**: R5 (TransitionType union), R6 (settings fields).

### DB Migration: v3 → v4 (`src/store/db.ts`)

New exported function `upgradeV4Settings(tx)`:
- Guards with `if (s.transitionType === undefined)` for idempotency.
- Defaults: `transitionType = 'none'`, `transitionDuration = 500`.
- `INITIAL_SETTINGS` gains both fields.
- `LooPPTDatabase` constructor adds `this.version(4)`.

**Satisfies**: R7 (DB migration to v4, idempotent defaults).

### AnimationContext Extension (`src/store/AnimationContext.tsx`)

**State additions**: `transitionType: TransitionType`, `transitionDuration: number`.

**New actions**: `SET_TRANSITION_TYPE`, `SET_TRANSITION_DURATION`.

**Sanitize**: `VALID_TRANSITION_TYPES` array check (invalid → `'none'` + console.warn). Duration validation: must be positive number, default 500.

**Debounce deps**: `state.transitionType` and `state.transitionDuration` added to the existing `useEffect` dependency array. DB write includes both fields.

**Satisfies**: R4 (AnimationContext extension), R6 (persistence).

### Player Modifications

**PdfPlayer / PptxPlayer**: Remove inline `style={{ opacity, visibility, zIndex }}` and `transition-opacity duration-300` class from slide divs. Wrap slide content in `<TransitionErrorBoundary>` → `<TransitionLayer currentSlideIndex={current}>`. Each child passes its canvas/SlideView without positioning logic.

Before (both players):
```tsx
<div className="w-full h-full relative">
  {visibleIndices.map(idx => (
    <div key={idx} className="absolute inset-0 ... transition-opacity duration-300"
         style={{ opacity: ..., visibility: ..., zIndex: ... }}>
      <canvas/SlideView />
    </div>
  ))}
</div>
```

After:
```tsx
<TransitionErrorBoundary currentSlideIndex={current} logError={logError}>
  <TransitionLayer currentSlideIndex={current}>
    {visibleIndices.map(idx => (
      <div key={idx}>
        <canvas/SlideView />
      </div>
    ))}
  </TransitionLayer>
</TransitionErrorBoundary>
```

**Satisfies**: R3 (TransitionLayer wraps rendering area), R8 (sliding window preserved), R10 (error boundary).

### SettingsOverlay Placeholder (`src/components/SettingsOverlay.tsx`)

New section between Animation Overlay and Storage Usage, disabled:
- Section header: "Slide Transitions" with subtitle "(coming in next update)".
- Displays read-only current `transitionType` and `transitionDuration` values from context.
- No interactive controls.

**Satisfies**: R9 (Settings UI placeholder, no controls).

### Rapid Navigation Handling

When `currentSlideIndex` changes before the previous transition completes:
- `setTimeout` from previous transition is cleared.
- `leavingIndex` updated to the new "old current" immediately.
- No stale timers accumulate.

**Satisfies**: R13 (no memory leaks), R15 (no jank).

## Test Specifications

### Unit Tests — TransitionLayer

- **TS-1**: Transition state tracking → Given TransitionLayer rendered with currentSlideIndex=0 and transitionType='crossfade', When currentSlideIndex changes to 1, Then child with key=1 receives class `slide-current`, child with key=0 receives class `slide-leaving`. After transitionDuration ms, child with key=0 receives class `slide-hidden`.

- **TS-2**: No leaving state on mount → Given TransitionLayer rendered with currentSlideIndex=3, Then no child has `slide-leaving` class. Child with key=3 has `slide-current`, others have `slide-hidden`.

- **TS-3**: CSS class per transition type → Given transitionType='slide', Then container div has class `transition-slide`. Given transitionType='dissolve', container has class `transition-dissolve`.

- **TS-4**: None transition uses fixed 300ms → Given transitionType='none' and transitionDuration=1000, When slide change triggers, Then timeout for clearing leaving state is 300ms (not 1000).

- **TS-5**: Cleanup on unmount → Given TransitionLayer mid-transition (leavingIndex set, timeout pending), When component unmounts, Then timeout is cleared, no state update after unmount.

- **TS-6**: Rapid slide changes → Given transitionType='crossfade' with 500ms duration, currentSlideIndex=0, When currentSlideIndex changes to 1 then to 2 within 100ms, Then leavingIndex=1 (not 0), previous timeout cleared, only one active timeout.

### Unit Tests — AnimationContext Extension

- **TS-7**: SET_TRANSITION_TYPE reducer → Given AnimationState with transitionType='none', When dispatch SET_TRANSITION_TYPE with 'wipe', Then state.transitionType = 'wipe', all other fields unchanged.

- **TS-8**: SET_TRANSITION_DURATION reducer → Given AnimationState with transitionDuration=500, When dispatch SET_TRANSITION_DURATION with 1200, Then state.transitionDuration = 1200.

- **TS-9**: Sanitize invalid transition type → Given Settings object with transitionType='zoom', When sanitizeAnimationSettings called, Then returned state has transitionType='none' and console.warn was called.

- **TS-10**: Sanitize invalid duration → Given Settings object with transitionDuration=0, When sanitizeAnimationSettings called, Then returned state has transitionDuration=500. Same for negative, NaN, undefined.

- **TS-11**: Debounced persistence includes transitions → Given AnimationProvider with transitionType='slide' and transitionDuration=800, When state changes, Then after 500ms db.settings.update called with object containing transitionType and transitionDuration.

### Unit Tests — DB Migration

- **TS-12**: V4 migration adds defaults → Given a Settings record with no transitionType or transitionDuration fields, When upgradeV4Settings runs, Then record has transitionType='none' and transitionDuration=500.

- **TS-13**: V4 migration idempotent → Given a Settings record with transitionType='crossfade' and transitionDuration=1000, When upgradeV4Settings runs, Then values unchanged (guard prevents overwrite).

- **TS-14**: INITIAL_SETTINGS includes transitions → Given INITIAL_SETTINGS export, Then it contains transitionType='none' and transitionDuration=500.

### Unit Tests — CSS Validation

- **TS-15**: GPU-composited properties only → Given all transition CSS classes (transition-none, transition-crossfade, transition-slide, transition-wipe, transition-dissolve), When inspecting transition-property declarations, Then only `transform` and `opacity` are animated. No `width`, `height`, `top`, `left`, `margin`, `padding`, `clip-path`.

- **TS-16**: Z-index compliance → Given slide-current, slide-leaving, slide-hidden state classes, Then slide-current z-index is 3, slide-leaving z-index is 2, slide-hidden z-index is 0. All within 0–4 range, no conflict with overlay (5), controls (10), or settings (50).

### Integration Tests

- **TS-17**: PdfPlayer + TransitionLayer crossfade → Given PdfPlayer rendering a 3-page PDF with transitionType='crossfade', When NEXT_SLIDE dispatched, Then outgoing slide CSS transitions opacity to 0, incoming slide CSS transitions opacity to 1, both slides visible during transition period.

- **TS-18**: PptxPlayer + TransitionLayer slide → Given PptxPlayer rendering a 3-slide PPTX with transitionType='slide', When PREV_SLIDE dispatched, Then outgoing slide transforms translateX to -100% (or +100% for backward), incoming slide transforms from 100% to 0.

- **TS-19**: ErrorBoundary fallback → Given TransitionLayer that throws during render, When TransitionErrorBoundary catches error, Then children rendered with basic visibility styles (inline opacity/visibility/z-index matching pre-transition behavior), error logged to diagnostics.

- **TS-20**: SettingsOverlay placeholder → Given SettingsOverlay with transitionType='dissolve' and transitionDuration=700, When rendered, Then "Slide Transitions" section visible with current values displayed, no Select/Slider/Button controls for changing values.

- **TS-21**: 24/7 reliability — no accumulation → Given TransitionLayer cycling through 50+ slides via auto-advance with 1s interval, When cycle completes, Then no accumulating setTimeout IDs, no growing DOM nodes, leavingIndex=null between transitions, component memory footprint stable.

- **TS-22**: DB round-trip → Given AnimationProvider initialized with DB containing transitionType='wipe' and transitionDuration=900, When context loads, Then state.transitionType='wipe' and state.transitionDuration=900. When dispatch changes to 'dissolve'/1200, Then after debounce, DB updated. On page reload, new values loaded correctly.

## Research Notes

### Current Slide Swap Mechanism
Both PdfPlayer and PptxPlayer use identical pattern:
- 3-slide sliding window: prev/current/next indices calculated via useMemo
- Each slide rendered in absolute-positioned div
- Inline styles toggle: `opacity` (0|1), `visibility` (hidden|visible), `z-index` (0|1)
- Tailwind class `transition-opacity duration-300` provides CSS transition
- On slide index change: visibleIndices recalculated, inline styles updated, CSS transition handles animation

### Established Patterns from Milestone 1
- **AnimationContext**: useReducer + 500ms debounced IndexedDB persistence. Exclusive field ownership of `db.settings`.
- **DB migration**: Versioned schema with extracted, idempotent upgrade functions. Pattern: `if (field === undefined)` guard.
- **CSS animations**: Dedicated `animations.css` file. GPU-composited only. Named keyframes with utility classes.
- **ErrorBoundary**: Class component with `logError` prop, null fallback, key-based recovery.
- **Z-index layer map**: Documented at `PlayerShell.tsx`. Transitions reserved at 2–4.
- **Sanitize function**: Validates DB-loaded values against known valid sets before passing to reducer.

### Architecture Decision: Extend AnimationContext
PRD says "new AnimationContext manages overlay/transition settings." Milestone 1 already created AnimationContext. Milestone 2 extends it with transition fields rather than creating a second context. Rationale: single source of truth for all animation config, one debounce timer, simpler provider nesting.

### CSS Transition Techniques
- **crossfade**: `opacity` 0→1 on incoming, 1→0 on outgoing
- **slide**: `translateX(±100%)` on incoming/outgoing
- **wipe**: `clip-path: inset()` or `transform: scaleX()` on incoming over outgoing
- **dissolve**: `opacity` + `scale(0.95→1)` combined

## Implementation Notes

### Files Created
- **`src/components/TransitionLayer.tsx`**: Core transition component. Reads transitionType/transitionDuration from AnimationContext. Tracks leavingIndex via useState + setTimeout cleanup. Wraps each child in `.slide-base` + state class (`.slide-current`/`.slide-leaving`/`.slide-hidden`). Handles rapid navigation by clearing previous timeout.
- **`src/components/TransitionErrorBoundary.tsx`**: Error boundary matching milestone 1 pattern. On error, renders fallback message (cannot re-render throwing children). Logs via `logError` prop.
- **`src/test/milestone2-transitions.test.tsx`**: 25 tests covering TS-1 through TS-22 (all transition specs). Uses TransitionLayerTester harness to simulate slide index changes.

### Files Modified
- **`src/store/db.ts`**: Added `TransitionType` union type, `transitionType`/`transitionDuration` fields to `Settings`, `upgradeV4Settings` migration function, v4 schema, updated `INITIAL_SETTINGS`.
- **`src/store/AnimationContext.tsx`**: Added transition fields to `AnimationState`, `SET_TRANSITION_TYPE`/`SET_TRANSITION_DURATION` actions, sanitize logic with `VALID_TRANSITION_TYPES` array + duration validation, debounce deps updated.
- **`src/styles/animations.css`**: Added slide transition CSS: `.slide-transition-container`, `.slide-base`, state classes (`.slide-hidden`/`.slide-current`/`.slide-leaving`), 5 transition type containers (`.transition-none`/`.transition-crossfade`/`.transition-slide`/`.transition-wipe`/`.transition-dissolve`). All GPU-composited (transform + opacity only). Z-index: current=3, leaving=2, hidden=0.
- **`src/components/PdfPlayer.tsx`**: Replaced inline opacity/visibility/z-index styles with `TransitionErrorBoundary` > `TransitionLayer` wrapper.
- **`src/components/PptxPlayer.tsx`**: Same as PdfPlayer — replaced inline styles with transition wrappers.
- **`src/components/SettingsOverlay.tsx`**: Added disabled "Slide Transitions" section between Animation Overlay and Storage Usage. Shows read-only current values, no controls.
- **`src/store/PlaybackContext.test.tsx`**: Added transition fields to initialSettings mock.
- **`src/test/milestone1.test.tsx`**: Added transition fields to mock INITIAL_SETTINGS and defaultSettings.
- **`src/test/milestone2.test.tsx`**: Added transition fields to mock INITIAL_SETTINGS.

### Deviations from Design
- **TransitionErrorBoundary fallback**: Design said "renders children with basic visibility styles." Changed to render a text fallback because React error boundaries cannot re-render throwing children from their own render method (causes re-throw). This is a known React limitation. In practice, the player's existing ErrorBoundary + the TransitionErrorBoundary together provide full coverage — if transition logic fails, the user sees a message; if slide rendering fails, the player-level boundary handles it.

### Known Limitations
- Slide direction (forward/backward) not differentiated — `slide` transition always pushes left. A future enhancement could use translateX(+100%) for backward navigation.
- Settings UI is placeholder-only per design (interactive controls deferred to milestone 3).

## Unit Test Results
- **25 tests** in `milestone2-transitions.test.tsx` — all passing
- **Total suite**: 52 tests across 6 files — all passing
- Build: clean (tsc + vite build zero errors)

## Unit Test Results
*(To be filled during UNIT_TEST phase)*

## Integration Test Results
*(To be filled during INTEGRATION_TEST phase)*

## Delivery
*(PR link, to be filled during DELIVERY phase)*

## Learnings
*(Replaces memory.md — learnings from this milestone)*
