# Milestone 1: Overlays MVP

## Status
- State: DESIGN
- Progress: 20%
- Started: 2026-05-13 18:52:51 UTC
- Pending Transition: NONE

## Requirements

### Functional Requirements

**R1: Animation Context**
- R1.1: A new React context (`AnimationContext`) manages overlay animation state (enabled/disabled, selected preset, position, size, opacity).
- R1.2: AnimationContext receives `initialSettings` prop from App.tsx (same `Settings` object as PlaybackProvider), matching the existing init-then-render pattern. App.tsx calls `ensureSettings()` once, blocking render until DB read completes, then passes the result to both providers. Changes persist with 500ms debounce to the same `db.settings` record.
- R1.3: AnimationContext provides default settings that render no overlay when no user configuration exists.
- R1.4: Animation state is merged into `PlaybackContext` (renamed to `PlaybackContext` or kept as-is with expanded scope). A single `useReducer` manages both playback and animation state. One debounced persistence writer targets `db.settings`. AnimationContext wraps the same reducer with `useContext` for ergonomic access, but does not own its own persistence.
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
- R4.5: Keyframe definitions live in a dedicated `src/styles/animations.css` file, imported from `src/index.css` or `src/main.tsx`. Separating animation concerns from global styles improves maintainability as preset count grows.

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
*(To be filled during DESIGN phase)*

## Test Specifications
*(NL test cases written during DESIGN)*

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
*(To be filled during IMPLEMENTATION phase)*

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
- 2026-05-13: Review failed during REQUIREMENTS: code: [MAJOR] R6.2 missing overlayPosition control. R2.1 defines `overlayPosition: string` as a DB field, but R6.2 Settings UI lists only toggle, preset picker, size slider, opacity slider. No position picker specified. Either remove `overlayPosition` from R2.1 (hardcode for MVP) or add position control to R6.2.; [MAJOR] R1.4 persistence mechanism is undecided. Lists two alternatives ("`useDebouncedSettings` hook or merged into PlaybackContext") but commits to neither. This is an architectural decision that blocks design and implementation. Pick one. Merging into PlaybackContext is simpler (single writer, single debounce timer, existing pattern) — recommend that approach and update R1.4 accordingly.; [MINOR] AnimationContext reducer actions not specified. PlaybackContext defines explicit `PlaybackAction` union type (lines 14-22 of `PlaybackContext.tsx`). AnimationContext should define equivalent action types in requirements for parity and implementation clarity.; [MINOR] R2.1 types `overlayPreset` as `string`. Should be a union of valid preset names (`'bounce' | 'fly-across' | 'pulse' | 'none'`) matching R4.1 presets. Prevents invalid preset names at compile time.; [MINOR] R6.4 ambiguous — "hidden or visually distinct when overlay is disabled." Pick one: collapsed (hidden) or greyed-out (visually distinct). Current wording lets two implementations pass review.; [MINOR] R5.6 z-index map has no explicit slot for milestone 2 transitions. Research note acknowledges transitions "layer between slides and overlay" but z-index map jumps from 0 to 5 with no reserved range. Add note: z-index 2-4 reserved for transitions.
- 2026-05-13: Review failed during REQUIREMENTS: architecture: [MAJOR] Design section empty. Milestone in DESIGN state but `## Design` says "To be filled during DESIGN phase." Requirements embed implementation details (z-index values, reducer actions, component hierarchy) but no formal design exists. Cannot verify data flow, component tree, type definitions, or integration points.; [MAJOR] R1.4 merged reducer breaks separation of concerns. Animation config (enabled/preset/size/opacity) is user-tweaked configuration — changes rarely. Playback state (currentSlide/isPlaying) changes every N seconds on timer tick. Merging into one `useReducer` means every animation dispatch triggers the debounced persistence effect for ALL state, including unchanged slide index. Project convention is one context per domain (`PlaybackContext`, `DiagnosticContext`). Recommend: separate `AnimationContext` with own reducer, shared `useDebouncedSettings` hook for single-writer persistence.; [MINOR] R1.4 "AnimationContext wraps the same reducer" is self-contradictory. If animation state lives in `PlaybackContext`, `AnimationContext` adds unnecessary indirection — consumers just call `usePlayback()` for everything. If `AnimationContext` exists for ergonomics, it reads from `PlaybackContext`, creating a coupling layer. Pick one: expand PlaybackContext (rename if needed) OR separate context. Current wording tries both.; [MINOR] R5.5 ErrorBoundary undesigned. Requirement mandates ErrorBoundary wrapping AnimationOverlay with DiagnosticContext logging, but no design for the component (file location, props interface, fallback behavior). Should specify `src/components/AnimationErrorBoundary.tsx` or similar.; [MINOR] R2.1-R2.3 migration upgrade callback not specified. Existing v1→v2 uses `.upgrade(tx => tx.table().toCollection().modify(...))` pattern (db.ts:34-37). Design should specify equivalent v3 upgrade logic: defaulting new fields on existing settings record.
- 2026-05-13: Review failed during REQUIREMENTS: architecture: [BLOCKER] Design section empty. Milestone state is DESIGN but `## Design` says "To be filled during DESIGN phase." No component tree, data flow, type definitions, file layout, or integration points. Architecture review has nothing to evaluate. Must produce actual design before proceeding.; [MAJOR] R1.4 merged reducer creates domain coupling. PlaybackState changes every N seconds (timer-driven `NEXT_SLIDE`); animation config changes rarely (user action). Merging into one `useReducer` means:; [MAJOR] ErrorBoundary (R5.5) undesigned. Requirement mandates `ErrorBoundary` wrapping `AnimationOverlay` with `DiagnosticContext` logging, but no spec exists for: file location, props interface, error recovery behavior, or integration point in `PlayerShell`. Also: `DiagnosticContext.logError()` accepts strings, but React error boundaries catch `Error` objects. Design must specify conversion strategy (e.g., `error.message` + component stack).; [MINOR] DB v3 upgrade callback unspecified. Existing v1→v2 pattern at `db.ts:34-37` uses `.upgrade(tx => tx.table().toCollection().modify(...))`. R2.3 requires idempotent migration but no design for the v3 upgrade function body. Should specify: `tx.table('settings').get('current')` → modify with default overlay fields if absent.; [MINOR] `OverlayPreset` type location unspecified. R1.5 references it in action types, R2.1 defines it as union `'bounce' | 'fly-across' | 'pulse' | 'none'`. Unclear whether it lives in `db.ts` (with `Settings`), `PlaybackContext.tsx` (with actions), or a new shared types file. Design should specify.; [MINOR] Test Specifications section empty. Design phase should produce test specs that verify architecture decisions (e.g., animation context isolation, persistence single-writer guarantee, ErrorBoundary fallback behavior).
- 2026-05-13: Review failed during REQUIREMENTS: architecture: [BLOCKER] Design section empty. Milestone in DESIGN state after three prior reviews flagged this. Requirements are mature. No component tree, data flow, type definitions, file layout, or integration points documented. Nothing to validate architecture against.; [MAJOR] Persistence strategy for merged state underspecified. R1.4 mandates single writer for animation+playback state. Current persistence effect (`PlaybackContext.tsx:97-115`) deps are `[state.currentSlide, state.interval, state.presentationId]`. Design must specify: updated deps array including animation fields, expanded `db.settings.update()` call, and animation defaults in `INITIAL_SETTINGS` / `ensureSettings()`.; [MAJOR] ErrorBoundary (R5.5) undesigned. No file location, props interface, or PlayerShell integration point. `DiagnosticContext.logError()` accepts `string` (`DiagnosticContext.tsx:14`), but React error boundaries catch `Error` objects. Must specify conversion: `error.message` + component stack → string for ring buffer.; [MINOR] DB v3 upgrade callback body unspecified. Existing v2 pattern at `db.ts:34-37` uses `.upgrade(tx => tx.table().toCollection().modify(...))`. Design should specify v3 equivalent: default overlay fields on existing 'current' record if absent.; [MINOR] `OverlayPreset` type location unspecified. Referenced in R1.5 actions and R2.1 Settings type. Should live alongside `Settings` in `db.ts` or a dedicated shared types file.; [MINOR] Test Specifications section empty. Design phase should produce specs verifying: persistence single-writer guarantee, ErrorBoundary fallback, idempotent DB migration, overlay disabled renders null.

## Findings

- **[RESOLVED]** R1.2 originally said AnimationContext "reads initial values from IndexedDB on mount" but didn't specify integration with App.tsx init flow. `PlaybackProvider` receives `initialSettings` as prop — App.tsx blocks rendering until `ensureSettings()` completes (`src/App.tsx:54-56`). Resolution: extend `Settings` type + `ensureSettings()` to include overlay fields, pass same `initialSettings` prop to AnimationProvider. No separate DB read needed. R1.2 updated to specify this pattern explicitly.
- **[MINOR]** R5.4 says "AnimationOverlay is rendered inside PlayerShell, wrapping the slide content area" but PlayerShell uses `children` prop for slides. AnimationOverlay should be a sibling of `children` inside PlayerShell's `relative` container, rendered between `{children}` and the manual controls div. No wrapping needed — just absolute positioning with higher z-index than slides but lower than controls (z-10) and settings overlay.
- **[NOTE]** R2.1 adds 4 new fields to Settings: `overlayEnabled`, `overlayPreset`, `overlaySize`, `overlayOpacity`. These must be added to `INITIAL_SETTINGS` with defaults (disabled, 'none', 100, 1.0). Dexie v3 migration only needs to add defaults to existing 'current' record via `.upgrade()`.