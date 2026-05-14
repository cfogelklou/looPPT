import JSZip from 'jszip';
import { db, type Settings, type PresentationSourceType } from './db';

const MAX_ZIP_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_ZIP_FILES = 100;

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
    !manifest.settings
  ) {
    throw new SlideshowIOError('Invalid slideshow file: incomplete manifest.');
  }

  // Read presentation file
  const presExt = manifest.presentation.sourceType;
  const presFile = zip.file(`presentation.${presExt}`);
  if (!presFile) {
    throw new SlideshowIOError('Invalid slideshow file: missing presentation.');
  }

  const presData = await presFile.async('arraybuffer');
  const mimeType =
    presExt === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  const presBlob = new Blob([presData], { type: mimeType });

  // Atomic import via Dexie transaction
  return db.transaction(
    'rw',
    [db.presentations, db.settings, db.overlays],
    async () => {
      // Insert overlays and build ID remap
      const idMap = new Map<number, number>();
      const skippedIds = new Set<number>();

      if (manifest.overlays) {
        for (const entry of manifest.overlays) {
          const overlayFile = zip.file(entry.filename);
          if (!overlayFile) {
            skippedIds.add(entry.originalId);
            continue;
          }
          const overlayData = await overlayFile.async('arraybuffer');
          const overlayBlob = new Blob([overlayData], {
            type: entry.mimeType,
          });
          const newId = await db.overlays.add({
            name: entry.name,
            blob: overlayBlob,
            mimeType: entry.mimeType,
            createdAt: Date.now(),
          });
          idMap.set(entry.originalId, newId as number);
        }
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
