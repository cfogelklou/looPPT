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
- R1.2: AnimationContext reads initial values from IndexedDB on mount and persists changes with 500ms debounce (matching PlaybackContext pattern).
- R1.3: AnimationContext provides default settings that render no overlay when no user configuration exists.

**R2: Database Migration**
- R2.1: Dexie schema migrates from v2 to v3, adding animation settings fields to the `settings` table: `overlayEnabled: boolean`, `overlayPreset: string`, `overlaySize: number`, `overlayOpacity: number`, `overlayPosition: string`.
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

**R5: AnimationOverlay Component**
- R5.1: `AnimationOverlay` renders as an absolutely-positioned, `pointer-events: none` layer covering the entire slide area, rendered above slide content (z-index > slide content, < SettingsOverlay).
- R5.2: When overlay is disabled, `AnimationOverlay` renders nothing (returns null).
- R5.3: The selected SVG asset is rendered with the configured preset animation, size, and opacity.
- R5.4: AnimationOverlay is rendered inside `PlayerShell`, wrapping the slide content area, so it applies to both PDF and PPTX playback.

**R6: Settings UI — Overlay Section**
- R6.1: SettingsOverlay MUI drawer gains a new "Animation" section below the existing controls.
- R6.2: The section contains: a toggle switch for overlay enabled/disabled, a preset picker (dropdown or button group), a size slider, an opacity slider.
- R6.3: Changes to any animation setting take effect immediately on the overlay (no "apply" button needed).
- R6.4: The animation section is hidden or visually distinct when overlay is disabled.

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
