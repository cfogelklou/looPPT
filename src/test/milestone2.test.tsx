import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlaybackProvider, usePlayback } from '../store/PlaybackContext';
import { db, INITIAL_SETTINGS } from '../store/db';
import { Player } from '../components/Player';
import { DiagnosticProvider } from '../store/DiagnosticContext';
import React from 'react';

// Mock Dexie
vi.mock('../store/db', () => ({
  db: {
    settings: {
      update: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue({ presentationId: 1, currentSlide: 0, interval: 5 }),
    },
    presentations: {
      get: vi.fn().mockResolvedValue({ id: 1, name: 'Test', blob: new Blob([''], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }) }),
    }
  },
  INITIAL_SETTINGS: {
    id: 'current',
    currentSlide: 0,
    interval: 5,
    fitMode: 'contain'
  }
}));

// Mock pptx-renderer
vi.mock('@kandiforge/pptx-renderer', () => ({
  parsePPTX: vi.fn().mockResolvedValue({
    slides: Array.from({ length: 50 }, (_, i) => ({ id: i })),
    size: { width: 100, height: 100 }
  }),
  SlideView: ({ slide }: any) => <div data-testid="slide-view">Slide {slide.id}</div>
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  ChevronLeft: () => null,
  ChevronRight: () => null,
  Play: () => null,
  Pause: () => null,
  RefreshCcw: () => null,
  AlertCircle: () => null,
}));

// Mock PWA register
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ updateServiceWorker: vi.fn() })
}));

const TestComponent = () => {
  const { state, dispatch } = usePlayback();
  return (
    <div>
      <div data-testid="slide-index">{state.currentSlide}</div>
      <button onClick={() => dispatch({ type: 'NEXT_SLIDE' })}>Next</button>
      <button onClick={() => dispatch({ type: 'SET_TOTAL_SLIDES', totalSlides: 50 })}>Set Total</button>
    </div>
  );
};

describe('Milestone 2: Production Kiosk Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  // Satisfies TS-1: Persistence Debounce
  it('should debounce database updates for slide changes', async () => {
    render(
      <PlaybackProvider initialSettings={INITIAL_SETTINGS}>
        <TestComponent />
      </PlaybackProvider>
    );

    const nextButton = screen.getByText('Next');
    const setTotalButton = screen.getByText('Set Total');

    act(() => {
      setTotalButton.click();
    });

    for (let i = 0; i < 5; i++) {
      act(() => {
        nextButton.click();
      });
    }

    expect(db.settings.update).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(db.settings.update).toHaveBeenCalledTimes(1);
    expect(db.settings.update).toHaveBeenCalledWith('current', expect.objectContaining({
      currentSlide: 5
    }));
  });

  // Satisfies TS-6: Sliding Window Limit
  it('should never render more than 3 slides in the DOM', async () => {
    await act(async () => {
      render(
        <DiagnosticProvider>
          <PlaybackProvider initialSettings={{ ...INITIAL_SETTINGS, presentationId: 1 }}>
            <Player />
          </PlaybackProvider>
        </DiagnosticProvider>
      );
    });

    // Wait for parsePPTX
    await act(async () => {
      await Promise.resolve();
    });

    const slides = screen.getAllByTestId('slide-view');
    // For 50 slides, at index 0, it should render slides 49, 0, 1
    expect(slides.length).toBeLessThanOrEqual(3);
    expect(screen.getByText('Slide 0')).toBeInTheDocument();
    expect(screen.getByText('Slide 1')).toBeInTheDocument();
    expect(screen.getByText('Slide 49')).toBeInTheDocument();
  });
});
