# PRD: LooPPT Perpetual Presentation PWA

## Goal
Build a robust, offline-first "looping" presentation player for kiosk environments. The application must survive power cycles, network outages, and run indefinitely without human intervention once configured.

## Tech Stack
- **Language:** TypeScript
- **Framework:** React
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (Layout/Utilities), Material UI (Complex UI components)
- **Persistence:** Dexie.js (IndexedDB)
- **PWA:** `vite-plugin-pwa` (GenerateSW strategy with CacheFirst)
- **PPTX Rendering:** `@kandiforge/pptx-renderer` (DOM-based rendering)
- **Testing:** Vitest, React Testing Library, `fake-indexeddb`

## Architecture Overview
LooPPT is an offline-first React PWA that uses IndexedDB (via Dexie.js) to persist PPTX blobs and playback settings.

### Rendering Pipeline
The application uses `@kandiforge/pptx-renderer`'s `parsePPTX` to convert files into structured slide data, which is then rendered to the **DOM** via the `SlideView` component. For M1, data is loaded eagerly; M2 will explore memory-efficient "lazy" parsing or slide-windowing to prevent unbounded memory growth in long-running kiosk sessions.

### Playback & Coordination
A central `PlaybackContext` manages looping logic, timing, and navigation. 
- **Persistence Strategy:** Settings (current slide, interval) are persisted to IndexedDB. To minimize disk I/O during 24/7 operation, slide progress writes are debounced (500ms) or limited to manual changes and interval completions.
- **Kiosk Features:** Integration with Screen Wake Lock and Fullscreen APIs ensures the display remains active and immersive.

### Offline & Reliability
The application shell and core assets are cached via a Service Worker (`GenerateSW`). The app detects offline status and continues playback from local storage.

## Milestones

| ID | Name | Description | Status |
|---|---|---|---|
| 1 | MVP Perpetual Player | Core infrastructure, Dexie schema, PPTX upload UI, and basic looping playback logic. Includes test harness setup. | IN_PROGRESS |
| 2 | Production Kiosk Features | Integration of Wake Lock/Fullscreen APIs, settings panel, and auto-resume persistence. | PENDING |

### Milestone 1: MVP Perpetual Player
**Scope:**
- Initial project scaffold with Vite/React/Tailwind.
- **Test Harness:** Vitest config, RTL setup, and `fake-indexeddb` mock factory.
- **Data Layer:** Dexie.js schema for `presentations` and `settings`.
- **Upload Flow:** Drag-and-drop PPTX upload with persistence to IndexedDB.
- **Player Core:** `PlaybackContext` for auto-advancing slides and basic manual controls.
- **Rendering:** Integration with `SlideView`.

**Acceptance Criteria:**
- User can upload a `.pptx` file and see it persisted in IndexedDB.
- Presentation automatically starts looping with a default 5-second interval.
- Player reaches the last slide and loops back to the first slide without error.
- Unit tests cover the `playbackReducer` and Dexie schema initialization.

### Milestone 2: Production Kiosk Features
**Scope:**
- **Settings Panel:** Configure loop interval, toggle fullscreen, and view storage status.
- **Reliability:** Screen Wake Lock integration and automatic Fullscreen request on user interaction.
- **Persistence:** Debounced auto-resume that restores the exact slide index after a page reload.
- **PWA Polish:** Manifest icons, theme colors, and offline splash screen.

**Acceptance Criteria:**
- App survives a browser refresh and resumes playback on the same slide.
- Screen remains on (via Wake Lock) while the presentation is playing.
- User can change the interval via a slider in the Settings panel.
- Integration tests verify the "upload-to-playback" flow.

## Testing Strategy
- **Unit Testing:** Focus on the Playback Coordinator logic (`playbackReducer`) and data migration paths in Dexie.
- **Integration Testing:** Verify the interplay between `PlaybackProvider`, IndexedDB, and the `Player` component. Use mocks for `@kandiforge/pptx-renderer`.
- **Mocking Strategy:** `navigator.wakeLock` and `Element.requestFullscreen` will be mocked in Vitest to verify kiosk logic without requiring a physical display.
- **E2E Testing:** Future scope; manual validation of PWA "Add to Home Screen" and offline boot.

## UX & Kiosk Journey
1. **Initial Setup:** User opens the PWA, uploads a PPTX.
2. **Kiosk Mode:** Once uploaded, the app enters "Player Mode". The user interacts once (e.g., clicks "Start" or "Fullscreen") to satisfy browser gestures requirements for Fullscreen/Wake Lock.
3. **Unattended Operation:** The app loops indefinitely.
4. **Error Handling:** If a slide fails to render, the player will wait the interval duration and then attempt to advance to the next slide, logging the error to an internal buffer.
5. **Offline Resiliency:** If the network drops, the app continues without interruption.

## Review Response

### Iteration 1 Refinements
- **Architecture:** Clarified DOM rendering target and memory management intent.
- **Testability:** Milestone 1 now explicitly includes the test harness. Added concrete Acceptance Criteria for both milestones.
- **Persistence:** Added debouncing strategy for slide-change writes to prevent excessive SSD wear in 24/7 kiosks.
- **UX:** Defined the kiosk journey and basic error fallback behavior.
- **Styling:** Clarified the roles of Tailwind and MUI.
