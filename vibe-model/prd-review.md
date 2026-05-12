# PRD Review - Iteration 1

**Overall Status:** ❌ NEEDS REVISION

**Timestamp:** 2026-05-12T18:36:25.040Z

## ARCHITECTURE Review ✅

**Score:** +2

### Findings

- [MINOR] @kandiforge/pptx-renderer@3.3.0 exists on npm (published 2025-12-16) but PRD doesn't specify a version pin. New app should pin to avoid breaking changes in early development.
- [MINOR] No error/fallback strategy documented for when pptx-renderer fails on a malformed or unsupported PPTX. Kiosk context means unattended operation — single corrupt file shouldn't kill the loop. Milestone 2 mentions "error handling" but scope is vague.
- [MINOR] PWA service worker caching strategy not specified. For offline-first kiosk, the SW needs to cache the app shell AND all uploaded PPTX assets. PRD states "PWA" and "Dexie" but doesn't clarify whether PPTX binary blobs go through Dexie (IndexedDB has storage quotas — large decks could hit limits on some browsers) or Cache API.
- [MINOR] Milestone dependency ordering is sound (M1: core loop → M2: kiosk hardening). However, Wake Lock in M2 has a dependency on the playback loop from M1 being stable — this is implicit but correct.
- [MINOR] Tailwind CSS chosen for a kiosk app that's essentially fullscreen slides + a settings panel. Acceptable, but the UI surface is small. Could start simpler (CSS modules or inline) and add Tailwind if the settings UI grows. Not a blocker — just overhead vs. value.
- [MINOR] Architecture mentions "central playback coordinator" and "modular hook" but doesn't name the state management approach. For two milestones this is fine — `useState`/`useReducer` in the coordinator likely sufficient — but worth noting since the description implies coordination across multiple concerns (timing, navigation, Wake Lock, Fullscreen).

## TESTABILITY Review ❌

**Score:** -1

### Findings

- [MAJOR] Milestone 1 does not establish testing infrastructure as part of MVP. Tech stack lists Vitest + React Testing Library but neither milestone mentions test setup, test scaffolding, or minimum test coverage gates. First milestone should include: test runner config, at least one integration smoke test (upload → persist → render), and CI test run.
- [MAJOR] No acceptance criteria defined for any milestone. "Basic auto-looping playback engine" is not verifiable — what constitutes done? Specific, testable criteria needed: e.g., "uploaded PPTX renders all slides in sequence, loops back to slide 1 after last slide, interval configurable."
- [MINOR] No testing strategy progression described. Milestone 2 adds Wake Lock and Fullscreen APIs — these require different test strategies (mock browser APIs, integration tests for gesture fallbacks). PRD should outline how test coverage deepens across milestones.
- [MINOR] Milestone 1 bundles too many concerns for testability — upload UI, IndexedDB persistence, playback engine, and navigation are all coupled. Consider splitting so the playback engine (most testable unit) is built and tested before UI integration.

## UX Review ✅

**Score:** +2

### Findings

- [MINOR] No explicit user personas defined. Two distinct audiences exist — kiosk viewers (passive, no interaction model described beyond "manual navigation") and operators (upload files, configure settings). Journey for each is implied but not stated.
- [MINOR] No loading/transition state UX described. Uploading and rendering PPTX can be slow — blank screen during render is bad kiosk UX. First-launch experience (empty state, no PPTX loaded) unaddressed.
- [MINOR] Error handling deferred to milestone 2 but no UX-level description of failure modes. For an unattended kiosk: corrupt PPTX, render failure, IndexedDB quota exceeded — what does the screen show? "Enhance error handling" in milestone 2 scope is vague.
- [MINOR] No accessibility considerations. Kiosk context limits exposure, but operator settings UI needs keyboard navigation. Manual slide controls need focus management. No mention of reduced-motion for transitions or high-contrast support.
- [MINOR] PPTX files commonly contain animations, embedded video, speaker notes, and complex transitions. No UX defined for unsupported features — does the app silently skip, show a placeholder, or degrade gracefully?
- [MINOR] Auto-resume behavior unclear from UX perspective. Does it resume at last-played slide or restart from slide 1? What if the persisted file was deleted externally? No description of recovery UX.
- [MINOR] "Gesture-based entry fallbacks" for fullscreen/wake lock mentioned but no detail on what gestures, discoverability, or visual affordances guide the operator.

