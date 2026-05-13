# Milestone 2: Slide Transitions

## Status
- State: DESIGN
- Progress: 20%
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
*(To be filled during DESIGN phase)*

## Test Specifications
*(NL test cases written during DESIGN)*

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
*(To be filled during IMPLEMENTATION phase)*

## Unit Test Results
*(To be filled during UNIT_TEST phase)*

## Integration Test Results
*(To be filled during INTEGRATION_TEST phase)*

## Delivery
*(PR link, to be filled during DELIVERY phase)*

## Learnings
*(Replaces memory.md — learnings from this milestone)*
