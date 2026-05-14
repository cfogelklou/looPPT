import { renderHook, act } from '@testing-library/react';
import { PlaybackProvider, usePlayback } from './PlaybackContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock DB
vi.mock('./db', () => ({
  db: {
    settings: {
      update: vi.fn().mockResolvedValue(1),
    },
  },
}));

describe('PlaybackCoordinator', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <PlaybackProvider initialSettings={{ id: 'current', currentSlide: 0, interval: 1, fitMode: 'contain', overlayEnabled: false, overlayPreset: 'none', overlaySize: 100, overlayOpacity: 1.0, overlaySpeed: 1.0, overlayFrequency: 5, transitionType: 'none', transitionDuration: 500 }}>
      {children}
    </PlaybackProvider>
  );

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('advances slides automatically', () => {
    const { result } = renderHook(() => usePlayback(), { wrapper });
    
    act(() => {
      result.current.dispatch({ type: 'SET_TOTAL_SLIDES', totalSlides: 3 });
      result.current.dispatch({ type: 'SET_PLAYING', isPlaying: true });
    });

    expect(result.current.state.currentSlide).toBe(0);

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(result.current.state.currentSlide).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(result.current.state.currentSlide).toBe(2);

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(result.current.state.currentSlide).toBe(0); // Loops back
  });

  it('resets timer on manual navigation', () => {
    const { result } = renderHook(() => usePlayback(), { wrapper });
    
    act(() => {
      result.current.dispatch({ type: 'SET_TOTAL_SLIDES', totalSlides: 3 });
      result.current.dispatch({ type: 'SET_PLAYING', isPlaying: true });
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.state.currentSlide).toBe(0);

    act(() => {
      result.current.dispatch({ type: 'NEXT_SLIDE' });
    });

    expect(result.current.state.currentSlide).toBe(1);

    // If it didn't reset, it would advance in 500ms. 
    // Since it reset, it should take 1000ms from now.
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.state.currentSlide).toBe(1);

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.state.currentSlide).toBe(2);
  });
});
