# Milestone 1: MVP Perpetual Player

## Status
- State: DESIGN
- Progress: 20%
- Started: 2026-05-12 18:40:01 UTC
- Pending Transition: NONE

## Requirements
- **R1: Project Infrastructure:** Must initialize a Vite/React/TypeScript project with a dark-themed UI.
- **R2: Test Suite:** Must configure Vitest and React Testing Library with at least one smoke test for the upload flow.
- **R3: Persistent Storage:** Must implement a Dexie.js schema that stores PPTX files as binary Blobs and persists playback settings (interval, current slide).
- **R4: File Upload:** Must provide a UI for selecting and uploading `.pptx` files with a progress bar and basic format validation.
- **R5: Playback Engine:** Must implement a `PlaybackCoordinator` (using `useReducer`) that manages automatic slide advancement and infinite looping.
- **R6: Manual Navigation:** Must provide "Next" and "Previous" controls that manually change slides and reset the auto-advance timer.
- **R7: Rendering Pipeline:** Must integrate `@kandiforge/pptx-renderer@^3.3.0` to render PPTX slides within the player.
- **R8: Offline Support:** Must configure `vite-plugin-pwa` to cache the application shell and allow offline operation.
- **R9: Resource Management:** Must check available IndexedDB quota before saving new files and notify the operator if space is insufficient.

## Design
*(To be filled during DESIGN phase)*

## Test Specifications
*(NL test cases written during DESIGN)*

## Research Notes
### Storage (Dexie.js)
- **Blob Handling:** Best practice is to store `Blob` or `File` objects directly in IndexedDB. Avoid Base64 encoding as it increases size by ~33%.
- **Indexing:** Never index the blob property itself to maintain performance. Keep it as a non-indexed property.
- **Persistence:** Use `navigator.storage.persist()` to request that the browser does not evict the database under pressure.
- **Quota:** Check available space using `navigator.storage.estimate()` before large writes.

### PWA / Kiosk Mode
- **Display Mode:** Use `display: standalone` in `manifest.json` for a native app feel.
- **Offline:** Service worker (Workbox) should cache all assets required for the player UI and core logic.

### Rendering
- **@kandiforge/pptx-renderer:** Target version is `^3.3.0`. The renderer should ideally be used in a way that allows pre-rendering or lazy-loading to ensure smooth transitions in a 24/7 kiosk environment.
- **Memory:** For long-running kiosk apps, slide components should be properly unmounted or recycled to avoid memory leaks.

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
