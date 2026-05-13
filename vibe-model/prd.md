# PRD: LooPPT Animation System

## Goal

Add two independent animation systems to LooPPT: animated overlays (SVG/PNG assets that move across slides) and slide transitions (crossfade, slide, wipe, dissolve). Both configurable via settings with built-in presets. Preserves 24/7 kiosk reliability.

## Tech Stack

- **Runtime**: Node 22, Bun
- **Framework**: React 19 + TypeScript 6
- **Build**: Vite 8
- **Styling**: Tailwind CSS 4 + MUI 5 (emotion) — existing stack, no additions
- **Persistence**: Dexie.js (IndexedDB) — schema migration to v3
- **Testing**: Vitest + React Testing Library + jsdom
- **Animation**: CSS keyframes + CSS transitions (no JS animation loops)

## Architecture Overview

Two independent systems layered onto the existing PlayerShell/PdfPlayer/PptxPlayer architecture. **AnimationOverlay** renders an absolutely-positioned, pointer-events-none layer above slide content, driven by CSS keyframe presets (bounce, fly, float, orbit, pulse). **TransitionLayer** wraps the slide rendering area inside PdfPlayer/PptxPlayer, applying CSS transition effects on slide index change. A new **AnimationContext** manages overlay/transition settings with debounced IndexedDB persistence, resolving global defaults. The existing **SettingsOverlay** MUI drawer gains two new sections for configuration. DB schema migrates to v3 with animation settings fields and an `overlays` table for user-uploaded assets.

## Milestones

| ID | Name | Description | Status | Mode |
|----|------|-------------|--------|------|
| 1 | Overlays MVP | AnimationContext, db v3 migration, built-in SVG overlays, AnimationOverlay component with CSS keyframe presets, wired into PlayerShell. User sees animated overlay on slides. | COMPLETE | |
| 2 | Slide Transitions | TransitionLayer component with crossfade/slide/wipe/dissolve effects, integrated into PdfPlayer and PptxPlayer slide swapping. | COMPLETE | |
| 3 | Settings UI & Uploads | Extend SettingsOverlay with transition picker, overlay picker (built-in grid + custom upload), motion/size/opacity controls. User-uploaded PNG/GIF stored in IndexedDB overlays table. | IN_PROGRESS | |
