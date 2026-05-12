import Dexie, { type Table } from 'dexie';

export interface Presentation {
  id?: number;
  name: string;
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
