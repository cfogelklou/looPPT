import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { usePlayback } from '../store/PlaybackContext';
import { db } from '../store/db';
import { parsePPTX, SlideView, type PPTXData } from '@kandiforge/pptx-renderer';
import { PlayerShell } from './PlayerShell';
import { useDiagnostics } from '../store/DiagnosticContext';
import { TransitionLayer } from './TransitionLayer';
import { TransitionErrorBoundary } from './TransitionErrorBoundary';
import { useAnimation } from '../store/AnimationContext';
import { EmbedSlide } from './EmbedSlide';

const PPTX_WARNING = 'PPTX rendering is experimental. For best results, export as PDF and re-upload.';

interface PptxPlayerProps {
  wakeLockActive?: boolean;
  onRequestWakeLock?: () => void;
}

export function PptxPlayer({ wakeLockActive, onRequestWakeLock }: PptxPlayerProps) {
  const { state, dispatch } = usePlayback();
  const { logError } = useDiagnostics();
  const { state: animState } = useAnimation();
  const [data, setData] = useState<PPTXData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: document.documentElement.clientWidth, height: document.documentElement.clientHeight });

  useEffect(() => {
    const handleResize = () => setDimensions({ width: document.documentElement.clientWidth, height: document.documentElement.clientHeight });
    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
    };
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

  const docSlides = data ? data.slides.length : 0;
  const embedActive = animState.embedUrl !== '';

  useEffect(() => {
    if (data) {
      dispatch({ type: 'SET_TOTAL_SLIDES', totalSlides: data.slides.length + (embedActive ? 1 : 0) });
    }
  }, [data, embedActive, dispatch]);

  const visibleIndices = useMemo(() => {
    if (!data || state.totalSlides === 0) return [];
    if (state.totalSlides === 1) return [0];

    const count = state.totalSlides;
    const current = state.currentSlide % count;
    const prev = (current - 1 + count) % count;
    const next = (current + 1) % count;

    return Array.from(new Set([prev, current, next]));
  }, [data, state.totalSlides, state.currentSlide]);

  const handleRenderError = useCallback((slideIndex: number, err: Error) => {
    const msg = `Slide ${slideIndex} render error: ${err.message}`;
    logError(msg);
  }, [logError]);

  const current = state.totalSlides > 0 ? state.currentSlide % state.totalSlides : 0;

  const renderSlide = (idx: number) => {
    if (idx >= docSlides && embedActive) {
      return <EmbedSlide url={animState.embedUrl} active={idx === current} />;
    }
    return (
      <SlideView
        slide={data!.slides[idx]}
        slideWidth={data!.size.width}
        slideHeight={data!.size.height}
        width={dimensions.width}
        height={dimensions.height}
        onRenderError={(err: Error) => handleRenderError(idx, err)}
      />
    );
  };

  return (
    <PlayerShell isLoading={isLoading} error={error} warning={PPTX_WARNING} wakeLockActive={wakeLockActive} onRequestWakeLock={onRequestWakeLock}>
      <div className="w-full h-full relative">
        {data && (
          <TransitionErrorBoundary
            currentSlideIndex={current}
            logError={logError}
            fallbackSlide={
              current >= docSlides && embedActive
                ? <EmbedSlide url={animState.embedUrl} active />
                : docSlides > 0
                  ? <SlideView
                      slide={data.slides[Math.min(current, docSlides - 1)]}
                      slideWidth={data.size.width}
                      slideHeight={data.size.height}
                      width={dimensions.width}
                      height={dimensions.height}
                      onRenderError={(err: Error) => handleRenderError(current, err)}
                    />
                  : <div>No slide data</div>
            }
          >
            <TransitionLayer currentSlideIndex={current}>
              {visibleIndices.map((idx) => (
                <div key={idx}>
                  {renderSlide(idx)}
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
