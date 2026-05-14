# Plan: Slideshow Export/Import for looPPT

## Context

LooPPT stores presentations, settings, and custom overlays in IndexedDB (Dexie.js). There's no way to share a slideshow setup between devices or back it up. This feature adds export (download as .zip) and import (upload .zip) to the Settings drawer, enabling offline slideshow transfer without a backend.

## Decisions Made

- **Scope**: Single slideshow export (one presentation + its settings + custom overlays)
- **Format**: ZIP via JSZip (already installed as dependency)
- **Extension**: Standard `.zip`
- **Import behavior**: Add alongside existing data; imported becomes active presentation
- **UI**: Two buttons at bottom of Settings drawer; export hidden when no presentation
- **Uploader access**: Import always available — add SettingsOverlay to Uploader screen too

## Zip Structure

```
slideshow.zip
├── manifest.json        # version, presentation metadata, settings, overlay index
├── presentation.pdf     # or .pptx
└── overlays/
    ├── 1.png
    └── 2.gif
```

### Manifest Schema

```typescript
{
  version: 1,
  exportedAt: number,          // Date.now()
  presentation: {
    name: string,
    sourceType: 'pdf' | 'pptx',
    filename: string           // "presentation.pdf"
  },
  settings: {                  // all Settings fields except id & presentationId
    currentSlide, interval, fitMode, overlayEnabled, overlayPreset,
    overlaySize, overlayOpacity, overlaySpeed, overlayFrequency,
    transitionType, transitionDuration
  },
  overlays: Array<{
    id: number,                // original ID for remapping
    name: string,
    mimeType: string,
    filename: string,          // "overlays/1.png"
    createdAt: number
  }>
}
```

## Files to Change

### 1. New: `looPPT/src/store/slideshowIO.ts`

Core export/import logic.

**`exportSlideshow(): Promise<{ blob: Blob; filename: string }>`**
1. Read `db.settings.get('current')` — throw if no `presentationId`
2. Read `db.presentations.get(settings.presentationId)` — throw if missing
3. Read `db.overlays.toArray()` — get all custom overlays (they're shared/global, not per-presentation)
4. Build manifest with settings (minus `id` and `presentationId`), presentation metadata, overlay index
5. Create JSZip: add `manifest.json`, presentation blob as `presentation.{pdf|pptx}`, overlay blobs under `overlays/{id}.{ext}`
6. Generate zip blob, build filename: `{sanitizedName}_{YYYY-MM-DD}.zip`
7. Return `{ blob, filename }`

**`importSlideshow(zipBlob: Blob): Promise<void>`**
1. `JSZip.loadAsync(zipBlob)` — parse zip
2. Read `manifest.json` from zip — throw if missing
3. Validate `version === 1`
4. Read presentation file blob from zip
5. Insert overlay records → build `Map<oldId, newId>`
6. Insert presentation record → capture new ID
7. Remap `overlayPreset` if `custom:N` using ID map
8. `db.settings.put({ ...manifest.settings, id: 'current', presentationId: newId })`

**Error handling:**
- Missing manifest → throw "Invalid slideshow file"
- Invalid JSON → throw "Corrupted slideshow file"
- Missing presentation file → throw
- Missing overlay file → skip, continue
- Storage quota exceeded → catch DOMException, throw with message

### 2. Modify: `looPPT/src/components/SettingsOverlay.tsx`

- Add state: `isExporting`, `isImporting`, `exportImportError`, `importInputRef`
- Add `handleExport` — calls `exportSlideshow()`, triggers download via anchor element
- Add `handleImport` — validates `.zip` extension, calls `importSlideshow()`, reloads on success
- Add "Slideshow Transfer" section above the existing bottom buttons (before line 445)
  - `Export Slideshow` button — conditionally rendered when `state.presentationId` exists
  - `Import Slideshow` button — always rendered
  - Hidden file input for import
- Add second Snackbar for `exportImportError`

### 3. Modify: `looPPT/src/App.tsx`

Add `<SettingsOverlay />` to the Uploader path (line 33-46) so import works when no presentation is loaded. The gear icon will be visible on this screen (not hover-dependent — see below).

### 4. Modify: `looPPT/src/components/SettingsOverlay.tsx` (gear icon)

Change gear icon visibility: add `alwaysShowGear?: boolean` prop. When true, skip the `opacity-0 group-hover:opacity-100` classes. App.tsx passes `alwaysShowGear` when rendering on the Uploader screen (which lacks a `group` parent).

## Implementation Order

1. Create `slideshowIO.ts` with export + import functions
2. Add export/import UI to `SettingsOverlay.tsx`
3. Add `SettingsOverlay` to `App.tsx` Uploader path with `alwaysShowGear` prop
4. Test: export a slideshow, verify zip contents, import on fresh state

## Verification

1. `cd looPPT && bun install && bun run build` — no type/lint errors
2. Load a PDF presentation, configure animation overlay with a custom image
3. Click Export → verify .zip downloads
4. Inspect .zip: contains manifest.json, presentation file, overlays folder
5. Load New Presentation (clear current), then click Import → select the .zip
6. Verify: presentation plays with same settings, custom overlay appears
7. Verify on Uploader screen: import button accessible via gear icon
