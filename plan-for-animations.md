# Animation System for looPPT

## Context

looPPT currently swaps slides via a simple CSS opacity toggle. Users want visual polish: animated overlays (bouncing basketball, floating logo) on top of slides, and animated transitions (crossfade, slide, wipe, dissolve) between slides. Two independent systems, configurable per-presentation with global defaults.

## Decisions (from grill session)

- **Two systems**: slide transitions + overlay animations (independent)
- **Built-in overlays**: 5-10 static SVGs, moved via CSS transforms/JS
- **User-uploaded overlays**: single PNG/GIF, moved via CSS transforms (no sprite sheets)
- **Motion presets**: bounce, fly-left-to-right, fly-right-to-left, float, orbit, pulse
- **Single overlay** active at a time
- **Transitions**: crossfade, slide/push, wipe, dissolve
- **Config**: global defaults in settings, per-presentation overrides
- **UI**: extend existing SettingsOverlay drawer

## Architecture

### New Files

- `src/components/AnimationOverlay.tsx` — renders the active overlay (SVG/PNG/GIF) with CSS motion
- `src/components/TransitionLayer.tsx` — handles slide transition effects
- `src/store/AnimationContext.tsx` — overlay + transition state, config
- `src/data/builtInOverlays.ts` — SVG paths and metadata for built-in overlays
- `src/data/transitionTypes.ts` — transition type enum and config
- `src/assets/overlays/` — built-in SVG files (basketball, football, star, arrow, logo placeholder, etc.)

### Modified Files

- `src/components/SettingsOverlay.tsx` — add transition picker + overlay picker sections
- `src/components/PlayerShell.tsx` — render `<AnimationOverlay />` on top of children, wrap slides in `<TransitionLayer />`
- `src/components/PdfPlayer.tsx` — integrate TransitionLayer for slide changes
- `src/components/PptxPlayer.tsx` — integrate TransitionLayer for slide changes
- `src/store/db.ts` — new `overlays` table for user-uploaded assets, settings fields for animation config
- `src/store/PlaybackContext.tsx` — may need transition timing awareness

## Implementation Steps

### Step 1: Data model & persistence

Extend `db.ts`:
```typescript
// New settings fields
interface AnimationSettings {
  transitionType: 'crossfade' | 'slide' | 'wipe' | 'dissolve';
  transitionDuration: number; // ms
  overlayId: string | null; // built-in key or uploaded overlay id
  overlayMotion: 'bounce' | 'fly-lr' | 'fly-rl' | 'float' | 'orbit' | 'pulse';
  overlaySize: number; // px
  overlayOpacity: number; // 0-1
}

// New table for user-uploaded overlays
interface OverlayAsset {
  id?: number;
  name: string;
  blob: Blob; // PNG or GIF
  createdAt: number;
}
```

Add `overlays` table to Dexie schema (version 3 migration).

### Step 2: Built-in overlay assets

Create `src/data/builtInOverlays.ts` with 5-10 SVG entries:
```typescript
export interface BuiltInOverlay {
  id: string;
  name: string;
  svg: string; // inline SVG or path to asset
  category: string;
}
```

Built-in SVGs: basketball, football, soccer ball, star, arrow, sparkle, trophy, music note, heart, lightning bolt.

Place SVG files in `src/assets/overlays/`. Import via Vite (`?url` or inline).

### Step 3: AnimationOverlay component

`src/components/AnimationOverlay.tsx`:
- Takes overlay config (asset source, motion preset, size, opacity)
- Renders the image (SVG inline for built-in, `<img>` for uploads) in an absolutely positioned layer on top of slides
- Applies CSS keyframe animations based on motion preset
- Only renders when an overlay is configured
- Must not block pointer events on slides underneath

Motion presets as CSS keyframes:
- **bounce**: translateX across screen, translateY bounce, repeat
- **fly-lr**: translateX -100% to 100%, repeat
- **fly-rl**: translateX 100% to -100%, repeat
- **float**: gentle random-ish drift with small translate + rotate
- **orbit**: circular path around center
- **pulse**: scale 0.8 → 1.2 → 0.8, opacity variation, centered

### Step 4: TransitionLayer component

`src/components/TransitionLayer.tsx`:
- Wraps slide content
- Takes current slide index and transition type
- On slide change, applies transition effect between old and new slide
- Uses CSS transitions/animations, not JS animation frames (for kiosk performance)

Transition implementations:
- **crossfade**: existing opacity toggle (already works)
- **slide/push**: translateX on both outgoing and incoming slides
- **wipe**: clip-path animation on incoming slide
- **dissolve**: random block reveal via CSS grid clip

### Step 5: AnimationContext

`src/store/AnimationContext.tsx`:
- Provides animation settings (overlay + transition config)
- Resolves global defaults vs per-presentation overrides
- Manages uploaded overlay CRUD

### Step 6: SettingsOverlay extension

Add two new sections to the existing MUI drawer:

**Transitions section:**
- Dropdown: transition type (crossfade, slide, wipe, dissolve)
- Slider: transition duration (200ms - 2000ms)

**Overlays section:**
- Grid of built-in overlay thumbnails (SVGs)
- "Upload Custom" button (PNG/GIF upload to IndexedDB)
- Dropdown: motion preset
- Slider: size (32px - 256px)
- Slider: opacity (0 - 100%)
- "None" option to disable

### Step 7: Wire into PlayerShell

`PlayerShell.tsx` already wraps all player content. Add:
- `<AnimationOverlay />` as a layer above `{children}` but below manual controls
- Both `PdfPlayer` and `PptxPlayer` use `TransitionLayer` internally for their slide swap

## Performance Constraints (24/7 kiosk)

- CSS animations, not JS `requestAnimationFrame` loops
- Single overlay only — no stacking
- Overlay asset loaded once, cached in memory
- GIFs: render as `<img>`, browser handles frame cycling
- SVGs: inline or `<object>`, CSS transforms for motion

## Verification

1. `bun run test:run` — existing tests still pass
2. `bun run build` — no build errors, check bundle size impact
3. `bun run dev` — manual testing:
   - Upload a PDF, configure a bounce overlay, verify basketball bounces across slides
   - Switch transition to slide/push, verify slides push correctly
   - Upload a custom PNG overlay, verify it appears and animates
   - Set overlay to "None", verify no overlay renders
   - Verify overlay doesn't block slide controls on hover
