import React, { useEffect, useState, useMemo, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, RenderTask, PDFPageProxy } from 'pdfjs-dist';
import { usePlayback } from '../store/PlaybackContext';
import { db } from '../store/db';
import { PlayerShell } from './PlayerShell';
import { useDiagnostics } from '../store/DiagnosticContext';
import { TransitionLayer } from './TransitionLayer';
import { TransitionErrorBoundary } from './TransitionErrorBoundary';
import { useAnimation } from '../store/AnimationContext';
import { EmbedSlide } from './EmbedSlide';
import { getPresentationViewport, PLAYER_VIEWPORT_CHANGE_EVENT } from '../utils/playerViewport';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export function PdfPlayer() {
  const { state, dispatch } = usePlayback();
  const { logError } = useDiagnostics();
  const { state: animState } = useAnimation();
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState(getPresentationViewport);

  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderTasks = useRef<Map<number, { task: RenderTask; page: PDFPageProxy }>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeTimer = useRef<number | null>(null);

  const docSlides = pdfDoc ? pdfDoc.numPages : 0;
  const embedActive = animState.embedUrl !== '';

  // Dispatch total slides (doc + embed)
  useEffect(() => {
    if (pdfDoc) {
      dispatch({ type: 'SET_TOTAL_SLIDES', totalSlides: pdfDoc.numPages + (embedActive ? 1 : 0) });
    }
  }, [pdfDoc, embedActive, dispatch]);

  // Load PDF
  useEffect(() => {
    if (state.presentationId) {
      setIsLoading(true);
      setError(null);
      db.presentations
        .get(state.presentationId)
        .then(async (pres) => {
          if (pres) {
            try {
              const buffer = await pres.blob.arrayBuffer();
              const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
              setPdfDoc(doc);
            } catch (err: unknown) {
              const msg = `Failed to parse PDF file: ${err instanceof Error ? err.message : String(err)}`;
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

  // Cleanup PDF on unmount
  useEffect(() => {
    return () => {
      pdfDoc?.destroy();
    };
  }, [pdfDoc]);

  // Resize listener with debounce
  useEffect(() => {
    const handleResize = () => {
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      resizeTimer.current = window.setTimeout(() => {
        setDimensions(getPresentationViewport());
      }, 200);
    };
    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);
    window.addEventListener(PLAYER_VIEWPORT_CHANGE_EVENT, handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
      window.removeEventListener(PLAYER_VIEWPORT_CHANGE_EVENT, handleResize);
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
    };
  }, []);

  // Sliding window indices
  const visibleIndices = useMemo(() => {
    if (!pdfDoc || state.totalSlides === 0) return [];
    if (state.totalSlides === 1) return [0];

    const count = state.totalSlides;
    const current = state.currentSlide % count;
    const prev = (current - 1 + count) % count;
    const next = (current + 1) % count;

    return Array.from(new Set([prev, current, next]));
  }, [pdfDoc, state.totalSlides, state.currentSlide]);

  // Cancel render tasks for pages leaving the window
  useEffect(() => {
    const activeKeys = new Set(visibleIndices);
    for (const [idx, { task, page }] of renderTasks.current) {
      if (!activeKeys.has(idx)) {
        task.cancel();
        page.cleanup();
        renderTasks.current.delete(idx);
      }
    }
  }, [visibleIndices]);

  // Render visible pages
  useEffect(() => {
    if (!pdfDoc || visibleIndices.length === 0) return;

    const dpr = window.devicePixelRatio || 1;

    for (const idx of visibleIndices) {
      if (idx >= docSlides) continue;
      const canvas = canvasRefs.current.get(idx);
      if (!canvas) continue;

      // Cancel previous render for this page
      const existing = renderTasks.current.get(idx);
      if (existing) {
        existing.task.cancel();
        existing.page.cleanup();
      }

      pdfDoc
        .getPage(idx + 1)
        .then((page) => {
          const unscaledViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(
            dimensions.width / unscaledViewport.width,
            dimensions.height / unscaledViewport.height,
          );
          const viewport = page.getViewport({ scale });

          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;

          const renderViewport = page.getViewport({ scale: scale * dpr });

          const task = page.render({ canvas, viewport: renderViewport });
          if (!task) return;
          renderTasks.current.set(idx, { task, page });

          task.promise
            .catch((err: unknown) => {
              const errName = (err as { name?: string })?.name;
              if (errName !== 'RenderingCancelledException') {
                const msg = `Page ${idx + 1} render error: ${err instanceof Error ? err.message : String(err)}`;
                logError(msg);
              }
            })
            .finally(() => {
              renderTasks.current.delete(idx);
            });
        })
        .catch((err: unknown) => {
          const msg = `Page ${idx + 1} load error: ${err instanceof Error ? err.message : String(err)}`;
          logError(msg);
        });
    }
  }, [pdfDoc, visibleIndices, dimensions, logError]);

  const current = state.totalSlides > 0 ? state.currentSlide % state.totalSlides : 0;

  return (
    <PlayerShell isLoading={isLoading} error={error}>
      <div ref={containerRef} className='w-full h-full relative'>
        {pdfDoc && (
          <TransitionErrorBoundary
            currentSlideIndex={current}
            logError={logError}
            fallbackSlide={
              current >= docSlides && embedActive ? (
                <EmbedSlide url={animState.embedUrl} active />
              ) : (
                <canvas
                  ref={(el) => {
                    if (el) canvasRefs.current.set(current, el);
                  }}
                />
              )
            }
          >
            <TransitionLayer currentSlideIndex={current}>
              {visibleIndices.map((idx) => (
                <div key={idx}>
                  {idx >= docSlides && embedActive ? (
                    <EmbedSlide url={animState.embedUrl} active={idx === current} />
                  ) : (
                    <canvas
                      ref={(el) => {
                        if (el) canvasRefs.current.set(idx, el);
                      }}
                    />
                  )}
                </div>
              ))}
            </TransitionLayer>
          </TransitionErrorBoundary>
        )}
        {!pdfDoc && !isLoading && (
          <div className='absolute inset-0 flex items-center justify-center text-zinc-500'>
            No document data available
          </div>
        )}
      </div>
    </PlayerShell>
  );
}
