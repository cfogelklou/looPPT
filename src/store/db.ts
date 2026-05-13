import Dexie, { type Table } from 'dexie';

export type PresentationSourceType = 'pdf' | 'pptx';

export interface Presentation {
  id?: number;
  name: string;
  sourceType: PresentationSourceType;
  blob: Blob;
  updatedAt: number;
}

export interface Settings {
  id: string; // 'current'
  presentationId?: number;
  currentSlide: number;
  interval: number; // in seconds
  fitMode: 'contain' | 'cover';
}

export class LooPPTDatabase extends Dexie {
  presentations!: Table<Presentation>;
  settings!: Table<Settings>;

  constructor() {
    super('LooPPTDatabase');
    this.version(1).stores({
      presentations: '++id, name, updatedAt',
      settings: 'id'
    });
    this.version(2).stores({
      presentations: '++id, name, updatedAt',
      settings: 'id'
    }).upgrade(tx => {
      return tx.table('presentations').toCollection().modify(pres => {
        pres.sourceType = 'pptx';
      });
    });
  }
}

export const db = new LooPPTDatabase();

export const INITIAL_SETTINGS: Settings = {
  id: 'current',
  currentSlide: 0,
  interval: 5,
  fitMode: 'contain'
};

export async function ensureSettings() {
  const settings = await db.settings.get('current');
  if (!settings) {
    await db.settings.add(INITIAL_SETTINGS);
  }
  return settings || INITIAL_SETTINGS;
}

export async function factoryReset() {
  try {
    await db.delete();
  } catch {
    // IndexedDB may be blocked — proceed with reload anyway
  }
  window.location.reload();
}
