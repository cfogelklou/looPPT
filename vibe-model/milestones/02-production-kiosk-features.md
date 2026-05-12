# Milestone 2: Production Kiosk Features

## Status
- State: DESIGN
- Progress: 20%
- Started: 2026-05-12 19:01:46 UTC
- Pending Transition: NONE

## Requirements

### Functional Requirements
- **R1: Persistence & Auto-Resume**
  - The application MUST persist the current presentation ID and slide index to IndexedDB.
  - On launch, the application MUST automatically load the last viewed presentation and resume from the last saved slide.
  - Slide index persistence MUST be debounced by 500ms to prevent excessive database writes.
- **R2: Settings Panel**
  - A settings panel MUST be accessible to the user (via a button or overlay).
  - The settings panel MUST allow the user to:
    - Change the loop interval (1 to 60 seconds).
    - Manually toggle Fullscreen mode.
    - View the current IndexedDB storage usage (estimate).
  - All interactive elements in the settings panel MUST meet a minimum touch target size of 44x44px and WCAG 2.1 AA contrast standards.
- **R3: Screen Wake Lock**
  - The application MUST request a Screen Wake Lock when playback is active to prevent the display from sleeping.
  - The application MUST automatically re-request the Wake Lock if it is released (e.g., due to visibility change or power state change).
- **R4: Fullscreen Management**
  - The application MUST provide a "Start Kiosk" or "Enter Fullscreen" overlay when a presentation is loaded but not yet in fullscreen, to satisfy the browser's user gesture requirement.
  - The application MUST automatically attempt to enter Fullscreen mode upon this first interaction.
  - If Fullscreen mode is exited by the user or system, the application MUST show a prompt to re-enter Fullscreen.
- **R5: Service Worker Updates**
  - The Service Worker MUST periodically (every 1 hour) check for updates when an internet connection is available.
  - If an update is found, it MUST be applied automatically to ensure the kiosk stays up-to-date.
- **R6: Error Handling & Reliability**
  - If a slide fails to render, the player MUST wait for the configured interval and then attempt to advance to the next slide.
  - Errors MUST be logged to a bounded internal ring buffer (max 100 entries) for diagnostics.

### Non-Functional Requirements
- **R7: Memory Management (Sliding Window)**
  - The application MUST implement a "sliding window" for slide rendering, keeping only a limited number of slides (e.g., current, previous, and next) in the DOM/memory at once to prevent memory leaks in 24/7 sessions.
- **R8: Deployment Configuration**
  - Vite configuration MUST set the `base` path to `/perpetual-presentation/`.
  - PWA manifest MUST set `start_url` and `scope` to `/perpetual-presentation/`.
- **R9: Polyfill & Compatibility**
  - Resolve Vite build warning regarding Node `buffer` externalization from `@kandiforge/pptx-renderer` to ensure reliable browser runtime playback.

## Design
*(To be filled during DESIGN phase)*

## Test Specifications
*(NL test cases written during DESIGN)*

## Research Notes
### Screen Wake Lock API
- Browsers release the lock when the tab is hidden or the system enters low-power state.
- Must listen to `visibilitychange` to re-acquire the lock.
- Only works over HTTPS/localhost.
- Implementation should use a custom hook (e.g., `useWakeLock`) that handles the `WakeLockSentinel` lifecycle.

### Fullscreen API
- Requires a user gesture (click/tap) to trigger.
- Recommended approach: "Tap to Start" overlay.
- Listen for `fullscreenchange` to detect when the user exits fullscreen and re-prompt.

### PWA Updates
- `vite-plugin-pwa` can be configured for periodic update checks using `registration.update()`.
- Recommendation: Check every 1 hour, bypass cache by fetching the SW script directly.

### Memory Management
- Unbounded rendering of slides in a 24/7 loop can lead to memory exhaustion.
- A sliding window approach (rendering only N slides around the current one) is critical for long-term stability.

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

- 2026-05-12: User hint: Deployment target is /perpetual-presentation/ inside the applicaudia monorepo, so vite.config.ts must set base to /perpetual-presentation/ and the PWA manifest start_url/scope should align with that path. Also fix the current Vite build warning about Node buffer being externalized from @kandiforge/pptx-renderer so browser runtime playback is reliable on desktop, Android tablets, and phone-plus-HDMI devices.