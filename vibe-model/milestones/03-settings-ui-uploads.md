# Milestone 3: Settings UI & Uploads

## Status
- State: DESIGN
- Progress: 20%
- Started: 2026-05-13 21:32:04 UTC
- Pending Transition: NONE

## Requirements

### Transition Settings UI

- **R1**: SettingsOverlay replaces the "coming in next update" placeholder with a functional transition type dropdown, wired to `SET_TRANSITION_TYPE` dispatch.
- **R2**: Transition type dropdown offers: none, crossfade, slide, wipe, dissolve (matching existing `TransitionType` union).
- **R3**: Transition duration slider (range 200ms–2000ms, step 100ms) wired to `SET_TRANSITION_DURATION` dispatch, showing current value in milliseconds.
- **R4**: Transition controls visible at all times (not gated behind a toggle — transitions are independent of overlay).

### Overlay Picker — Visual Grid

- **R5**: Built-in overlay presets displayed as a visual grid with preview thumbnails (one per preset: bounce, fly-across, pulse), replacing the current plain Select dropdown.
- **R6**: Each grid item shows the preset's SVG icon rendered at a fixed small size as a visual preview.
- **R7**: Selecting a grid item dispatches `SET_OVERLAY_PRESET` and visually indicates the active selection.
- **R8**: A "None" option exists in the grid to disable overlay without toggling the master switch.

### Custom Overlay Uploads

- **R9**: An upload button in the overlay picker section accepts PNG, GIF, and SVG files (via `<input accept=".png,.gif,.svg">`).
- **R10**: Uploaded files are stored as Blobs in a new `overlays` IndexedDB table (DB migration to v5).
- **R11**: Upload checks `navigator.storage.estimate()` quota before storing, rejecting with a user-visible error if insufficient space.
- **R12**: Uploaded overlays appear as additional items in the visual picker grid, alongside built-in presets.
- **R13**: Each uploaded overlay displays its filename (truncated to 20 chars) below the thumbnail preview.
- **R14**: Uploaded overlays can be deleted individually via a delete affordance (e.g., small X button), removing the blob from IndexedDB.
- **R15**: Selecting a custom overlay sets `overlayPreset` to a `custom:<id>` format that the AnimationOverlay component recognizes and renders as an `<img>` element.
- **R16**: Custom overlays respect the same size, opacity, and speed controls as built-in presets.

### Motion/Speed Controls

- **R17**: An overlay speed slider (range 0.5x–3.0x, step 0.25x) controls CSS animation `animation-duration`, persisted via new `SET_OVERLAY_SPEED` action.
- **R18**: Default speed is 1.0x. Speed field added to `Settings` interface and `AnimationState` with DB migration.

### Non-Functional

- **R19**: All interactive elements meet 44×44px minimum touch target (consistent with existing settings pattern).
- **R20**: All settings changes persist to IndexedDB via the existing 500ms debounced write in AnimationContext.
- **R21**: Custom overlay rendering is wrapped in the existing `AnimationErrorBoundary` — broken images don't crash the player.
- **R22**: Uploaded overlay blobs are cleaned up when the overlay is deleted (no orphan storage).
- **R23**: File size limit of 2MB per uploaded overlay, rejected with a user-visible error message if exceeded.
- **R24**: Settings drawer remains scrollable and usable on narrow viewports (xs: 100% width, sm: 350px).

## Design
*(To be filled during DESIGN phase)*

## Test Specifications
*(NL test cases written during DESIGN)*

## Research Notes

### Codebase Findings

1. **Transition settings already wired in context**: `AnimationContext.tsx` has `SET_TRANSITION_TYPE` and `SET_TRANSITION_DURATION` dispatchers (lines 18-19) and the reducer handles them (lines 65-67). Only `SettingsOverlay.tsx` is missing the UI controls — lines 115-125 show a disabled placeholder.

2. **TransitionLayer fully functional**: `TransitionLayer.tsx` reads `transitionType` and `transitionDuration` from context and applies CSS transitions. No code changes needed in the player layer — only the settings UI needs wiring.

3. **Existing upload pattern**: `Uploader.tsx` demonstrates the blob-to-IndexedDB pattern: quota check via `navigator.storage.estimate()`, blob storage in `db.presentations`, progress indication. Milestone 3 uploads follow same pattern for overlays table.

4. **DB at v4**: `db.ts` has 4 schema versions. V5 needed for `overlays` table with fields: `++id, name, blob, createdAt, mimeType`.

5. **AnimationOverlay only renders SVG presets**: Lines 18-21 look up `PRESET_COMPONENTS[state.overlayPreset]`. Custom overlays need a `custom:<id>` preset path that renders an `<img>` instead.

6. **CSS animations in `src/styles/animations.css`**: Speed control (R17) needs `animation-duration` override — can use CSS custom property `--overlay-speed` that AnimationOverlay sets as inline style.

7. **Existing test pattern**: `milestone1.test.tsx` shows the mock pattern — `vi.mock('../store/db')` with mock `db.settings` and `db.presentations`. Milestone 3 tests follow same pattern, adding mock `db.overlays`.

### Design Constraints

- CSS-only animations (no JS animation loops) — speed must be CSS `animation-duration` or `animation-play-state`
- Pointer-events-none overlay layer must remain intact for kiosk touch-through
- 24/7 unattended operation: uploaded assets must not leak memory (blobs cleaned up on delete, `<img>` elements unmounted when deselected)

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
