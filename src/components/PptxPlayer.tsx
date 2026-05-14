import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { usePlayback } from '../store/PlaybackContext';
import { db } from '../store/db';
import { parsePPTX, SlideView, type PPTXData } from '@kandiforge/pptx-renderer';
import { PlayerShell } from './PlayerShell';
import { useDiagnostics } from '../store/DiagnosticContext';
import { TransitionLayer } from './TransitionLayer';
import { TransitionErrorBoundary } from './TransitionErrorBoundary';

const PPTX_WARNING = 'PPTX rendering is experimental. For best results, export as PDF and re-upload.';

export function PptxPlayer() {
  const { state, dispatch } = usePlayback();
  const { logError } = useDiagnostics();
  const [data, setData] = useState<PPTXData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

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
            } catch (err: unknown) {
              const msg = `Failed to parse PPTX file: ${err instanceof Error ? err.message : String(err)}`;
              setError(msg);
              logError(msg);
            }
          } else {
            setError('Presentation not found in storage.');
          }
        })
        .catch((err: unknown) => {
          const msg = `Database error: ${err instanceof Error ? err.message : String(err)}`;
          setError(msg);
          logError(msg);
        })
        .finally(() => setIsLoading(false));
    }
  }, [state.presentationId, dispatch, logError]);

  const visibleIndices = useMemo(() => {
    if (!data || data.slides.length === 0) return [];
    if (data.slides.length === 1) return [0];

    const count = data.slides.length;
    const current = state.currentSlide % count;
    const prev = (current - 1 + count) % count;
    const next = (current + 1) % count;

    return Array.from(new Set([prev, current, next]));
  }, [data, state.currentSlide]);

  const handleRenderError = useCallback((slideIndex: number, err: Error) => {
    const msg = `Slide ${slideIndex} render error: ${err.message}`;
    logError(msg);
  }, [logError]);

  const current = data ? state.currentSlide % data.slides.length : 0;

  return (
    <PlayerShell isLoading={isLoading} error={error} warning={PPTX_WARNING}>
      <div className="w-full h-full relative">
        {data && (
          <TransitionErrorBoundary currentSlideIndex={current} logError={logError}>
            <TransitionLayer currentSlideIndex={current}>
              {visibleIndices.map((idx) => (
                <div key={idx}>
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
            </TransitionLayer>
          </TransitionErrorBoundary>
        )}
        {!data && !isLoading && <div className="absolute inset-0 flex items-center justify-center text-zinc-500">No slide data available</div>}
      </div>
    </PlayerShell>
  );
}
