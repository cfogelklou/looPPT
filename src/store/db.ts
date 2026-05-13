import Dexie, { type Table, type Transaction } from 'dexie';

export type PresentationSourceType = 'pdf' | 'pptx';

export type OverlayPreset = 'bounce' | 'fly-across' | 'pulse' | 'none';

export type TransitionType = 'none' | 'crossfade' | 'slide' | 'wipe' | 'dissolve';

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
  overlayEnabled: boolean;
  overlayPreset: OverlayPreset;
  overlaySize: number;
  overlayOpacity: number;
  transitionType: TransitionType;
  transitionDuration: number;
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
    this.version(3).stores({
      presentations: '++id, name, updatedAt',
      settings: 'id'
    }).upgrade(upgradeV3Settings);
    this.version(4).stores({
      presentations: '++id, name, updatedAt',
      settings: 'id'
    }).upgrade(upgradeV4Settings);
  }
}

export async function upgradeV3Settings(tx: Transaction) {
  return tx.table('settings').toCollection().modify((s: Record<string, unknown>) => {
    if (s.overlayEnabled === undefined) {
      s.overlayEnabled = false;
      s.overlayPreset = 'none';
      s.overlaySize = 100;
      s.overlayOpacity = 1.0;
    }
  });
}

export async function upgradeV4Settings(tx: Transaction) {
  return tx.table('settings').toCollection().modify((s: Record<string, unknown>) => {
    if (s.transitionType === undefined) {
      s.transitionType = 'none';
      s.transitionDuration = 500;
    }
  });
}

export const db = new LooPPTDatabase();

export const INITIAL_SETTINGS: Settings = {
  id: 'current',
  currentSlide: 0,
  interval: 5,
  fitMode: 'contain',
  overlayEnabled: false,
  overlayPreset: 'none',
  overlaySize: 100,
  overlayOpacity: 1.0,
  transitionType: 'none',
  transitionDuration: 500,
};

export async function ensureSettings() {
  const settings = await db.settings.get('current');
  if (!settings) {
    await db.settings.add(INITIAL_SETTINGS);
  }
  return settings || INITIAL_SETTINGS;
}
