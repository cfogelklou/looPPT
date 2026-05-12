# PRD: LooPPT Perpetual Presentation PWA

## Tech Stack
- **Language:** TypeScript
- **Framework:** React
- **Build Tool:** Vite
- **Styling:** Tailwind CSS, Material UI
- **Persistence:** Dexie.js (IndexedDB)
- **PWA:** `vite-plugin-pwa`
- **PPTX Rendering:** `@kandiforge/pptx-renderer`
- **Testing:** Vitest, React Testing Library

## Architecture Overview
LooPPT is an offline-first React PWA that uses IndexedDB (via Dexie.js) to persist PPTX blobs and playback settings, ensuring continuous operation across power cycles. A central Playback Coordinator manages the looping logic, timing, and navigation, while `@kandiforge/pptx-renderer` handles the conversion of PPTX data into browser-renderable elements. The application shell is cached using a Service Worker to provide full offline capability, and the UI is designed for kiosk environments with specialized features like Wake Lock and fullscreen gestures.

## Milestones

| ID | Name | Description | Status | Mode |
|---|---|---|---|---|
| 1 | MVP Perpetual Player | Core infrastructure, Dexie schema, PPTX upload UI, and basic looping playback logic. | PENDING | |
| 2 | Production Kiosk Features | Integration of Wake Lock/Fullscreen APIs, settings panel, and auto-resume persistence. | PENDING | |
