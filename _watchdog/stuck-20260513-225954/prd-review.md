# PRD Review - Iteration 1

**Overall Status:** ✅ APPROVED

**Timestamp:** 2026-05-13T18:52:51.651Z

## ARCHITECTURE Review ✅

**Score:** +2

### Findings

- [MINOR] Milestone 1 and 2 are correctly independent — AnimationOverlay is a sibling layer, TransitionLayer wraps slide rendering. No cross-dependency. Good ordering.
- [MINOR] PRD says "sliding window (prev/cur/next only)" in architecture overview but TransitionLayer needs to render two slides simultaneously during a transition (outgoing + incoming). Neither PdfPlayer nor PptxPlayer currently support this — both mount/unmount slides via visibleIndices. Milestone 2 will need to extend the sliding window to keep the departing slide mounted for transition duration. PRD doesn't call this out explicitly but the architecture doesn't block it; just worth noting during implementation.
- [MINOR] "CSS keyframes + CSS transitions (no JS animation loops)" is the right call for 24/7 kiosk — avoids GC pressure and frame scheduling drift. Consistent with existing patterns (no requestAnimationFrame usage in codebase).
- [MINOR] AnimationContext as a separate context from PlaybackContext is correct — animation settings change rarely (user configures once), playback state changes every slide advance. Different update frequencies warrant separation.
- [MINOR] DB v3 migration adding `overlays` table for user-uploaded assets is clean. Stored blobs in IndexedDB is consistent with existing pattern (presentations already store blobs). No quota concern called out but IndexedDB limits are typically 50% of disk — acceptable for kiosk use.
- [MINOR] Milestone 3 (Settings UI & Uploads) depends on M1 and M2 being complete — correct dependency ordering. Settings UI is the integration point.
- [MINOR] "pointer-events-none" on AnimationOverlay is correct — prevents overlays from interfering with kiosk touch navigation. Good kiosk-awareness.

## TESTABILITY Review ✅

**Score:** +2

### Findings

- [MINOR] No explicit acceptance criteria per milestone. "User sees animated overlay on slides" is too vague to verify without definition. Milestones are concrete enough to derive criteria, but should be stated — e.g., "AnimationOverlay renders with correct CSS class matching selected preset," "overlay layer has `pointer-events: none` and correct z-index."
- [MINOR] No testing strategy mentioned for animation features. jsdom can't render CSS keyframes, but the declarative CSS choice (over JS animation loops) is good — test that correct CSS classes/styles are applied, not animation frames. PRD should explicitly state: unit-test AnimationContext reducer, TransitionLayer class application, overlay CRUD; visual verification manual or E2E.
- [MINOR] M1 doesn't call out testing infrastructure. Should include test utilities (AnimationContext mock provider, preset test data factories) to establish patterns before M2/M3 add complexity.
- [MINOR] DB migration v2→v3 testing not addressed. Schema migration on a 24/7 kiosk system is high-risk — should call out migration tests (existing data survives, new fields default correctly).

## UX Review ✅

**Score:** +2

### Findings

- [MINOR] No mention of reduced-motion / prefers-reduced-motion support. CSS keyframes and transitions should respect `prefers-reduced-motion: reduce` — either disable animations or substitute minimal effects. Critical for accessibility in public-facing kiosk contexts.
- [MINOR] Overlay opacity/size/motion controls described but no specification for sensible defaults. If defaults are too aggressive (e.g., large bouncing overlay), kiosk readability degrades. PRD should state default overlay: disabled, and default transition: none/crossfade — user opts in, not opts out.
- [MINOR] No user journey specified for the "first upload" flow. When a user uploads a custom PNG/GIF overlay, what happens if the file is too large for IndexedDB (quota exceeded)? The existing Uploader has quota checks, but overlay uploads are in a different UI context (Settings drawer). Error feedback path unspecified.
- [MINOR] Transition timing and overlay animation duration configurable, but no guardrails mentioned. A 10-second crossfade on a 5-second slide interval means slides never fully render. PRD should state that transition duration must be < slide interval, enforced at settings level.
- [MINOR] Pointer-events-none on overlay layer is correct for kiosk, but no mention of what happens when overlay visually obscures slide content in a way that makes text unreadable. Consider a z-index contract or max-coverage constraint documented in the PRD.
- [MINOR] No mention of how overlays interact with the existing sliding window (prev/cur/next). If AnimationOverlay lives in PlayerShell above all three slides, overlays persist across slide changes — intended? If overlays should be per-slide, the architecture needs clarification.
- [MINOR] Settings drawer gains two new sections. No spec for drawer scroll behavior or section collapse/expand. On smaller screens, a long settings drawer with transitions + overlays + existing settings could push critical controls below fold.

