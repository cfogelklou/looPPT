import React, { ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { usePlayback } from '../store/PlaybackContext';
import { useAnimation } from '../store/AnimationContext';
import { useDiagnostics } from '../store/DiagnosticContext';
import { ChevronLeft, ChevronRight, Play, Pause, RefreshCcw, AlertCircle, AlertTriangle, Maximize } from 'lucide-react';
import { SettingsOverlay } from './SettingsOverlay';
import { AnimationOverlay } from './AnimationOverlay';
import { AnimationErrorBoundary } from './AnimationErrorBoundary';

interface PlayerShellProps {
  isLoading: boolean;
  error: string | null;
  warning?: string | null;
  wakeLockActive?: boolean;
  onRequestWakeLock?: () => void;
  children: ReactNode;
}

export function PlayerShell({ isLoading, error, warning, wakeLockActive, onRequestWakeLock, children }: PlayerShellProps) {
  const { state, dispatch, clearPresentation } = usePlayback();
  const { state: animState } = useAnimation();
  const { logError } = useDiagnostics();
  const [isKiosk, setIsKiosk] = useState(false);

  const exitKiosk = useCallback(() => {
    setIsKiosk(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    }
  }, []);

  const enterKiosk = useCallback(() => {
    document.documentElement.requestFullscreen()
      .then(() => setIsKiosk(true))
      .catch(() => setIsKiosk(true)); // Hide chrome even if fullscreen fails
  }, []);

  // Sync kiosk state when browser exits fullscreen (Escape, F11, OS gesture)
  useEffect(() => {
    if (!isKiosk) return;
    const handler = () => {
      if (!document.fullscreenElement) {
        setIsKiosk(false);
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [isKiosk]);

  if (error) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-6 text-center">
        <SettingsOverlay />
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-zinc-200">{error}</h2>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-white"
          >
            Retry
          </button>
          <button
            onClick={async () => { await clearPresentation(); }}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg transition-colors text-white"
          >
            Delete &amp; Reset
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden${isKiosk ? ' cursor-none select-none' : ' group'}`}
      onContextMenu={isKiosk ? (e) => e.preventDefault() : undefined}
    >
      {!isKiosk && <SettingsOverlay onEnterKiosk={enterKiosk} />}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <RefreshCcw className="w-12 h-12 text-blue-500 animate-spin" />
        </div>
      )}

      {!isKiosk && warning && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-amber-900/80 backdrop-blur-md px-4 py-2 rounded-lg border border-amber-700/50 text-amber-200 text-sm max-w-md">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{warning}</span>
        </div>
      )}

      <AnimationErrorBoundary logError={logError} key={animState.overlayPreset}>
        <AnimationOverlay />
      </AnimationErrorBoundary>

      {children}

      {wakeLockActive === false && onRequestWakeLock && (
        <button
          onClick={onRequestWakeLock}
          className="absolute bottom-4 right-4 z-10 p-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors border border-zinc-800"
          aria-label="Enable Fullscreen & Wake Lock"
          title="Enable Fullscreen & Wake Lock"
        >
          <Maximize className="w-5 h-5" />
        </button>
      )}

      {/* Kiosk exit zone — 3 taps in 3s to exit */}
      {isKiosk && <KioskExitZone onExit={exitKiosk} />}

      {/* Manual Controls */}
      {!isKiosk && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-zinc-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={() => dispatch({ type: 'PREV_SLIDE' })}
            className="p-2 hover:bg-zinc-800 rounded-full text-zinc-300 transition-colors"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={() => dispatch({ type: 'SET_PLAYING', isPlaying: !state.isPlaying })}
            className="p-3 bg-blue-600 hover:bg-blue-500 rounded-full text-white shadow-lg transition-all active:scale-95"
            aria-label={state.isPlaying ? "Pause" : "Play"}
          >
            {state.isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
          </button>

          <button
            onClick={() => dispatch({ type: 'NEXT_SLIDE' })}
            className="p-2 hover:bg-zinc-800 rounded-full text-zinc-300 transition-colors"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="ml-4 text-xs font-mono text-zinc-400 tabular-nums min-w-[60px] text-right">
            {state.currentSlide + 1} / {state.totalSlides}
          </div>
        </div>
      )}
    </div>
  );
}

function KioskExitZone({ onExit }: { onExit: () => void }) {
  const taps = useRef<number[]>([]);
  const [hintVisible, setHintVisible] = useState(false);
  const hintTimerRef = useRef<number | null>(null);

  const handleTap = useCallback(() => {
    const now = Date.now();
    // Keep only taps within 3s window
    taps.current = taps.current.filter(t => now - t < 3000);
    taps.current.push(now);

    if (hintTimerRef.current != null) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }

    if (taps.current.length >= 3) {
      taps.current = [];
      setHintVisible(false);
      onExit();
    } else if (taps.current.length >= 2) {
      setHintVisible(true);
      hintTimerRef.current = window.setTimeout(() => setHintVisible(false), 2000);
    }
  }, [onExit]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 80,
        height: 80,
        zIndex: 60,
        touchAction: 'manipulation',
      }}
      onClick={handleTap}
      aria-hidden="true"
    >
      {hintVisible && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'white',
            fontSize: 10,
            opacity: 0.6,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          Tap {3 - taps.current.length} more times to exit
        </div>
      )}
    </div>
  );
}
