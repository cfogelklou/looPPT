# PRD Review - Iteration 3

**Overall Status:** ✅ APPROVED

**Timestamp:** 2026-05-12T18:40:01.002Z

## ARCHITECTURE Review ✅

**Score:** +2

### Findings

- [MINOR] Rendering pipeline undescribed. "Binary blob in IndexedDB → rendered slide on screen" is the core data flow but never specified. Is pptx-renderer rendering to canvas/DOM/images? Are slides pre-rendered or on-demand? For kiosk smoothness, pre-render strategy matters. Doesn't need full design here, but a one-liner clarifying the render model would strengthen architecture section.
- [MINOR] No memory strategy for large decks. 100-slide deck with high-res images — are all slides held in memory? Lazy render? Eviction policy? Kiosk runs 24/7; memory leaks or unbounded cache would cause eventual tab crash. Worth noting in architecture even if deferred to implementation.
- [MINOR] `@^3.3.0` is not a version pin — previous review asked for pin, `^` allows minor bumps. Acceptable during active development but PRD says "version pin." Either pin to `3.3.x` explicitly or drop the claim.

## TESTABILITY Review ✅

**Score:** +2

### Findings

- [MINOR] Testing strategy progression is one sentence in Review Response. Doesn't specify which components get unit vs integration tests, or how browser API mocking (Wake Lock, Fullscreen) will be handled in M2. A brief table mapping test type to milestone would strengthen it.
- [MINOR] No test data/fixtures strategy. PPTX rendering tests need fixture files — no mention of where they come from (committed assets, generated mocks, etc.).
- [MINOR] No CI test gate. AC 1.1 says `npm test` works but no AC or task mentions running tests in CI or blocking merge on failure.
- [MINOR] ACs don't distinguish automated vs manual verification. "Triple-tap gesture toggles settings" (AC 2.2) is hard to automate — should note which ACs need manual QA.
- [MINOR] No longevity/reliability test consideration for kiosk context. App targets 24/7 unattended operation but no AC covers memory leak or multi-hour loop stability.

## UX Review ✅

**Score:** +2

### Findings

- [MINOR] Triple-tap gesture for operator overlay lacks discoverability. Kiosk operators won't intuitively know this exists. Consider a brief onboarding tooltip on first launch, or a visible (but unobtrusive) affordance like a corner hotspot that reveals on hover/long-press.
- [MINOR] Auto-resume says "saves last viewed slide index and restores on startup" but doesn't specify UX when persisted state is stale (e.g., PPTX was replaced with a deck having fewer slides). Should clamp to valid range or reset to slide 1.
- [MINOR] Accessibility section mentions ARIA labels and high-contrast but omits focus management strategy for the settings overlay. When overlay opens via triple-tap, where does focus go? When it closes, where does focus return? Critical for keyboard-only operators.
- [MINOR] Error states reference "actionable steps for the operator" but no examples given. For a kiosk context, actionable steps should be concrete (e.g., "Re-upload file", "Check storage", "Restart app"). Vague error messages erode operator trust.
- [MINOR] Manual navigation controls (Next/Prev) in AC 1.4 don't specify whether these are keyboard-only, on-screen buttons, or both. For kiosk viewers who may interact, touch targets and visibility matter. Clarify which persona uses these controls and how.
- [MINOR] No mention of reduced-motion preference support. Kiosk displays may be in environments where constant slide transitions are distracting. `prefers-reduced-motion` should pause auto-advance or reduce transition effects.
- [MINOR] Settings panel range (1s–3600s) is large. No guidance on default value or UX for picking values (slider, number input, preset buttons). Poor slider UX at this range — hard to pick 5s vs 10s precisely.

