# PRD Review - Iteration 1

**Overall Status:** ❌ NEEDS REVISION

**Timestamp:** 2026-05-12T18:54:29.873Z

## ARCHITECTURE Review ✅

**Score:** +2

### Findings

- [MINOR] Rendering pipeline unspecified. PRD says `@kandiforge/pptx-renderer` "handles conversion" but doesn't clarify render target (canvas, DOM, SVG, images). Code shows `SlideView` component rendering to DOM — this is the core data flow. A one-liner clarifying render model strengthens architecture section. Not blocking since code already exists and works.
- [MINOR] No memory/eviction strategy for long-running kiosk. `Player.tsx:9` stores entire parsed `PPTXData` in state for lifetime of component. For 100+ slide decks with images, this is unbounded memory. Kiosk runs 24/7 — tab crash inevitable without eviction. Architecture section should note lazy vs eager rendering decision. Not blocking since M2 can address.
- [MINOR] `PlaybackContext.tsx:86-92` persists every slide change to IndexedDB on every tick. Write frequency = 1 write per `interval` seconds while playing. For 5s interval over 24h, that's ~17K writes/day. Should be debounced or persisted only on pause/stop. Architecture section should note persistence strategy. Not blocking.
- [MINOR] Tailwind + MUI both in stack creates styling ambiguity. Code already uses both (`Player.tsx` uses Tailwind classes, MUI listed in deps). No guidance on which to use where. Minor since codebase is small and consistent so far.
- [MINOR] Milestone 2 depends on Milestone 1's Playback Coordinator for Wake Lock integration, but no explicit interface contract described. `usePlayback` hook is the de facto coordinator — acceptable since implementation already exists. Dependency ordering is correct (M1 core → M2 kiosk features).
- [MINOR] PWA service worker strategy not specified. `vite-plugin-pwa` supports multiple strategies (GenerateSW, InjectManifest). For offline-first kiosk, cache strategy matters. Not blocking — defaults likely work for MVP.

## TESTABILITY Review ❌

**Score:** -1

### Findings

- [MAJOR] Milestone 1 does not explicitly include testing infrastructure setup. "Core infrastructure, Dexie schema, PPTX upload UI, and basic looping playback logic" — no mention of Vitest config, test helpers, mock factories for Dexie/PPTX renderer, or CI test runner. First milestone should establish test harness so subsequent milestones build on tested ground.
- [MAJOR] No acceptance criteria defined for either milestone. "Basic looping playback logic" is unverifiable — what constitutes "basic"? Acceptance criteria needed: e.g., "given one PPTX uploaded, player loops from last slide back to first with configurable interval."
- [MAJOR] No testing strategy progression. PRD lists Vitest + RTL in tech stack but never describes what gets tested when. Missing: unit test scope (Dexie schema, playback coordinator logic), integration test scope (upload → persist → render loop), E2E scope (full kiosk cycle with power interrupt). Without this, milestones lack verifiable gates.
- [MINOR] Wake Lock and Fullscreen APIs are notoriously hard to test in jsdom. Milestone 2 should note mocking strategy for `navigator.wakeLock` and `Element.requestFullscreen` — otherwise acceptance testing becomes manual-only.
- [MINOR] Dexie.js with IndexedDB needs special test setup (fake-indexeddb or Dexie's test utilities). No mention of this dependency, risk of flaky tests or skipped tests.

## UX Review ✅

**Score:** +2

### Findings

- [MINOR] **No user journey defined.** PRD lists tech stack and milestones but no user flows. What happens when kiosk boots? What's the first-screen experience? Upload → configure → play sequence should be documented. Not blocking since milestones imply a clear incremental build.
- [MINOR] **Accessibility for kiosk context unclear.** Kiosk implies unattended operation, but no mention of: what happens if screen reader users encounter it, contrast requirements for varied lighting, or touch target sizing for potential touch kiosks. Low severity since kiosk mode typically locks down interaction.
- [MINOR] **Error handling for PPTX rendering failures absent.** `@kandiforge/pptx-renderer` will fail on corrupted/unsupported files. No fallback UX described (skip slide? show placeholder? alert?). Should specify behavior for: corrupt upload, unsupported slide content, renderer crash mid-loop.
- [MINOR] **No offline-first edge case coverage.** PRD says "offline-first" but doesn't address: what if IndexedDB quota is exceeded, what if upload is interrupted mid-write, what if service worker cache becomes stale after app update. These are the most common kiosk failure modes.
- [MINOR] **Wake Lock / Fullscreen failure modes unspecified.** Browsers can deny both APIs. No fallback described — does the screen just dim? Does a "tap to wake" message appear? Critical for kiosk reliability but acceptable at PRD level since Milestone 2 covers it.
- [MINOR] **Settings panel scope undefined.** Milestone 2 mentions "settings panel" but no detail on what's configurable. Loop speed? Slide order? Transition type? Volume? Users need to know what they can adjust.

