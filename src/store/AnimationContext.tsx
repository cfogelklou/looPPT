import React, { createContext, useContext, useReducer, useEffect, ReactNode, useRef } from 'react';
import { db, type Settings, type OverlayPreset, type TransitionType } from './db';

export interface AnimationState {
  overlayEnabled: boolean;
  overlayPreset: OverlayPreset;
  overlaySize: number;
  overlayOpacity: number;
  overlaySpeed: number;
  overlayFrequency: number; // minutes
  transitionType: TransitionType;
  transitionDuration: number;
  embedUrl: string;
}

export type AnimationAction =
  | { type: 'SET_OVERLAY_ENABLED'; enabled: boolean }
  | { type: 'SET_OVERLAY_PRESET'; preset: OverlayPreset }
  | { type: 'SET_OVERLAY_SIZE'; size: number }
  | { type: 'SET_OVERLAY_OPACITY'; opacity: number }
  | { type: 'SET_OVERLAY_SPEED'; speed: number }
  | { type: 'SET_OVERLAY_FREQUENCY'; frequency: number }
  | { type: 'SET_TRANSITION_TYPE'; transitionType: TransitionType }
  | { type: 'SET_TRANSITION_DURATION'; transitionDuration: number }
  | { type: 'SET_EMBED_URL'; url: string };

const VALID_PRESETS: OverlayPreset[] = ['bounce', 'fly-across', 'pulse', 'none'];
const VALID_TRANSITION_TYPES: TransitionType[] = ['none', 'crossfade', 'slide', 'wipe', 'dissolve'];

export function sanitizeAnimationSettings(settings: Settings): AnimationState {
  const isCustom = typeof settings.overlayPreset === 'string' && settings.overlayPreset.startsWith('custom:');
  const preset = (VALID_PRESETS.includes(settings.overlayPreset as OverlayPreset) || isCustom)
    ? settings.overlayPreset
    : 'none';
  if (preset === 'none' && settings.overlayPreset !== 'none' && settings.overlayPreset !== undefined) {
    console.warn(`Invalid overlayPreset "${settings.overlayPreset}", defaulting to "none"`);
  }

  const transitionType = VALID_TRANSITION_TYPES.includes(settings.transitionType)
    ? settings.transitionType
    : 'none';
  if (transitionType === 'none' && settings.transitionType !== 'none' && settings.transitionType !== undefined) {
    console.warn(`Invalid transitionType "${settings.transitionType}", defaulting to "none"`);
  }

  const rawDuration = settings.transitionDuration;
  const transitionDuration = (typeof rawDuration === 'number' && rawDuration > 0 && Number.isFinite(rawDuration))
    ? rawDuration
    : 500;

  const rawSpeed = settings.overlaySpeed;
  const overlaySpeed = (typeof rawSpeed === 'number' && rawSpeed >= 0.5 && rawSpeed <= 3.0 && Number.isFinite(rawSpeed))
    ? rawSpeed
    : 1.0;

  const rawFreq = settings.overlayFrequency;
  const overlayFrequency = (typeof rawFreq === 'number' && rawFreq >= 0.5 && rawFreq <= 60 && Number.isFinite(rawFreq))
    ? rawFreq
    : 5;

  const rawEmbedUrl = typeof settings.embedUrl === 'string' ? settings.embedUrl.trim() : '';
  const embedUrl = rawEmbedUrl === '' || rawEmbedUrl.startsWith('https://') ? rawEmbedUrl : '';

  return {
    overlayEnabled: settings.overlayEnabled ?? false,
    overlayPreset: preset,
    overlaySize: settings.overlaySize ?? 100,
    overlayOpacity: settings.overlayOpacity ?? 1.0,
    overlaySpeed,
    overlayFrequency,
    transitionType,
    transitionDuration,
    embedUrl,
  };
}

function animationReducer(state: AnimationState, action: AnimationAction): AnimationState {
  switch (action.type) {
    case 'SET_OVERLAY_ENABLED':
      return { ...state, overlayEnabled: action.enabled };
    case 'SET_OVERLAY_PRESET':
      return { ...state, overlayPreset: action.preset };
    case 'SET_OVERLAY_SIZE':
      return { ...state, overlaySize: action.size };
    case 'SET_OVERLAY_OPACITY':
      return { ...state, overlayOpacity: action.opacity };
    case 'SET_OVERLAY_SPEED':
      return { ...state, overlaySpeed: action.speed };
    case 'SET_OVERLAY_FREQUENCY':
      return { ...state, overlayFrequency: action.frequency };
    case 'SET_TRANSITION_TYPE':
      return { ...state, transitionType: action.transitionType };
    case 'SET_TRANSITION_DURATION':
      return { ...state, transitionDuration: action.transitionDuration };
    case 'SET_EMBED_URL': {
      const trimmed = action.url.trim();
      const safe = trimmed === '' || trimmed.startsWith('https://') ? trimmed : '';
      return { ...state, embedUrl: safe };
    }
    default:
      return state;
  }
}

const AnimationContext = createContext<{
  state: AnimationState;
  dispatch: React.Dispatch<AnimationAction>;
} | null>(null);

export function AnimationProvider({ children, initialSettings }: { children: ReactNode; initialSettings: Settings }) {
  const [state, dispatch] = useReducer(animationReducer, initialSettings, sanitizeAnimationSettings);

  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      db.settings.update('current', {
        overlayEnabled: state.overlayEnabled,
        overlayPreset: state.overlayPreset,
        overlaySize: state.overlaySize,
        overlayOpacity: state.overlayOpacity,
        overlaySpeed: state.overlaySpeed,
        overlayFrequency: state.overlayFrequency,
        transitionType: state.transitionType,
        transitionDuration: state.transitionDuration,
        embedUrl: state.embedUrl,
      }).catch(console.error);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.overlayEnabled, state.overlayPreset, state.overlaySize, state.overlayOpacity, state.overlaySpeed, state.overlayFrequency, state.transitionType, state.transitionDuration, state.embedUrl]);

  return (
    <AnimationContext.Provider value={{ state, dispatch }}>
      {children}
    </AnimationContext.Provider>
  );
}

export function useAnimation() {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
}
