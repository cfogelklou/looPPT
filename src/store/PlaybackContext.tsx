import React, { createContext, useContext, useReducer, useEffect, ReactNode, useRef } from 'react';
import { db, Settings } from './db';

export interface PlaybackState {
  currentSlide: number;
  totalSlides: number;
  isPlaying: boolean;
  interval: number;
  presentationId?: number;
  error?: string;
}

export type PlaybackAction =
  | { type: 'SET_PRESENTATION'; id: number; totalSlides: number; currentSlide?: number }
  | { type: 'SET_TOTAL_SLIDES'; totalSlides: number }
  | { type: 'NEXT_SLIDE' }
  | { type: 'PREV_SLIDE' }
  | { type: 'GOTO_SLIDE'; index: number }
  | { type: 'SET_PLAYING'; isPlaying: boolean }
  | { type: 'SET_INTERVAL'; seconds: number }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'CLEAR_PRESENTATION' };

const initialState: PlaybackState = {
  currentSlide: 0,
  totalSlides: 0,
  isPlaying: true,
  interval: 5,
};

function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case 'SET_PRESENTATION':
      return { 
        ...state, 
        presentationId: action.id, 
        totalSlides: action.totalSlides, 
        currentSlide: action.currentSlide ?? 0 
      };
    case 'SET_TOTAL_SLIDES':
      return { ...state, totalSlides: action.totalSlides };
    case 'NEXT_SLIDE':
      return {
        ...state,
        currentSlide: state.totalSlides > 0 ? (state.currentSlide + 1) % state.totalSlides : 0,
      };
    case 'PREV_SLIDE':
      return {
        ...state,
        currentSlide: state.totalSlides > 0 ? (state.currentSlide - 1 + state.totalSlides) % state.totalSlides : 0,
      };
    case 'GOTO_SLIDE':
      return { ...state, currentSlide: action.index };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.isPlaying };
    case 'SET_INTERVAL':
      return { ...state, interval: action.seconds };
    case 'SET_ERROR':
      return { ...state, error: action.message };
    case 'CLEAR_PRESENTATION':
      return { ...initialState };
    default:
      return state;
  }
}

const PlaybackContext = createContext<{
  state: PlaybackState;
  dispatch: React.Dispatch<PlaybackAction>;
  clearPresentation: () => Promise<void>;
} | null>(null);

export function PlaybackProvider({ children, initialSettings }: { children: ReactNode, initialSettings: Settings }) {
  const [state, dispatch] = useReducer(playbackReducer, {
    ...initialState,
    currentSlide: initialSettings.currentSlide,
    interval: initialSettings.interval,
    presentationId: initialSettings.presentationId,
  });

  const saveTimeoutRef = useRef<number | null>(null);

  // Auto-advance timer
  useEffect(() => {
    let timer: number | undefined;
    if (state.isPlaying && state.totalSlides > 1) {
      timer = window.setInterval(() => {
        dispatch({ type: 'NEXT_SLIDE' });
      }, state.interval * 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [state.isPlaying, state.interval, state.totalSlides, state.currentSlide]);

  // Debounced Persistence (R1)
  useEffect(() => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      db.settings.update('current', { 
        currentSlide: state.currentSlide,
        interval: state.interval,
        presentationId: state.presentationId
      }).catch(console.error);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.currentSlide, state.interval, state.presentationId]);

  const clearPresentation = async () => {
    if (state.presentationId) {
      await db.presentations.delete(state.presentationId);
    }
    await db.settings.update('current', { presentationId: undefined, currentSlide: 0 });
    dispatch({ type: 'CLEAR_PRESENTATION' });
  };

  return (
    <PlaybackContext.Provider value={{ state, dispatch, clearPresentation }}>
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return context;
}
