# PRD: LooPPT Perpetual Presentation PWA

**Goal:** Create a standalone, offline-first kiosk presentation looping application that allows users to upload PPTX files and play them in a continuous loop with minimal manual intervention.

## Tech Stack
- **Language:** TypeScript
- **Framework:** React
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (for settings UI and layout)
- **Persistence:** Dexie.js (IndexedDB) for PPTX blobs and configuration
- **PWA:** `vite-plugin-pwa` with Workbox for offline app shell caching
- **PPTX Rendering:** `@kandiforge/pptx-renderer@^3.3.0`
- **Testing:** Vitest, React Testing Library

## User Personas
- **Kiosk Operator:** Responsible for setting up the hardware, uploading the presentation, and configuring loop settings (timing, fit mode). Needs a simple, reliable interface.
- **Kiosk Viewer:** Passive audience member who views the slides. May occasionally interact if manual navigation is enabled.

## Architecture Overview
LooPPT is designed as a robust, offline-first SPA.

### Data Persistence & Caching
- **IndexedDB (Dexie.js):** Stores PPTX files as binary blobs and persists application state (current slide, settings). This ensures the app can resume exactly where it left off after a power cycle or browser refresh.
- **Service Worker (Workbox):** Caches the application shell (HTML, JS, CSS) to ensure the player works without an internet connection.

### State Management
- A central **Playback Coordinator** (using React `useReducer` and Context) manages:
    - Slide timing and transitions.
    - Manual navigation overrides.
    - Kiosk APIs (Wake Lock, Fullscreen).
    - Error states.

### Error Handling & Reliability
- **Graceful Degradation:** If a specific slide fails to render, a "Render Error" placeholder is shown for that slide's duration before moving to the next.
- **Validation:** PPTX files are validated upon upload. If a file is malformed, the operator is notified immediately.
- **Quota Management:** The app checks for available IndexedDB space before saving large files and warns the operator if limits are near.

## UX Considerations
- **Loading States:** A visual progress indicator is shown during PPTX processing and initial render.
- **Failure Modes:** If the loop fails to start, a "Waiting for Content" or "Error" screen is shown with actionable steps for the operator.
- **Accessibility:** 
    - Keyboard navigation (Arrow keys, Space for pause/play).
    - ARIA labels for all operator controls.
    - High-contrast support for the settings UI.
- **Auto-Resume:** The app automatically saves the last viewed slide index and restores it on startup.
- **Gestures:** A triple-tap gesture on the screen toggles the operator settings overlay/fullscreen mode.
- **Feature Support:** Focus is on static slide rendering. Complex animations or embedded videos may be degraded or skipped in early versions.

## Milestones

### Milestone 1: MVP Perpetual Player
Scaffold the core infrastructure and basic playback loop.

- **Tasks:**
    - Initialize Vite/React/TS project.
    - Configure Vitest and React Testing Library infrastructure.
    - Implement Dexie.js schema for PPTX and Settings.
    - Create PPTX upload UI with progress feedback.
    - Build the `PlaybackCoordinator` logic (auto-looping, manual navigation).
    - Basic dark-themed player UI.
- **Acceptance Criteria:**
    - [ ] AC 1.1: Project includes working test runner (`npm test`) and a smoke test for the upload flow.
    - [ ] AC 1.2: Valid PPTX files can be uploaded and persisted in IndexedDB.
    - [ ] AC 1.3: Slides render in sequence and automatically loop back to the first slide.
    - [ ] AC 1.4: "Next" and "Prev" controls correctly navigate and reset the auto-advance timer.

### Milestone 2: Production Kiosk Features
Harden the app for unattended operation and add operator controls.

- **Tasks:**
    - Integrate Screen Wake Lock API to prevent display sleep.
    - Implement Fullscreen API with triple-tap gesture fallback.
    - Add Operator Settings panel (slide interval, image fit mode: contain/cover).
    - Implement auto-resume (persist current slide index).
    - Enhance slide render error handling with placeholder slides.
- **Acceptance Criteria:**
    - [ ] AC 2.1: App successfully requests Wake Lock during playback.
    - [ ] AC 2.2: Triple-tap gesture toggles the settings overlay and enters/leaves fullscreen.
    - [ ] AC 2.3: Slide interval is configurable from 1s to 3600s.
    - [ ] AC 2.4: App resumes at the last viewed slide after a browser refresh.

## Review Response

### Architecture
- **Version Pinning:** Added `@kandiforge/pptx-renderer@^3.3.0` to Tech Stack.
- **Error Handling:** Defined a strategy for per-slide failures and deck-level validation.
- **PWA/Storage:** Clarified that Dexie handles blobs while Workbox handles the app shell.
- **State Management:** Explicitly named `useReducer` for the Playback Coordinator.

### Testability
- **Infrastructure:** Added test setup to Milestone 1.
- **Acceptance Criteria:** Added specific ACs for both milestones.
- **Strategy:** Milestone 1 focuses on unit/integration tests for the core engine; Milestone 2 adds integration tests for browser APIs (Wake Lock/Fullscreen).

### UX
- **Personas:** Defined Operator and Viewer personas.
- **Loading/Errors:** Added descriptions for progress states and failure modes.
- **Accessibility:** Included keyboard and ARIA considerations.
- **Gestures:** Specified the triple-tap gesture for kiosk control.
