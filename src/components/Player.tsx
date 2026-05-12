import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { usePlayback } from '../store/PlaybackContext';
import { db } from '../store/db';
import { parsePPTX, SlideView, type PPTXData } from '@kandiforge/pptx-renderer';
import { ChevronLeft, ChevronRight, Play, Pause, RefreshCcw, AlertCircle } from 'lucide-react';
import { useWakeLock } from '../hooks/useWakeLock';
import { SettingsOverlay } from './SettingsOverlay';
import { KioskEntryOverlay } from './KioskEntryOverlay';
import { useDiagnostics } from '../store/DiagnosticContext';

export function Player() {
  const { state, dispatch } = usePlayback();
  const { logError } = useDiagnostics();
  const [data, setData] = useState<PPTXData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // R3: Screen Wake Lock
  useWakeLock(state.isPlaying);

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (state.presentationId) {
      setIsLoading(true);
      setError(null);
      db.presentations.get(state.presentationId)
        .then(async (pres) => {
          if (pres) {
            try {
              const buffer = await pres.blob.arrayBuffer();
              const parsed = await parsePPTX(buffer);
              setData(parsed);
              dispatch({ type: 'SET_TOTAL_SLIDES', totalSlides: parsed.slides.length });
            } catch (err: any) {
              const msg = `Failed to parse PPTX file: ${err.message}`;
              setError(msg);
              logError(msg);
            }
          } else {
            setError('Presentation not found in storage.');
          }
        })
        .catch((err: any) => {
          const msg = `Database error: ${err.message}`;
          setError(msg);
          logError(msg);
        })
        .finally(() => setIsLoading(false));
    }
  }, [state.presentationId, dispatch, logError]);

  // R7: Sliding Window Logic
  const visibleIndices = useMemo(() => {
    if (!data || data.slides.length === 0) return [];
    if (data.slides.length === 1) return [0];
    
    const count = data.slides.length;
    const current = state.currentSlide % count;
    const prev = (current - 1 + count) % count;
    const next = (current + 1) % count;
    
    return Array.from(new Set([prev, current, next]));
  }, [data, state.currentSlide]);

  // R6: Failover Advance
  const handleRenderError = useCallback((slideIndex: number, err: any) => {
    const msg = `Slide ${slideIndex} render error: ${err.message}`;
    logError(msg);
    
    // The global playback timer in PlaybackContext will handle advancement
    // if state.isPlaying is true. We don't want to double-advance.
  }, [logError]);

  if (!state.presentationId) return null;

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-zinc-200">{error}</h2>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden group">
      <SettingsOverlay />
      <KioskEntryOverlay />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <RefreshCcw className="w-12 h-12 text-blue-500 animate-spin" />
        </div>
      )}
      
      <div className="w-full h-full relative">
        {data && visibleIndices.map((idx) => (
          <div
            key={idx}
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
            style={{ 
              opacity: idx === state.currentSlide % data.slides.length ? 1 : 0,
              visibility: idx === state.currentSlide % data.slides.length ? 'visible' : 'hidden',
              zIndex: idx === state.currentSlide % data.slides.length ? 1 : 0
            }}
          >
            <SlideView
              slide={data.slides[idx]}
              slideWidth={data.size.width}
              slideHeight={data.size.height}
              width={dimensions.width}
              height={dimensions.height}
              onRenderError={(err: Error) => handleRenderError(idx, err)}
            />
          </div>
        ))}
        {!data && !isLoading && <div className="absolute inset-0 flex items-center justify-center text-zinc-500">No slide data available</div>}
      </div>

      {/* Manual Controls */}
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
    </div>
  );
}
