import React, { useEffect, useState, useMemo } from 'react';
import { usePlayback } from '../store/PlaybackContext';
import { db } from '../store/db';
import { parsePPTX, SlideView, type PPTXData } from '@kandiforge/pptx-renderer';
import { ChevronLeft, ChevronRight, Play, Pause, RefreshCcw, AlertCircle } from 'lucide-react';

export function Player() {
  const { state, dispatch } = usePlayback();
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
            } catch (err) {
              setError('Failed to parse PPTX file.');
              console.error(err);
            }
          } else {
            setError('Presentation not found in storage.');
          }
        })
        .catch((err) => {
          setError('Database error.');
          console.error(err);
        })
        .finally(() => setIsLoading(false));
    }
  }, [state.presentationId, dispatch]);

  const currentSlide = useMemo(() => {
    if (!data || data.slides.length === 0) return null;
    return data.slides[state.currentSlide % data.slides.length];
  }, [data, state.currentSlide]);

  if (!state.presentationId) return null;

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-zinc-200">{error}</h2>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden group">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <RefreshCcw className="w-12 h-12 text-blue-500 animate-spin" />
        </div>
      )}
      
      <div className="w-full h-full flex items-center justify-center">
        {data && currentSlide ? (
          <SlideView
            slide={currentSlide}
            slideWidth={data.size.width}
            slideHeight={data.size.height}
            width={dimensions.width}
            height={dimensions.height}
          />
        ) : (
          !isLoading && <div className="text-zinc-500">No slide data available</div>
        )}
      </div>

      {/* Manual Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-zinc-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button 
          onClick={() => dispatch({ type: 'PREV_SLIDE' })}
          className="p-2 hover:bg-zinc-800 rounded-full text-zinc-300"
          aria-label="Previous Slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button 
          onClick={() => dispatch({ type: 'SET_PLAYING', isPlaying: !state.isPlaying })}
          className="p-3 bg-blue-600 hover:bg-blue-500 rounded-full text-white shadow-lg"
          aria-label={state.isPlaying ? "Pause" : "Play"}
        >
          {state.isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
        </button>

        <button 
          onClick={() => dispatch({ type: 'NEXT_SLIDE' })}
          className="p-2 hover:bg-zinc-800 rounded-full text-zinc-300"
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
