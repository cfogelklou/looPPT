# PRD Review - Iteration 3

**Overall Status:** ✅ APPROVED

**Timestamp:** 2026-05-12T18:58:00.713Z

## ARCHITECTURE Review ✅

**Score:** +2

### Findings

- [MINOR] "Debounced (500ms) or limited to manual changes and interval completions" — "or" is ambiguous. Is it debounced AND interval-triggered, or one or the other? Implementation detail, not blocking, but worth a quick clarify.
- [MINOR] M2 memory strategy says "will explore" lazy parsing/slide-windowing. "Will explore" isn't a commitment — it's a research item. For 24/7 kiosk, unbounded memory from eager loading is a real risk. Consider promoting this to a scoped deliverable with an acceptance criterion (e.g., "parsed data for N slides only held in memory at once").
- [MINOR] Error handling says "logging the error to an internal buffer." Unbounded log buffer in 24/7 kiosk = same memory leak risk as eager slide data. Should specify bounded buffer (ring buffer, max N entries) or drop oldest. Minor since error path is edge case.
- [MINOR] No explicit interface contract between M1 PlaybackContext and M2 kiosk features (Wake Lock, auto-resume). M2 adds Wake Lock integration to PlaybackContext — PRD should note that M1's context must expose lifecycle hooks (`onPlay`/`onPause`/`onSlideChange`) for M2 to integrate cleanly. Dependency ordering is correct; contract is implicit.
- [MINOR] PWA update strategy not addressed. Service worker caches shell with CacheFirst, but how do kiosk deployments get app updates? Browsers check for SW updates on navigation — a kiosk that never navigates may serve stale code indefinitely. Consider noting a periodic update check (e.g., `registerType: 'prompt'` or polling `sw.update()`). Minor for MVP but critical for production kiosk.

## TESTABILITY Review ✅

**Score:** +2

### Findings

- [MINOR] M1 acceptance criteria mention "Unit tests cover the playbackReducer and Dexie schema initialization" but no quantitative coverage target. For a kiosk-critical app, a minimum coverage threshold (e.g., 80% on core modules) would strengthen the commitment.
- [MINOR] Testing Strategy section defers E2E to "future scope." For a kiosk PWA that must survive offline boot and power cycles, basic E2E validation of the offline boot path is high-value and should be considered earlier — at minimum as a manual test gate on M2.
- [MINOR] M2 acceptance criteria include "App survives a browser refresh and resumes playback on the same slide" but no test criterion for the debounced persistence write itself (e.g., verifying that rapid slide transitions don't produce excessive IndexedDB writes). This is the key reliability mechanism for 24/7 operation and deserves explicit test coverage.
- [MINOR] Error handling section describes slide-failure fallback ("wait interval, advance, log error") but neither milestone's acceptance criteria include a testable assertion for this path. A negative test case would strengthen M2.
- [MINOR] No mention of testing the service worker registration/offline-detection logic. Given the GenerateSW strategy, verifying the app shell is served from cache after first load would be a valuable M2 integration check.

## UX Review ✅

**Score:** +2

### Findings

- [MINOR] Corrupt/unsupported PPTX upload has no user-facing error feedback. UX journey point 4 covers mid-loop slide failure, but the upload flow (M1) has no error state. What does the user see when they drag-drop an invalid file? A toast? Inline message? Upload rejected silently? One line in M1 acceptance criteria would close this.
- [MINOR] Wake Lock / Fullscreen denial has no fallback UX. Browsers deny these APIs frequently (no HTTPS, no user gesture, battery saver). M2 says "automatic Fullscreen request on user interaction" but never specifies what happens on denial. Kiosk screen dimming is the #1 field failure mode. Add: "If denied, show persistent banner: 'Tap to enable fullscreen' with re-request on interaction."
- [MINOR] No upload progress indicator for large PPTX files. Kiosk decks can be 50MB+. IndexedDB write + parsePPTX are both async and slow on large files. Upload flow says "drag-and-drop PPTX upload with persistence" but no loading/progress state. User sees blank screen during parse. Spinner or progress bar needed.
- [MINOR] Reboot/recovery journey step missing. UX journey covers initial setup → kiosk mode → unattended, but skips what happens after power cycle. M2 mentions "auto-resume," but the journey should have an explicit step: "On reload, app detects existing presentation in IndexedDB, skips upload, resumes playback at last saved slide." This is the most common kiosk state and it's implied, not stated.
- [MINOR] Accessibility still unaddressed. Touch targets on upload zone and settings controls should meet 44x44px minimum. Color contrast matters for kiosks in varied lighting. Not critical for kiosk context but worth a one-liner: "Interactive elements meet WCAG 2.1 AA touch target and contrast minimums."

