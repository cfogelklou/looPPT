# PRD: LooPPT Perpetual Presentation PWA

## Tech Stack
- **Language:** TypeScript
- **Framework:** React
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Persistence:** Dexie.js (IndexedDB)
- **PWA:** vite-plugin-pwa
- **PPTX Rendering:** @kandiforge/pptx-renderer
- **Testing:** Vitest, React Testing Library

## Architecture Overview
LooPPT is a standalone React SPA designed for offline-first kiosk presentation looping. It uses Dexie.js to persist PPTX files and settings in IndexedDB, enabling auto-resume functionality without server dependence. The core rendering logic is encapsulated in a modular hook that integrates `@kandiforge/pptx-renderer` with a responsive, auto-scaling viewport. A central playback coordinator manages the slide lifecycle, handling global timing, manual navigation overrides, and kiosk-specific browser APIs (Wake Lock, Fullscreen).

## Milestones

| ID | Name | Description | Status | Mode |
|----|------|-------------|--------|------|
| 1 | MVP Perpetual Player | Scaffold Vite/React project with PWA and Dexie. Implement PPTX upload, IndexedDB persistence, and a basic auto-looping playback engine with manual navigation in a dark UI. | PENDING | |
| 2 | Production Kiosk Features | Integrate Screen Wake Lock and Fullscreen APIs with gesture-based entry fallbacks. Add operator settings for slide intervals/fit modes and enhance rendering viewport scaling/error handling. | PENDING | |
