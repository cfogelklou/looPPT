import React, { createContext, useContext, useReducer, useEffect, ReactNode, useRef } from 'react';
import { db, type Settings, type OverlayPreset } from './db';

export interface AnimationState {
  overlayEnabled: boolean;
  overlayPreset: OverlayPreset;
  overlaySize: number;
  overlayOpacity: number;
}

export type AnimationAction =
  | { type: 'SET_OVERLAY_ENABLED'; enabled: boolean }
  | { type: 'SET_OVERLAY_PRESET'; preset: OverlayPreset }
  | { type: 'SET_OVERLAY_SIZE'; size: number }
  | { type: 'SET_OVERLAY_OPACITY'; opacity: number };

const VALID_PRESETS: OverlayPreset[] = ['bounce', 'fly-across', 'pulse', 'none'];

export function sanitizeAnimationSettings(settings: Settings): AnimationState {
  const preset = VALID_PRESETS.includes(settings.overlayPreset)
    ? settings.overlayPreset
    : 'none';
  if (preset === 'none' && settings.overlayPreset !== 'none' && settings.overlayPreset !== undefined) {
    console.warn(`Invalid overlayPreset "${settings.overlayPreset}", defaulting to "none"`);
  }
  return {
    overlayEnabled: settings.overlayEnabled ?? false,
    overlayPreset: preset,
    overlaySize: settings.overlaySize ?? 100,
    overlayOpacity: settings.overlayOpacity ?? 1.0,
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
      }).catch(console.error);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.overlayEnabled, state.overlayPreset, state.overlaySize, state.overlayOpacity]);

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
