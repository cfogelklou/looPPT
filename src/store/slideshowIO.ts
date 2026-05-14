import JSZip from 'jszip';
import { db, type Settings, type PresentationSourceType } from './db';

const MAX_ZIP_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_ZIP_FILES = 100;
const MAX_INFLATED_SIZE = 500 * 1024 * 1024; // 500MB
const VALID_SOURCE_TYPES: PresentationSourceType[] = ['pdf', 'pptx'];

export class SlideshowIOError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SlideshowIOError';
  }
}

interface ExportManifest {
  version: 1;
  exportedAt: number;
  presentation: {
    name: string;
    sourceType: PresentationSourceType;
  };
  settings: Omit<Settings, 'id' | 'presentationId'>;
  overlays: Array<{
    originalId: number;
    name: string;
    mimeType: string;
    filename: string;
  }>;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '_');
}

function getExtensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  };
  return map[mimeType] || 'png';
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportSlideshow(): Promise<void> {
  const settings = await db.settings.get('current');
  if (!settings?.presentationId) {
    throw new SlideshowIOError('No active presentation to export.');
  }

  const presentation = await db.presentations.get(settings.presentationId);
  if (!presentation) {
    throw new SlideshowIOError('Presentation data not found.');
  }

  const overlays = await db.overlays.toArray();

  // Ensure export won't exceed import file limit (manifest + presentation + overlays)
  if (overlays.length + 2 > MAX_ZIP_FILES) {
    throw new SlideshowIOError('Too many overlays to export.');
  }

  const { id: _id, presentationId: _pid, ...settingsFields } = settings;

  const overlayEntries = overlays.map((o) => ({
    originalId: o.id!,
    name: o.name,
    mimeType: o.mimeType,
    filename: `overlays/${o.id}.${getExtensionFromMime(o.mimeType)}`,
  }));

  const manifest: ExportManifest = {
    version: 1,
    exportedAt: Date.now(),
    presentation: {
      name: presentation.name,
      sourceType: presentation.sourceType,
    },
    settings: settingsFields,
    overlays: overlayEntries,
  };

  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file(`presentation.${presentation.sourceType}`, presentation.blob);

  for (const overlay of overlays) {
    const filename = `overlays/${overlay.id}.${getExtensionFromMime(overlay.mimeType)}`;
    zip.file(filename, overlay.blob);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${sanitizeFilename(presentation.name)}_${date}.zip`;
  downloadBlob(blob, filename);
}

export async function importSlideshow(zipBlob: Blob): Promise<number> {
  if (zipBlob.size > MAX_ZIP_SIZE) {
    throw new SlideshowIOError('File too large.');
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipBlob);
  } catch {
    throw new SlideshowIOError('Corrupted slideshow file.');
  }

  // Security: file count and path traversal checks
  const fileNames = Object.keys(zip.files);
  if (fileNames.length > MAX_ZIP_FILES) {
    throw new SlideshowIOError('Invalid slideshow file.');
  }
  for (const name of fileNames) {
    if (name.includes('..') || name.startsWith('/')) {
      throw new SlideshowIOError('Invalid slideshow file.');
    }
  }

  // Parse manifest
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    throw new SlideshowIOError('Invalid slideshow file: missing manifest.');
  }

  let manifest: ExportManifest;
  try {
    const manifestText = await manifestFile.async('string');
    manifest = JSON.parse(manifestText);
  } catch {
    throw new SlideshowIOError('Corrupted slideshow file.');
  }

  if (manifest.version !== 1) {
    throw new SlideshowIOError(
      'This slideshow requires a newer version of LooPPT.',
    );
  }

  // Validate required manifest fields
  if (
    !manifest.presentation?.name ||
    !manifest.presentation?.sourceType ||
    !VALID_SOURCE_TYPES.includes(manifest.presentation.sourceType) ||
    !manifest.settings
  ) {
    throw new SlideshowIOError('Invalid slideshow file: incomplete manifest.');
  }

  // Sanitize settings with defaults for missing/invalid fields
  const settings = manifest.settings;
  manifest.settings = {
    currentSlide: typeof settings.currentSlide === 'number' ? settings.currentSlide : 0,
    interval: typeof settings.interval === 'number' ? Math.max(1, Math.min(60, settings.interval)) : 5,
    fitMode: settings.fitMode === 'contain' || settings.fitMode === 'cover' ? settings.fitMode : 'contain',
    overlayEnabled: !!settings.overlayEnabled,
    overlayPreset: typeof settings.overlayPreset === 'string' ? settings.overlayPreset : 'none',
    overlaySize: typeof settings.overlaySize === 'number' ? Math.max(32, Math.min(256, settings.overlaySize)) : 100,
    overlayOpacity: typeof settings.overlayOpacity === 'number' ? Math.max(0.1, Math.min(1, settings.overlayOpacity)) : 1,
    overlaySpeed: typeof settings.overlaySpeed === 'number' ? Math.max(0.5, Math.min(3, settings.overlaySpeed)) : 1,
    overlayFrequency: typeof settings.overlayFrequency === 'number' ? Math.max(0.5, Math.min(60, settings.overlayFrequency)) : 5,
    transitionType: typeof settings.transitionType === 'string' ? settings.transitionType : 'none',
    transitionDuration: typeof settings.transitionDuration === 'number' && settings.transitionDuration > 0 ? settings.transitionDuration : 500,
    embedUrl: typeof settings.embedUrl === 'string' ? settings.embedUrl : '',
    wakeLockFallback: settings.wakeLockFallback === true,
  };

  // Read presentation file
  const presExt = manifest.presentation.sourceType;
  const presFile = zip.file(`presentation.${presExt}`);
  if (!presFile) {
    throw new SlideshowIOError('Invalid slideshow file: missing presentation.');
  }

  const presData = await presFile.async('arraybuffer');
  if (presData.byteLength > MAX_INFLATED_SIZE) {
    throw new SlideshowIOError('File too large.');
  }
  const mimeType =
    presExt === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  const presBlob = new Blob([presData], { type: mimeType });

  // Pre-read overlay blobs outside the transaction to avoid holding it open
  const overlayBlobs = new Map<number, { blob: Blob; name: string; mimeType: string }>();
  if (manifest.overlays) {
    for (const entry of manifest.overlays) {
      const overlayFile = zip.file(entry.filename);
      if (!overlayFile) continue;
      const overlayData = await overlayFile.async('arraybuffer');
      if (overlayData.byteLength > MAX_INFLATED_SIZE) continue;
      overlayBlobs.set(entry.originalId, {
        blob: new Blob([overlayData], { type: entry.mimeType }),
        name: entry.name,
        mimeType: entry.mimeType,
      });
    }
  }

  // Atomic import via Dexie transaction — DB writes only
  return db.transaction(
    'rw',
    [db.presentations, db.settings, db.overlays],
    async () => {
      const idMap = new Map<number, number>();

      for (const [originalId, { blob, name, mimeType }] of overlayBlobs) {
        const newId = await db.overlays.add({
          name,
          blob,
          mimeType,
          createdAt: Date.now(),
        });
        idMap.set(originalId, newId as number);
      }

      // Insert presentation
      const newPresentationId = await db.presentations.add({
        name: manifest.presentation.name,
        sourceType: manifest.presentation.sourceType,
        blob: presBlob,
        updatedAt: Date.now(),
      });

      // Remap overlayPreset
      let overlayPreset = manifest.settings.overlayPreset;
      if (typeof overlayPreset === 'string' && overlayPreset.startsWith('custom:')) {
        const oldId = parseInt(overlayPreset.replace('custom:', ''), 10);
        if (idMap.has(oldId)) {
          overlayPreset = `custom:${idMap.get(oldId)}` as Settings['overlayPreset'];
        } else {
          overlayPreset = 'none';
        }
      }

      // Write settings
      await db.settings.put({
        ...manifest.settings,
        id: 'current',
        presentationId: newPresentationId as number,
        overlayPreset,
      });

      return newPresentationId as number;
    },
  ).catch((err: unknown) => {
    if (
      err instanceof DOMException &&
      err.name === 'QuotaExceededError'
    ) {
      throw new SlideshowIOError(
        'Storage full. Delete presentations and try again.',
      );
    }
    throw err;
  });
}
