# Plan: Fix PPTX Rendering & Kiosk Overlay

## Context

LooPPT renders PPTX using `@kandiforge/pptx-renderer` (canvas-based). Visual comparison against Google Slides (all 7 slides, via Gemini CLI) reveals widespread failures. Additionally, the KioskEntryOverlay blocks the entire UI when not in fullscreen.

**Rendering failures identified** (from Gemini visual analysis):
- **Slide 1**: All text missing (title, subtitle, tagline)
- **Slide 2**: Wrong font (serif fallback), missing emoji icon, text position off
- **Slide 3**: Wrong font, smaller font size, hyperlink styling lost, tight spacing
- **Slide 4**: Background image completely missing, all text missing, replaced by solid blocks
- **Slide 5**: Text inside shapes completely missing, boxes rendered empty
- **Slide 6**: Text below icons missing, icons too small
- **Slide 7**: Table content missing, renders as solid black block, header text missing, background gradient lost

**Root cause**: `@kandiforge/pptx-renderer` has fundamental issues with text-in-shapes, theme font resolution, image rendering, table rendering, and color/theme handling.

---

## Alternative Library Research

### `@jvmr/pptx-to-html` (Recommended replacement)
- **Approach**: PPTX → HTML (absolutely positioned divs, not canvas)
- **License**: MIT
- **Updated**: March 2026 (active)
- **Size**: 287 KB (vs kandiforge's 4.3 MB)
- **Renders**: Text boxes, images, shapes, tables, charts
- **Browser support**: Modern evergreen browsers
- **API**: `pptxToHtml(buffer, { width, height, scaleToFit, letterbox })` → `string[]`
- **Pros**: HTML rendering (CSS fonts, no canvas issues), handles tables/shapes, tiny bundle, actively maintained
- **Cons**: Not pixel-perfect, no animations/transitions, no font embedding
- **GitHub**: https://github.com/javier-mora/pptx-to-html

### `pptxviewjs`
- **Approach**: Canvas rendering (similar to current)
- **Updated**: March 2026
- **Size**: 4.3 MB
- **Likely same category of issues as kandiforge** — canvas-based, may have similar font/text problems

### Assessment
`@jvmr/pptx-to-html` is the best option — HTML rendering naturally handles fonts, text layout, and CSS styling better than canvas. Tables and shapes with text should render correctly since they use DOM elements.

---

## Implementation

### Step 1: Fix KioskEntryOverlay
**File**: `src/components/KioskEntryOverlay.tsx`

Add dismiss functionality:
- Add `[x]` dismiss button to overlay
- Store `dismissed` state in component
- Overlay shows on mount, user can click X to dismiss
- Does NOT re-show on every fullscreen change — only on initial load
- Keep "Start Kiosk" button prominent

### Step 2: Replace @kandiforge/pptx-renderer with @jvmr/pptx-to-html
**Files**: `src/components/Player.tsx`, `package.json`

1. `bun remove @kandiforge/pptx-renderer`
2. `bun add @jvmr/pptx-to-html`
3. Rewrite `Player.tsx`:
   - Replace `parsePPTX()` + `SlideView` with `pptxToHtml(buffer, opts)`
   - Store HTML strings in state instead of `PPTXData`
   - Render slides using `dangerouslySetInnerHTML` in positioned divs
   - Keep sliding window pattern (only 3 slides in DOM)
   - Keep same navigation controls and state machine

4. Key API usage:
```typescript
import { pptxToHtml } from 'pptx-to-html';

const slidesHtml = await pptxToHtml(buffer, {
  width: dimensions.width,
  height: dimensions.height,
  scaleToFit: true,
  letterbox: true,
});
```

### Step 3: Update sliding window for HTML rendering
**File**: `src/components/Player.tsx`

Current sliding window uses `SlideView` canvas components. Replace with:
```tsx
{visibleIndices.map((idx) => (
  <div
    key={idx}
    className="absolute inset-0"
    style={{
      opacity: idx === currentSlide ? 1 : 0,
      visibility: idx === currentSlide ? 'visible' : 'hidden',
    }}
    dangerouslySetInnerHTML={{ __html: slidesHtml[idx] }}
  />
))}
```

### Step 4: Remove unused code
- Remove `SlideView`, `parsePPTX`, `PPTXData` imports
- Update `PlaybackContext` if it references slide count from PPTXData
- Update tests that mock `parsePPTX`

### Step 5: Verify rendering
- Load test.pptx, navigate all 7 slides
- Compare with Google Slides originals via Playwright screenshots + Gemini CLI
- Check: text rendering, fonts, tables, shapes, images, colors
- Run `bun run test:run` for existing tests
- Run `bun run build` for production build

---

## Verification

1. `bun run dev`, load test.pptx
2. **Kiosk overlay**: Can dismiss without fullscreen, slides visible
3. **Rendering**: Capture all 7 slides via Playwright, compare with Google Slides
4. **Tests**: `bun run test:run` passes
5. **Build**: `bun run build` succeeds
