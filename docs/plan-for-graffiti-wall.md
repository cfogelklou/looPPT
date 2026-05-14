# URL Slide Feature — Embed Web Page as Last Slide

## Context

User wants to append a web page (YouTube video, graffiti wall, etc.) as the final slide in the presentation loop. Uses iframe embedding. Single configurable URL. Same interval as other slides.

## Scope

- One URL field in settings
- URL rendered as `<iframe>` appended after the last PDF/PPTX slide
- Counts as `totalSlides + 1` in the sequence
- Same interval as other slides (no special duration)
- iframe embedding — user responsible for providing embeddable URLs (e.g., YouTube `/embed/` URLs)

## Files to Modify

### 1. `src/store/db.ts` — Add URL field to Settings

Add field:
```typescript
embedUrl?: string; // URL to embed as last slide, empty = disabled
```

Add db version 7 migration to set default `embedUrl: ''`.

### 2. `src/components/PdfPlayer.tsx` and `src/components/PptxPlayer.tsx`

Both players currently compute `totalSlides` from the document. When `embedUrl` is set:
- Increment `totalSlides` by 1 (dispatch `SET_TOTAL_SLIDES` with `doc.numPages + 1`)
- When `currentSlide === totalSlides - 1` (the extra slide), render the iframe instead of a canvas/SlideView
- Add the iframe to the sliding window logic

### 3. `src/components/SettingsOverlay.tsx`

Add a text field for the embed URL in settings:
- MUI `TextField` with URL placeholder
- Helper text: "Embeddable URL only (e.g., YouTube /embed/ URLs). Many sites block iframe embedding."
- Clear button to remove the URL

### 4. `src/store/PlaybackContext.tsx`

No changes needed — totalSlides already includes the +1 from the player dispatch.

### 5. `src/store/AnimationContext.tsx` — No changes needed

Animation overlay renders on top of everything including the iframe slide.

## Implementation Details

### iframe slide rendering (in PdfPlayer/PptxPlayer)

```tsx
// In the sliding window render, add the iframe as the last index
const embedSlideIndex = embedUrl ? totalSlides - 1 : -1;

// When rendering visible slides, if idx === embedSlideIndex:
{idx === embedSlideIndex && (
  <iframe
    src={idx === currentSlideIndex ? embedUrl : ''}
    className="w-full h-full border-0"
    allow="autoplay; fullscreen"
    title="Embedded content"
  />
)}
```

**Critical: `src` management** — Set `src=""` when slide is NOT active to kill audio/video playback. Prevents "ghost audio" from YouTube embeds playing after slide transitions away.

### URL validation

- Strip whitespace
- If empty or falsy, feature is disabled (no extra slide)
- Enforce `https://` only (mixed content blocks `http://` on HTTPS site)
- **Preview button** in settings to test the URL loads before saving

### iframe focus stealing

Iframes capture keyboard focus on click. For kiosk operation:
- Attach global keyboard listeners to `window` (not `document`)
- The iframe slide is non-interactive by default (pointer-events pass through to playback controls)
- If interactivity is needed, add a "tap to interact" overlay

### YouTube hint

In settings, helper text should note: "For YouTube, use `https://www.youtube.com/embed/VIDEO_ID`"

## Verification

1. `bun run build` — no errors
2. `bun run test:run` — all tests pass (may need mock updates for new settings field)
3. `bun run dev` manual:
   - Upload a PDF with 3 slides
   - Set embed URL to `https://www.youtube.com/embed/dQw4w9WgXcQ`
   - Verify slide counter shows "4 slides"
   - Verify iframe appears on slide 4
   - Verify loop continues back to slide 1
   - Clear URL, verify back to 3 slides

---

## Graffiti Wall PWA — Build Prompt for Another Agent

### Context

The graffiti wall is a companion PWA to looPPT. Standalone app deployed at `/graffitiwall/` on applicaudia.se. Users embed its URL in looPPT's "embed URL" setting to show it as the last slide. People at the kiosk write messages that display for the next rotation.

### Architecture

New app in monorepo at `/Volumes/Projects/dev/applicaudia_web/graffitiwall/`. Follow monorepo pattern from `CLAUDE.md`:

- React 19 + Vite 8 + TypeScript + Tailwind CSS 4
- `base: '/graffitiwall/'` in vite.config.ts
- Offline-first PWA with `vite-plugin-pwa`
- Backend: **Firebase** (Firestore for messages, Firebase Auth if needed)
- Persistence: Firebase Firestore for cross-device sharing + local cache

### Requirements

**Core functionality:**
1. **Drawing input**: Users can write/draw with their fingers on a canvas (freehand drawing). Think: real graffiti — finger painting on a white wall.
2. **Text input**: Option to type text graffiti instead of drawing. Toggle between draw mode and type mode.
3. **Color picker**: Choose font/pen color from a palette. Both typed text and drawings use the selected color.
4. **Message display**: All contributions appear on a shared white wall. Drawings and text mixed together, scattered like real graffiti.
5. **Firebase backend**: Messages sync to Firestore so multiple kiosks see the same wall. Real-time updates via Firestore `onSnapshot`.
6. **Auto-cleanup**: Messages older than 24 hours auto-deleted via Firestore TTL or client-side filter.
7. **Kiosk-friendly**: Large touch targets (min 44px), fullscreen-friendly.
8. **Embedded-aware**: Works inside an iframe. Detect iframe mode, hide unnecessary chrome.
9. **No auth for MVP**: Anyone at the kiosk can write. Firestore security rules allow reads/writes.

**Visual style:**
- **White background by default** — like a real wall
- User-chosen colors for pen/text
- Scattered/staggered layout for typed messages
- Finger drawings rendered as canvas strokes
- New contributions animate in

**Tech decisions:**
- Firebase Firestore for real-time message sync
- Canvas API for freehand drawing input
- Max message count: 200 (client-side enforcement)
- No image/file uploads — drawing + text only

### Firebase Config

- Firestore collection: `messages`
- Document schema (drawings stored as SVG path data, NOT base64 — base64 exceeds Firestore 1MB doc limit and causes massive data transfer):
```typescript
interface GraffitiMessage {
  id: string;
  type: 'text' | 'drawing';
  content: string;           // text content for type='text', SVG path string for type='drawing' (e.g. "M 10 10 L 20 20...")
  color: string;             // hex color chosen by user
  strokeWidth: number;       // line width for drawings
  position: { x: number; y: number };  // random position on wall (text only)
  rotation: number;          // random -5 to 5 degrees (text only)
  createdAt: number;         // timestamp for TTL
}
```

**Firestore security rules (MVP):**
- Allow create: max 1 per 5 seconds per IP, max content length 10KB
- Allow read: open
- Allow delete: admin only (via Firebase Admin SDK or a cloud function)
- Enforce document schema validation in rules

### File Structure

```
graffitiwall/
  package.json
  vite.config.ts
  tsconfig.json
  index.html
  firebase.json             # Firebase hosting config (if needed)
  src/
    App.tsx                 # Entry: wall + input
    components/
      GraffitiWall.tsx      # Renders all messages (text + drawings)
      DrawingCanvas.tsx     # Freehand drawing input
      TextInput.tsx         # Text graffiti input
      ColorPicker.tsx       # Color palette selector
      GraffitiMessage.tsx   # Single message render (text or drawing)
    store/
      firebase.ts           # Firebase init + Firestore helpers
      types.ts
  CLAUDE.md
```

### Embed URL

```
https://applicaudia.se/graffitiwall/
```

### Prompt for Agent

> Create a new PWA app called "Graffiti Wall" in `/Volumes/Projects/dev/applicaudia_web/graffitiwall/`.
>
> It's a touch-friendly digital graffiti wall for kiosk screens. Users can write text OR draw freehand with their fingers on a white background. They choose their pen/text color from a palette. Messages sync via Firebase Firestore so multiple kiosks see the same wall.
>
> Tech stack: React 19, Vite 8, TypeScript 6, Tailwind CSS 4, Firebase (Firestore), vite-plugin-pwa. Base path: `/graffitiwall/`. Use bun as package manager.
>
> **Visual**: White background (like a real wall). User-chosen colors for text and drawings. Scattered/staggered layout for typed messages with slight random rotation. Freehand drawings rendered as SVG paths (NOT base64 — base64 exceeds Firestore 1MB doc limit). New contributions animate in.
>
> **Drawing storage**: Store drawings as SVG path strings (e.g. `"M 10 10 L 20 20..."`). Capture canvas strokes, convert to SVG path data. Re-render from path data on display. This keeps documents small (a few KB vs hundreds of KB for base64).
>
> **Input modes**: (1) Draw mode — finger painting on canvas with chosen color. (2) Type mode — text input with chosen color. Toggle between modes. Large touch-friendly controls.
>
> **Backend**: Firebase Firestore. Collection `messages` with fields: type (text/drawing), content (text string or SVG path string), color (hex), strokeWidth (number, for drawings), position ({x,y}, for text), rotation (degrees, for text), createdAt (timestamp). Real-time sync via onSnapshot. No auth for MVP. Messages auto-cleanup after 24 hours.
>
> **Firestore security rules**: Max 1 write per 5 seconds, max content length 10KB per document, open reads, admin-only deletes. Include basic schema validation.
>
> **Vandalism**: Include a hidden admin gesture (e.g., long-press 5 seconds on logo) to clear all messages. Include a basic profanity filter for text input mode.
>
> **Layout**: Use collision-aware placement — don't completely overlap existing messages. Fade older messages as count approaches 200.
>
> **iframe**: Must work inside an iframe (for embedding in looPPT). Detect with `window.self !== window.top`. Hide unnecessary chrome when embedded.
>
> Follow the monorepo patterns in `/Volumes/Projects/dev/applicaudia_web/CLAUDE.md` for setup. Include CLAUDE.md in the new app directory.
>
> Firebase config should use environment variables (`VITE_FIREBASE_*`) for API key, project ID, etc. Provide a `.env.example` file.
