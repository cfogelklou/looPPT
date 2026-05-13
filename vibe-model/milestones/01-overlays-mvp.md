# Milestone 1: Overlays MVP

## Status
- State: IMPLEMENTATION
- Progress: 40%
- Started: 2026-05-13 18:52:51 UTC
- Pending Transition: IMPLEMENTATION
- Requirements Validated: 2026-05-13

## Requirements

### Functional Requirements

**R1: Animation Context**
- R1.1: A new React context (`AnimationContext`) manages overlay animation state (enabled/disabled, selected preset, size, opacity). Position is hardcoded per preset, not user-configurable in MVP.
- R1.2: AnimationContext receives `initialSettings` prop from App.tsx (same `Settings` object as PlaybackProvider), matching the existing init-then-render pattern. App.tsx calls `ensureSettings()` once, blocking render until DB read completes, then passes the result to both providers. Changes persist with 500ms debounce to the same `db.settings` record.
- R1.3: AnimationContext provides default settings that render no overlay when no user configuration exists.
- R1.4: Only one debounced persistence writer targets `db.settings` at any time — no concurrent writers to the same record. Animation state changes trigger persistence of animation fields only, without triggering re-persistence of unchanged playback state (currentSlide, interval, etc.). Design phase decides context structure (merged reducer, separate contexts with shared hook, or other).
- R1.5: AnimationContext reducer actions are explicitly typed: `{ type: 'SET_OVERLAY_ENABLED'; enabled: boolean }`, `{ type: 'SET_OVERLAY_PRESET'; preset: OverlayPreset }`, `{ type: 'SET_OVERLAY_SIZE'; size: number }`, `{ type: 'SET_OVERLAY_OPACITY'; opacity: number }`. Pattern matches existing `PlaybackAction` union type.

**R2: Database Migration**
- R2.1: Dexie schema migrates from v2 to v3, adding animation settings fields to the `settings` table: `overlayEnabled: boolean`, `overlayPreset: OverlayPreset` (union type: `'bounce' | 'fly-across' | 'pulse' | 'none'`), `overlaySize: number`, `overlayOpacity: number`. Overlay position is hardcoded per preset for MVP (no user-configurable position).
- R2.2: Existing v2 data is preserved; new fields receive sensible defaults (overlay disabled, no preset selected).
- R2.3: Migration is idempotent — running on already-migrated DB is a no-op.

**R3: Built-in SVG Overlays**
- R3.1: At least 3 built-in SVG overlay assets are included (e.g., arrow, circle highlight, star burst).
- R3.2: SVG assets are inline React components, not loaded from external URLs, to support offline PWA operation.
- R3.3: Each SVG asset has a fixed viewBox and renders at configurable size without distortion.

**R4: CSS Keyframe Presets**
- R4.1: At least 3 animation presets are defined using CSS `@keyframes`: bounce, fly-across, pulse.
- R4.2: Each preset is a named keyframe animation applicable via CSS class or inline style.
- R4.3: Animation presets loop infinitely (`animation-iteration-count: infinite`).
- R4.4: Animations use `will-change: transform, opacity` for GPU compositing.
- R4.5: Keyframe definitions live in a dedicated CSS file separate from global styles, to keep animation concerns isolated as preset count grows.

**R5: AnimationOverlay Component**
- R5.1: `AnimationOverlay` renders as an absolutely-positioned, `pointer-events: none` layer covering the entire slide area, rendered above slide content (z-index > slide content, < SettingsOverlay).
- R5.2: When overlay is disabled, `AnimationOverlay` renders nothing (returns null).
- R5.3: The selected SVG asset is rendered with the configured preset animation, size, and opacity.
- R5.4: AnimationOverlay is rendered inside `PlayerShell` as a sibling of `{children}` (not wrapping it), positioned absolutely above slides but below manual controls (z-index 5). Applies to both PDF and PPTX playback since both render as PlayerShell children.
- R5.5: AnimationOverlay is wrapped in a React ErrorBoundary that catches render errors, falls back to rendering `null`, and logs the error to DiagnosticContext. This prevents overlay bugs from crashing the entire player during 24/7 kiosk operation.
- R5.6: Z-index layer map is documented and enforced: slides (auto/0), transitions (2-4, reserved for milestone 2), overlay (5), manual controls (10), loading (20), warning (30), settings gear (50).

**R6: Settings UI — Overlay Section**
- R6.1: SettingsOverlay MUI drawer gains a new "Animation" section below the existing controls.
- R6.2: The section contains: a toggle switch for overlay enabled/disabled, a preset picker (dropdown or button group), a size slider, an opacity slider.
- R6.3: Changes to any animation setting take effect immediately on the overlay (no "apply" button needed).
- R6.4: The animation section collapses (hidden) when overlay is disabled, showing only the enable toggle. Reduces visual noise when feature is off.
- R6.5: All new animation controls include explicit `aria-label` attributes matching existing convention (`"Animation Overlay"` toggle, `"Overlay Preset"` dropdown, `"Overlay Size"` slider, `"Overlay Opacity"` slider).

### Non-Functional Requirements

**R7: Performance**
- R7.1: Overlay animation runs on the GPU compositor layer (`transform`/`opacity` only — no layout-triggering properties).
- R7.2: Overlay rendering does not cause re-layout of slide content.
- R7.3: Memory overhead of the overlay layer is under 1 MB (inline SVGs, no external assets).

**R8: Reliability**
- R8.1: Overlay errors (missing preset, bad config) are logged to DiagnosticContext ring buffer but do not crash or block playback.
- R8.2: When overlay config is corrupted in IndexedDB, the system falls back to defaults (overlay disabled) and logs a warning.
- R8.3: Overlay animation does not interfere with wake lock, fullscreen, or auto-advance timer.

**R9: Compatibility**
- R9.1: All animation features work offline (PWA constraint — no runtime network requests for assets).
- R9.2: CSS keyframes degrade gracefully on browsers that don't support `will-change` (animation still works, just not GPU-composited).
- R9.3: Touch targets in settings UI meet 44x44px minimum (existing convention).

## Design

### Architectural Decision: Separate AnimationContext

**Decision**: Separate `AnimationContext` with own `useReducer`, own debounced persistence writing only animation fields to `db.settings`.

**Rationale**: Project convention is one context per domain (`PlaybackContext`, `DiagnosticContext`). PlaybackState changes every N seconds (timer-driven `NEXT_SLIDE`); animation config changes rarely (user action). Merging into one reducer couples unrelated update frequencies and would cause the debounced persistence effect to fire on every timer tick even when only animation fields changed.

**Single-writer safety**: Dexie `update()` performs atomic partial merges on the `settings` record. PlaybackContext persistence writes `{currentSlide, interval, presentationId}`. AnimationContext persistence writes `{overlayEnabled, overlayPreset, overlaySize, overlayOpacity}`. No overlapping fields, no race conditions. Each context owns its own 500ms debounce timer.

**Invariant**: Each context owns exclusive field subsets of `db.settings`. PlaybackContext owns `{currentSlide, interval, presentationId}`. AnimationContext owns `{overlayEnabled, overlayPreset, overlaySize, overlayOpacity}`. Neither context reads or writes the other's fields. If future migrations add read-modify-write logic, this invariant must be re-evaluated.

### Type Definitions

**File**: `src/store/db.ts` — `OverlayPreset` union type lives here alongside `Settings` since it's stored in the DB.

```typescript
// src/store/db.ts additions

export type OverlayPreset = 'bounce' | 'fly-across' | 'pulse' | 'none';

export interface Settings {
  id: string;
  presentationId?: number;
  currentSlide: number;
  interval: number;
  fitMode: 'contain' | 'cover';
  overlayEnabled: boolean;
  overlayPreset: OverlayPreset;
  overlaySize: number;
  overlayOpacity: number;
}
```

**File**: `src/store/AnimationContext.tsx` — animation state and actions.

```typescript
export interface AnimationState {
  overlayEnabled: boolean;
  overlayPreset: OverlayPreset;
  overlaySize: number;
  overlayOpacity: number;
}

export type AnimationAction =
  | { type: 'SET_OVERLAY_ENABLED'; enabled: boolean }
  | { type: 'SET_OVERLAY_PRESET'; preset: OverlayPreset }
  | { type: 'SET_OVERLAY_SIZE'; size: number }
  | { type: 'SET_OVERLAY_OPACITY'; opacity: number };
```

### Database Migration (v2 → v3)

**File**: `src/store/db.ts`

```typescript
this.version(3).stores({
  presentations: '++id, name, updatedAt',
  settings: 'id'
}).upgrade(tx => {
  return tx.table('settings').toCollection().modify(s => {
    if (s.overlayEnabled === undefined) {
      s.overlayEnabled = false;
      s.overlayPreset = 'none';
      s.overlaySize = 100;
      s.overlayOpacity = 1.0;
    }
  });
});
```

`INITIAL_SETTINGS` updated with defaults: `{ overlayEnabled: false, overlayPreset: 'none', overlaySize: 100, overlayOpacity: 1.0 }`.

`ensureSettings()` unchanged — returns the full Settings record including new fields.

### Component Tree

```
App
├── DiagnosticProvider
│   └── PlaybackProvider (initialSettings)
│       └── AnimationProvider (initialSettings)  ← NEW
│           └── AppContent
│               ├── Uploader (no presentation)
│               └── Player
│                   └── PlayerShell
│                       ├── SettingsOverlay (z-50 gear icon, z-auto drawer)
│                       ├── AnimationErrorBoundary (key=overlayPreset)  ← NEW
│                       │   └── AnimationOverlay (z-5)  ← NEW
│                       ├── Loading Spinner (z-20)
│                       ├── Warning Banner (z-30)
│                       ├── {children} → slides (z-0)
│                       └── Manual Controls (z-10)
```

### Data Flow

1. **Init**: `App.tsx` calls `ensureSettings()` → blocks render until DB read completes → passes `initialSettings` to both `PlaybackProvider` and `AnimationProvider` as props.
2. **User action**: Settings UI dispatches `AnimationAction` → reducer updates `AnimationState` → 500ms debounce → `db.settings.update('current', { overlayEnabled, overlayPreset, overlaySize, overlayOpacity })`.
3. **Render**: `AnimationOverlay` reads state from `AnimationContext` → if `overlayEnabled === false`, returns `null` → else renders SVG with CSS keyframe preset, size, opacity.
4. **Error path**: AnimationOverlay render error → `AnimationErrorBoundary` catches → logs `error.message + componentStack` to `DiagnosticContext.logError()` → renders `null` fallback → playback continues unaffected.

### File Layout

```
src/
  store/
    AnimationContext.tsx    ← NEW: context, reducer, provider, useAnimation hook
    db.ts                   ← MODIFIED: OverlayPreset type, Settings fields, v3 migration
  components/
    AnimationOverlay.tsx    ← NEW: overlay rendering layer
    AnimationErrorBoundary.tsx ← NEW: error boundary for overlay
    overlays/               ← NEW: built-in SVG overlay components
      ArrowOverlay.tsx
      CircleHighlight.tsx
      StarBurst.tsx
      index.ts              ← barrel export + preset→component map
    PlayerShell.tsx          ← MODIFIED: add AnimationErrorBoundary + AnimationOverlay
    SettingsOverlay.tsx      ← MODIFIED: add Animation section
  styles/
    animations.css           ← NEW: @keyframes definitions (bounce, fly-across, pulse)
  App.tsx                    ← MODIFIED: wrap AnimationProvider inside PlaybackProvider
  index.css                  ← MODIFIED: @import "./styles/animations.css"
```

### Z-Index Layer Map

| Layer | z-index | Owner |
|-------|---------|-------|
| Slide content | auto/0 | PptxPlayer/PdfPlayer |
| Transitions (reserved) | 2–4 | Milestone 2 |
| Animation overlay | 5 | AnimationOverlay |
| Manual controls | 10 | PlayerShell |
| Loading spinner | 20 | PlayerShell |
| Warning banner | 30 | PlayerShell |
| Settings gear | 50 | SettingsOverlay |

### ErrorBoundary Design

**File**: `src/components/AnimationErrorBoundary.tsx`

```typescript
interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class AnimationErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { logError } = // accessed via static context or workaround
    logError(`AnimationOverlay: ${error.message}\n${errorInfo.componentStack}`);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
```

**DiagnosticContext integration**: Class components can't use hooks. Solution: `AnimationErrorBoundary` accepts a `fallbackRender` or accesses a module-level `logError` ref set by `DiagnosticProvider`. Simpler approach: pass `logError` as a prop from PlayerShell (which uses `useDiagnostics()` hook). Updated signature:

```typescript
interface Props {
  children: ReactNode;
  logError: (message: string) => void;
}
```

PlayerShell passes `logError` from `useDiagnostics()`.

### AnimationProvider Init Validation (T9 fix)

`AnimationProvider` validates `initialSettings.overlayPreset` before passing to reducer. Unknown preset values default to `'none'`:

```typescript
const VALID_PRESETS: OverlayPreset[] = ['bounce', 'fly-across', 'pulse', 'none'];

function sanitizeAnimationSettings(settings: Settings): AnimationState {
  const preset = VALID_PRESETS.includes(settings.overlayPreset)
    ? settings.overlayPreset
    : 'none';
  if (preset === 'none' && settings.overlayPreset !== 'none' && settings.overlayPreset !== undefined) {
    console.warn(`Invalid overlayPreset "${settings.overlayPreset}", defaulting to "none"`);
  }
  return {
    overlayEnabled: settings.overlayEnabled ?? false,
    overlayPreset: preset,
    overlaySize: settings.overlaySize ?? 100,
    overlayOpacity: settings.overlayOpacity ?? 1.0,
  };
}
```

`useReducer` initializer calls `sanitizeAnimationSettings(initialSettings)`. T9 test verifies: invalid preset → state holds `'none'`, warning logged to console (DiagnosticContext logging happens in the provider component body, not the pure init function).

### ErrorBoundary Recovery (key-based remount)

PlayerShell renders `AnimationErrorBoundary` with `key={overlayPreset}` from `useAnimation().state.overlayPreset`. When user changes preset (invalid → valid), key change forces React to unmount the errored ErrorBoundary and mount a fresh instance. No state persistence across preset changes:

```tsx
<AnimationErrorBoundary logError={logError} key={state.overlayPreset}>
  <AnimationOverlay />
</AnimationErrorBoundary>
```

This ensures transient render errors don't permanently disable overlay until page reload — matching kiosk reliability requirements.

### AnimationOverlay Component

**File**: `src/components/AnimationOverlay.tsx`

- Reads `AnimationState` from `useAnimation()` context
- If `overlayEnabled === false` or `overlayPreset === 'none'`, returns `null`
- Otherwise: renders the SVG component matching `overlayPreset` with:
  - CSS class for the keyframe animation (e.g., `animate-overlay-bounce`)
  - Inline `style={{ '--overlay-opacity': state.overlayOpacity, width: state.overlaySize, height: state.overlaySize, opacity: state.overlayOpacity } as React.CSSProperties}` — `--overlay-opacity` feeds pulse keyframe's `var()`; inline `opacity` covers bounce/fly-across
  - `will-change: transform, opacity`
  - `position: absolute`, `pointer-events: none`
- Container: `<div className="absolute inset-0 pointer-events-none z-[5]">` with SVG centered or positioned per preset

### Overlay SVG Components

Each SVG is an inline React component in `src/components/overlays/`:

- `ArrowOverlay.tsx` — directional arrow, `viewBox="0 0 100 100"`, accepts `className` prop
- `CircleHighlight.tsx` — pulsing circle highlight
- `StarBurst.tsx` — star burst shape

`overlays/index.ts` exports a `PRESET_COMPONENTS` map:
```typescript
export const PRESET_COMPONENTS: Record<Exclude<OverlayPreset, 'none'>, React.ComponentType<{ className?: string }>> = {
  'bounce': ArrowOverlay,
  'fly-across': StarBurst,
  'pulse': CircleHighlight,
};
```

Each preset is mapped to a specific SVG and a specific keyframe animation. Position is hardcoded per preset in the AnimationOverlay (e.g., bounce = centered, fly-across = bottom-left to top-right, pulse = top-right corner).

### CSS Keyframe Definitions

**File**: `src/styles/animations.css`

```css
/* Overlay animation presets */
@keyframes overlay-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

@keyframes overlay-fly-across {
  0% { transform: translate(0, 0); }
  100% { transform: translate(calc(100% - 100px), calc(-100% + 100px)); }
}

@keyframes overlay-pulse {
  0%, 100% { transform: scale(1); opacity: var(--overlay-opacity, 1); }
  50% { transform: scale(1.2); opacity: calc(var(--overlay-opacity, 1) * 0.6); }
}

.animate-overlay-bounce {
  animation: overlay-bounce 2s ease-in-out infinite;
  will-change: transform;
}

.animate-overlay-fly-across {
  animation: overlay-fly-across 8s linear infinite;
  will-change: transform;
}

.animate-overlay-pulse {
  animation: overlay-pulse 2s ease-in-out infinite;
  will-change: transform, opacity;
}
```

All animations use `transform` and `opacity` only (GPU-composited). No layout-triggering properties.

### SettingsOverlay Changes

**File**: `src/components/SettingsOverlay.tsx` — adds Animation section between Storage Usage and action buttons.

New section structure:
1. **Enable toggle** (`Switch`) — always visible. Label: "Animation Overlay". Dispatches `SET_OVERLAY_ENABLED`.
2. **Collapsible controls** — visible only when `overlayEnabled === true`:
   - Preset picker (`Select` dropdown) — options: None, Bounce, Fly Across, Pulse. Dispatches `SET_OVERLAY_PRESET`.
   - Size slider (`Slider`, 32–256, step 8). Label shows current value in px. Dispatches `SET_OVERLAY_SIZE`.
   - Opacity slider (`Slider`, 0.1–1.0, step 0.1). Label shows current value as percentage. Dispatches `SET_OVERLAY_OPACITY`.

All controls dispatch immediately — no apply button. SettingsOverlay imports `useAnimation` from `AnimationContext`.

### App.tsx Changes

Wrap `AnimationProvider` inside `PlaybackProvider`, both receive the same `initialSettings` prop:

```typescript
<DiagnosticProvider>
  <PlaybackProvider initialSettings={initialSettings}>
    <AnimationProvider initialSettings={initialSettings}>
      <AppContent />
    </AnimationProvider>
  </PlaybackProvider>
</DiagnosticProvider>
```

`AnimationProvider` nested inside `PlaybackProvider` so both are available to children. No cross-dependency between the two contexts.

## Test Specifications

### T1: Animation Context Initial State
**Given** no animation settings in IndexedDB
**When** `AnimationProvider` receives `initialSettings` with default values
**Then** `overlayEnabled === false`, `overlayPreset === 'none'`, `overlaySize === 100`, `overlayOpacity === 1.0`

### T2: Animation Context Actions
**Given** AnimationProvider with default state
**When** dispatch `SET_OVERLAY_ENABLED` with `enabled: true`
**Then** state updates to `overlayEnabled: true`, other fields unchanged
**And** after 500ms, `db.settings.get('current')` includes `overlayEnabled: true`

### T3: Persistence Single-Writer Isolation
**Given** PlaybackContext and AnimationContext both active
**When** animation state changes (SET_OVERLAY_SIZE) and playback state changes (NEXT_SLIDE) within same 500ms window
**Then** both persistence writes complete without error
**And** final `db.settings` record contains both updated fields (no field lost)

### T4: Overlay Disabled Renders Null
**Given** `overlayEnabled === false`
**When** AnimationOverlay renders
**Then** component returns `null` (no DOM output)

### T5: Overlay Enabled Renders SVG
**Given** `overlayEnabled === true`, `overlayPreset === 'bounce'`
**When** AnimationOverlay renders
**Then** DOM contains a div with `pointer-events: none` and `z-[5]`
**And** DOM contains the ArrowOverlay SVG component
**And** SVG element has CSS class `animate-overlay-bounce`

### T6: ErrorBoundary Catches Overlay Errors
**Given** AnimationOverlay renders an invalid preset that throws
**When** render error occurs
**Then** AnimationErrorBoundary catches the error
**And** calls `logError` with message containing error text and component stack
**And** renders `null` (no crash, playback continues)

### T7: DB v3 Migration Preserves Existing Data
**Given** v2 database with existing settings record `{id: 'current', currentSlide: 3, interval: 10}`
**When** database upgrades to v3
**Then** settings record retains `currentSlide: 3, interval: 10`
**And** gains `overlayEnabled: false, overlayPreset: 'none', overlaySize: 100, overlayOpacity: 1.0`

### T8: DB v3 Migration Idempotent
**Given** v3 database already has overlay fields
**When** migration runs again (e.g., page reload)
**Then** existing overlay fields unchanged (not overwritten with defaults)

### T9: Corrupted DB Settings Fallback
**Given** `db.settings.get('current')` returns record with `overlayPreset: 'invalid-value'`
**When** `ensureSettings()` returns this record as `initialSettings` to AnimationProvider
**Then** `sanitizeAnimationSettings()` rejects unknown preset, defaults state to `overlayPreset: 'none'`
**And** console warning logged: `Invalid overlayPreset "invalid-value", defaulting to "none"`
**And** AnimationOverlay renders `null` (no crash, no overlay)

### T10: Settings UI Toggle
**Given** SettingsOverlay is open, overlay disabled
**When** user toggles "Animation Overlay" switch ON
**Then** animation controls section becomes visible
**And** dispatches `SET_OVERLAY_ENABLED` with `enabled: true`

### T11: Settings UI Section Collapse
**Given** SettingsOverlay is open, overlay enabled
**When** user toggles "Animation Overlay" switch OFF
**Then** preset picker, size slider, opacity slider collapse (hidden)
**And** only the enable toggle remains visible

### T12: CSS Animations Use Only Transform/Opacity
**Given** the animations.css file
**When** all keyframe definitions are inspected
**Then** every animated property is either `transform` or `opacity` (no layout-triggering properties)

### T13: ErrorBoundary Recovery on Preset Change
**Given** AnimationOverlay rendering an invalid preset causes ErrorBoundary to show `null` fallback
**When** user changes preset to a valid value (e.g., `'bounce'`) via Settings UI
**Then** ErrorBoundary `key` prop changes → React unmounts errored instance, mounts fresh one
**And** AnimationOverlay renders the valid preset SVG successfully (no page reload needed)

## Research Notes

### Codebase Findings

**PlayerShell** (`src/components/PlayerShell.tsx`): Renders `SettingsOverlay` + `children` in `relative w-full h-full` container. Overlay layer should slot between children and SettingsOverlay. z-index order: slides (0-1) → overlay (5) → manual controls (10) → settings (50) → loading overlay (20) → warning (30).

**PptxPlayer/PdfPlayer**: Both use sliding window (3 slides max), opacity-based visibility, absolute positioning. AnimationOverlay wraps these as siblings inside PlayerShell — no changes needed inside either player.

**PlaybackContext** (`src/store/PlaybackContext.tsx`): Uses `useReducer` + 500ms debounced IndexedDB persistence. New AnimationContext should follow identical pattern for consistency.

**Database** (`src/store/db.ts`): Currently v2. Settings table has `id`, `presentationId`, `currentSlide`, `interval`, `fitMode`. New animation fields extend this table. No new table needed for MVP (built-in SVGs only, no user uploads).

**SettingsOverlay** (`src/components/SettingsOverlay.tsx`): MUI `Drawer` (anchor right, 350px). Sections: interval slider, fullscreen toggle, storage usage. New "Animation" section adds below storage usage, above action buttons.

**CSS** (`src/index.css`): Tailwind 4 import. Global dark theme. Keyframe definitions should go in this file or a dedicated `animations.css`.

### Design Constraints
- CSS-only animations (PRD: no JS animation loops) — `@keyframes` + `animation` CSS property
- Offline-first PWA — all assets must be bundled inline
- 24/7 kiosk operation — animations must not cause memory leaks over extended runtime
- Existing patterns: useReducer contexts, debounced persistence, MUI drawer settings

### Web Research Findings (2026-05-13)

**GPU-safe animation properties**: Only `transform` and `opacity` are composite-only (GPU-accelerated without triggering layout/paint). All other CSS properties force full rendering pipeline. Confirms R7.1 (transform/opacity only).

**`will-change` guidance**: Apply `will-change: transform, opacity` on overlay container. Each `will-change` element consumes GPU texture memory — avoid over-applying. For kiosk with predictable animations, permanent `will-change` is acceptable. Confirms R4.4.

**CSS transition types (for milestone 2 reference)**: Crossfade (opacity), Slide (translateX/Y), Wipe (clip-path: inset() — triggers paint, moderate perf), Dissolve (opacity + scale). All implementable with CSS-only.

**Infinite animations + memory**: CSS animations with `infinite` iteration on persistent DOM elements consume resources continuously. For kiosk: acceptable for overlay (single SVG element). Would be problematic if applied to many elements simultaneously.

**React overlay pattern**: Container div with `position: absolute`, `pointer-events: none`, high `z-index`. Use `transitionend`/`animationend` events for state cleanup. Modern CSS `@starting-style` + `transition-behavior: allow-discrete` replaces need for `react-transition-group`.

**Property safety table for 24/7 kiosk**:
- `transform` (translate, scale, rotate): Composite only — safe
- `opacity`: Composite only — safe
- `clip-path`: Paint — moderate, OK for occasional use
- `filter`: Paint — moderate, hardware-accelerated in Chrome/Safari
- `width/height/top/left`: Layout + Paint + Composite — avoid
- `background/box-shadow`: Paint + Composite — avoid for continuous use

## Implementation Notes
- 2026-05-13: DESIGN phase completed. All review findings addressed: component tree, data flow, type definitions, file layout, ErrorBoundary spec with key-based recovery, DB v3 migration, z-index map, preset validation at init, container-relative fly-across animation, test specifications (T1-T13). Context structure: separate AnimationContext with own reducer and debounced persistence. OverlayPreset type in db.ts. AnimationErrorBoundary in PlayerShell with logError prop from useDiagnostics(), key={overlayPreset} for recovery.

## Unit Test Results
*(To be filled during UNIT_TEST phase)*

## Integration Test Results
*(To be filled during INTEGRATION_TEST phase)*

## Delivery
*(PR link, to be filled during DELIVERY phase)*

## Learnings
*(Replaces memory.md — learnings from this milestone)*

- 2026-05-13: REQUIREMENTS review flagged R1.2 integration ambiguity. Resolved: AnimationContext follows same init-then-render pattern as PlaybackContext (prop-based, not self-loading). R1.2, R5.4 updated.
- 2026-05-13: Review failed during REQUIREMENTS: architecture: [MAJOR] R8.1 specifies "overlay errors do not crash or block playback" but no error boundary mechanism is required. React render errors from AnimationOverlay (e.g., unknown preset name → SVG component gets invalid props) will propagate to PlayerShell and kill the entire player. For a 24/7 kiosk, this is critical. Design should mandate an `ErrorBoundary` wrapping AnimationOverlay in PlayerShell, with fallback `render null` + log to DiagnosticContext. Null checks alone only cover known failure modes.; [MINOR] R1.2 specifies AnimationContext and PlaybackContext both persist independently to the same `db.settings` singleton via separate debounced writes. Dexie `update()` does partial merges, so data corruption is unlikely, but dual-writer to one record is a maintenance hazard. If either context later needs read-modify-write semantics (e.g., conditional updates), race conditions emerge. Consider: shared `useDebouncedSettings` hook owning all persistence, or merge animation state into PlaybackContext and rename.; [MINOR] CSS keyframe file location left ambiguous in research notes ("`index.css` or dedicated `animations.css`"). Design should specify. Recommend dedicated `src/styles/animations.css` — preset count will grow in later milestones, and separating animation concerns from global styles improves maintainability.; [MINOR] Z-index layering not documented as a design artifact. R5.4 specifies overlay at z-5, but the full stack (slides: auto, overlay: 5, controls: 10, loading: 20, warning: 30, settings: 50) only exists in research notes. Milestone 2 (transitions) adds another layer. A z-index map in the design doc would prevent conflicts across milestones.
- 2026-05-13: All 4 review findings addressed in requirements. R5.5 added (ErrorBoundary). R1.4 added (shared persistence). R4.5 added (dedicated animations.css). R5.6 added (z-index map). Requirements phase complete.
- 2026-05-13: Second review — 6 findings addressed. (1) Removed `overlayPosition` from R2.1 — hardcoded per preset for MVP. (2) R1.4 resolved: animation state merged into PlaybackContext, single writer. (3) R1.5 added: explicit reducer action types for animation. (4) R2.1 tightened `overlayPreset` to union type `OverlayPreset`. (5) R6.4 clarified: section collapses when disabled. (6) R5.6 z-index map reserves 2-4 for transitions.
- 2026-05-13: REQUIREMENTS re-validation. R1.1 fixed — removed "position" from managed state (contradicts R2.1). R1.4 rewritten — removed merged reducer mandate, replaced with behavioral constraints (single writer, selective persistence). R4.5 softened — removed specific file path, kept isolation requirement. Design phase must address: context structure (merged vs separate), ErrorBoundary spec, DB v3 upgrade body, OverlayPreset type location, test specifications.
- 2026-05-13: Review failed during REQUIREMENTS: code: [MAJOR] R6.2 missing overlayPosition control. R2.1 defines `overlayPosition: string` as a DB field, but R6.2 Settings UI lists only toggle, preset picker, size slider, opacity slider. No position picker specified. Either remove `overlayPosition` from R2.1 (hardcode for MVP) or add position control to R6.2.; [MAJOR] R1.4 persistence mechanism is undecided. Lists two alternatives ("`useDebouncedSettings` hook or merged into PlaybackContext") but commits to neither. This is an architectural decision that blocks design and implementation. Pick one. Merging into PlaybackContext is simpler (single writer, single debounce timer, existing pattern) — recommend that approach and update R1.4 accordingly.; [MINOR] AnimationContext reducer actions not specified. PlaybackContext defines explicit `PlaybackAction` union type (lines 14-22 of `PlaybackContext.tsx`). AnimationContext should define equivalent action types in requirements for parity and implementation clarity.; [MINOR] R2.1 types `overlayPreset` as `string`. Should be a union of valid preset names (`'bounce' | 'fly-across' | 'pulse' | 'none'`) matching R4.1 presets. Prevents invalid preset names at compile time.; [MINOR] R6.4 ambiguous — "hidden or visually distinct when overlay is disabled." Pick one: collapsed (hidden) or greyed-out (visually distinct). Current wording lets two implementations pass review.; [MINOR] R5.6 z-index map has no explicit slot for milestone 2 transitions. Research note acknowledges transitions "layer between slides and overlay" but z-index map jumps from 0 to 5 with no reserved range. Add note: z-index 2-4 reserved for transitions.
- 2026-05-13: Review failed during REQUIREMENTS: architecture: [MAJOR] Design section empty. Milestone in DESIGN state but `## Design` says "To be filled during DESIGN phase." Requirements embed implementation details (z-index values, reducer actions, component hierarchy) but no formal design exists. Cannot verify data flow, component tree, type definitions, or integration points.; [MAJOR] R1.4 merged reducer breaks separation of concerns. Animation config (enabled/preset/size/opacity) is user-tweaked configuration — changes rarely. Playback state (currentSlide/isPlaying) changes every N seconds on timer tick. Merging into one `useReducer` means every animation dispatch triggers the debounced persistence effect for ALL state, including unchanged slide index. Project convention is one context per domain (`PlaybackContext`, `DiagnosticContext`). Recommend: separate `AnimationContext` with own reducer, shared `useDebouncedSettings` hook for single-writer persistence.; [MINOR] R1.4 "AnimationContext wraps the same reducer" is self-contradictory. If animation state lives in `PlaybackContext`, `AnimationContext` adds unnecessary indirection — consumers just call `usePlayback()` for everything. If `AnimationContext` exists for ergonomics, it reads from `PlaybackContext`, creating a coupling layer. Pick one: expand PlaybackContext (rename if needed) OR separate context. Current wording tries both.; [MINOR] R5.5 ErrorBoundary undesigned. Requirement mandates ErrorBoundary wrapping AnimationOverlay with DiagnosticContext logging, but no design for the component (file location, props interface, fallback behavior). Should specify `src/components/AnimationErrorBoundary.tsx` or similar.; [MINOR] R2.1-R2.3 migration upgrade callback not specified. Existing v1→v2 uses `.upgrade(tx => tx.table().toCollection().modify(...))` pattern (db.ts:34-37). Design should specify equivalent v3 upgrade logic: defaulting new fields on existing settings record.
- 2026-05-13: Review failed during REQUIREMENTS: architecture: [BLOCKER] Design section empty. Milestone state is DESIGN but `## Design` says "To be filled during DESIGN phase." No component tree, data flow, type definitions, file layout, or integration points. Architecture review has nothing to evaluate. Must produce actual design before proceeding.; [MAJOR] R1.4 merged reducer creates domain coupling. PlaybackState changes every N seconds (timer-driven `NEXT_SLIDE`); animation config changes rarely (user action). Merging into one `useReducer` means:; [MAJOR] ErrorBoundary (R5.5) undesigned. Requirement mandates `ErrorBoundary` wrapping `AnimationOverlay` with `DiagnosticContext` logging, but no spec exists for: file location, props interface, error recovery behavior, or integration point in `PlayerShell`. Also: `DiagnosticContext.logError()` accepts strings, but React error boundaries catch `Error` objects. Design must specify conversion strategy (e.g., `error.message` + component stack).; [MINOR] DB v3 upgrade callback unspecified. Existing v1→v2 pattern at `db.ts:34-37` uses `.upgrade(tx => tx.table().toCollection().modify(...))`. R2.3 requires idempotent migration but no design for the v3 upgrade function body. Should specify: `tx.table('settings').get('current')` → modify with default overlay fields if absent.; [MINOR] `OverlayPreset` type location unspecified. R1.5 references it in action types, R2.1 defines it as union `'bounce' | 'fly-across' | 'pulse' | 'none'`. Unclear whether it lives in `db.ts` (with `Settings`), `PlaybackContext.tsx` (with actions), or a new shared types file. Design should specify.; [MINOR] Test Specifications section empty. Design phase should produce test specs that verify architecture decisions (e.g., animation context isolation, persistence single-writer guarantee, ErrorBoundary fallback behavior).
- 2026-05-13: Review failed during REQUIREMENTS: architecture: [BLOCKER] Design section empty. Milestone in DESIGN state after three prior reviews flagged this. Requirements are mature. No component tree, data flow, type definitions, file layout, or integration points documented. Nothing to validate architecture against.; [MAJOR] Persistence strategy for merged state underspecified. R1.4 mandates single writer for animation+playback state. Current persistence effect (`PlaybackContext.tsx:97-115`) deps are `[state.currentSlide, state.interval, state.presentationId]`. Design must specify: updated deps array including animation fields, expanded `db.settings.update()` call, and animation defaults in `INITIAL_SETTINGS` / `ensureSettings()`.; [MAJOR] ErrorBoundary (R5.5) undesigned. No file location, props interface, or PlayerShell integration point. `DiagnosticContext.logError()` accepts `string` (`DiagnosticContext.tsx:14`), but React error boundaries catch `Error` objects. Must specify conversion: `error.message` + component stack → string for ring buffer.; [MINOR] DB v3 upgrade callback body unspecified. Existing v2 pattern at `db.ts:34-37` uses `.upgrade(tx => tx.table().toCollection().modify(...))`. Design should specify v3 equivalent: default overlay fields on existing 'current' record if absent.; [MINOR] `OverlayPreset` type location unspecified. Referenced in R1.5 actions and R2.1 Settings type. Should live alongside `Settings` in `db.ts` or a dedicated shared types file.; [MINOR] Test Specifications section empty. Design phase should produce specs verifying: persistence single-writer guarantee, ErrorBoundary fallback, idempotent DB migration, overlay disabled renders null.
- 2026-05-13: Review failed during REQUIREMENTS: architecture: ```
VERDICT: FAIL
```
- 2026-05-13: Review failed during REQUIREMENTS: architecture: ```
VERDICT: FAIL
```
- 2026-05-13: Review failed during REQUIREMENTS: architecture: ```
VERDICT: FAIL
```
- 2026-05-13: Review failed during REQUIREMENTS: architecture: ```
VERDICT: FAIL
```
- 2026-05-13: Review failed during REQUIREMENTS: ux: ```
VERDICT: FAIL
```
- 2026-05-13: Review failed during REQUIREMENTS: testability: ```
VERDICT: FAIL
```
- 2026-05-13: Review failed during REQUIREMENTS: architecture: [MAJOR] T9 validation gap unresolved. Design specifies no sanitization of `overlayPreset` from DB in `AnimationProvider` init. `PRESET_COMPONENTS` map lookup on `'invalid-value'` returns `undefined` → render throws → ErrorBoundary catches (correct fallback) but T9 expects graceful `'none'` fallback + warning log, not error boundary path. Either: (a) validate preset in AnimationProvider init against known values, default unknown to `'none'`, log warning; or (b) update T9 to match actual behavior (ErrorBoundary catch). Design as written makes T9 unimplementable.; [MINOR] `fly-across` keyframe uses `100vw`/`100vh` viewport units (`animations.css` lines 5-6). Inside `position: absolute` container, these resolve to viewport dimensions, not parent container. In windowed mode, overlay flies beyond slide area. Acceptable for kiosk (fullscreen) but inconsistent with R5.1 "covers the entire slide area." Consider `calc(100% - 100px)` for container-relative animation.; [MINOR] ErrorBoundary has no recovery path. Once `hasError: true`, overlay renders `null` permanently. If user changes preset from invalid→valid via settings, ErrorBoundary state persists. For 24/7 kiosk, transient errors permanently disable overlay until page reload. Fix: add `key` prop tied to `overlayPreset` on ErrorBoundary to force remount on setting change.; [MINOR] Dual-writer to `db.settings` record (PlaybackContext + AnimationContext each with own 500ms debounce). Dexie `Table.update()` does atomic partial merge via `Object.assign`, so non-overlapping fields won't corrupt. But if future migration adds read-modify-write logic (e.g., conditional field updates), race window opens. Design acknowledges this risk. Acceptable for MVP, but consider documenting the invariant: "each context owns exclusive field subsets."
- 2026-05-13: Review failed during REQUIREMENTS: architecture: ```
VERDICT: FAIL
```
- 2026-05-13: Review failed during DESIGN: code: ```
VERDICT: FAIL

## Findings

- **[BLOCKER]** Zero implementation exists. Milestone state is IMPLEMENTATION (40% progress), but none of the new files are created:
  - `src/store/AnimationContext.tsx` — missing
  - `src/components/AnimationOverlay.tsx` — missing
  - `src/components/AnimationErrorBoundary.tsx` — missing
  - `src/components/overlays/` directory — missing (ArrowOverlay, CircleHighlight, StarBurst, index.ts)
  - `src/styles/animations.css` — missing
  - No modifications to `db.ts`

## Findings

- **[RESOLVED]** R6.5 — aria-label requirement added for all new animation controls.
- **[RESOLVED]** R1.2 init flow — AnimationContext uses same prop-based pattern as PlaybackContext.
- **[RESOLVED]** R5.4 overlay is sibling of children in PlayerShell, not wrapping.
- **[RESOLVED]** R2.1 fields added to INITIAL_SETTINGS with defaults.
- **[RESOLVED]** Pulse opacity bug — AnimationOverlay sets `--overlay-opacity` CSS variable for pulse keyframe.
- **[RESOLVED]** T9 validation gap — `sanitizeAnimationSettings()` validates `overlayPreset` at AnimationProvider init, defaults unknown to `'none'`, logs console warning.
- **[RESOLVED]** `fly-across` viewport units — changed from `100vw`/`100vh` to `100%` for container-relative animation (consistent with R5.1).
- **[RESOLVED]** ErrorBoundary recovery — `key={overlayPreset}` on ErrorBoundary forces remount when user changes preset, prevents permanent null state.
- **[RESOLVED]** Dual-writer invariant — documented exclusive field subsets per context.