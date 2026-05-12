import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlaybackProvider, usePlayback } from '../store/PlaybackContext';
import { db, INITIAL_SETTINGS } from '../store/db';
import { Player } from '../components/Player';
import { DiagnosticProvider } from '../store/DiagnosticContext';
import App from '../App';
import React from 'react';

// Mock Dexie
vi.mock('../store/db', () => ({
  db: {
    settings: {
      update: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue({ id: 'current', presentationId: 1, currentSlide: 0, interval: 5 }),
    },
    presentations: {
      get: vi.fn().mockResolvedValue({
        id: 1,
        name: 'Test',
        sourceType: 'pptx',
        blob: new Blob([''], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
      }),
    }
  },
  INITIAL_SETTINGS: {
    id: 'current',
    currentSlide: 0,
    interval: 5,
    fitMode: 'contain'
  },
  ensureSettings: vi.fn().mockResolvedValue({ id: 'current', currentSlide: 0, interval: 5 })
}));

// Mock pptx-renderer
vi.mock('@kandiforge/pptx-renderer', () => ({
  parsePPTX: vi.fn().mockResolvedValue({
    slides: Array.from({ length: 50 }, (_, i) => ({ id: i })),
    size: { width: 100, height: 100 }
  }),
  SlideView: ({ slide, onRenderError }: { slide: { id: number }; onRenderError: (err: Error) => void }) => (
    <div data-testid="slide-view">
      Slide {slide.id}
      <button onClick={() => onRenderError(new Error('Test Error'))}>Trigger Error</button>
    </div>
  )
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span>Prev</span>,
  ChevronRight: () => <span>Next</span>,
  Play: () => <span>Play</span>,
  Pause: () => <span>Pause</span>,
  RefreshCcw: () => <span>Loading</span>,
  AlertCircle: () => <span>Error</span>,
  AlertTriangle: () => <span>Warning</span>,
  Layout: () => <span>Layout</span>,
  Settings: () => <span>Settings</span>,
  X: () => <span>Close</span>,
  Info: () => <span>Info</span>,
  Upload: () => <span>Upload</span>,
  Fullscreen: () => <span>Fullscreen</span>,
}));

// Mock PWA register
const mockUpdateServiceWorker = vi.fn();
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ updateServiceWorker: mockUpdateServiceWorker })
}));

// Mock navigator and document APIs
Object.defineProperty(navigator, 'storage', {
  value: {
    estimate: vi.fn().mockResolvedValue({ quota: 1024 * 1024 * 100, usage: 1024 * 1024 * 10 })
  },
  configurable: true
});

const mockWakeLock = {
  release: vi.fn().mockResolvedValue(undefined),
  addEventListener: vi.fn(),
};
Object.defineProperty(navigator, 'wakeLock', {
  value: {
    request: vi.fn().mockResolvedValue(mockWakeLock)
  },
  configurable: true
});

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

  // TS-1: Persistence Debounce
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

  // TS-2: Auto-Resume
  it('should resume from the last saved slide', async () => {
    const resumedSettings = { ...INITIAL_SETTINGS, presentationId: 1, currentSlide: 12 };
    
    render(
      <DiagnosticProvider>
        <PlaybackProvider initialSettings={resumedSettings}>
          <Player />
        </PlaybackProvider>
      </DiagnosticProvider>
    );

    // Wait for parsePPTX
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('13 / 50')).toBeInTheDocument(); // Index 12 is slide 13
    expect(screen.getByText('Slide 12')).toBeInTheDocument();
  });

  // TS-3: Settings Accessibility
  it('should have accessible touch targets in settings', async () => {
    render(
      <DiagnosticProvider>
        <PlaybackProvider initialSettings={{ ...INITIAL_SETTINGS, presentationId: 1 }}>
          <Player />
        </PlaybackProvider>
      </DiagnosticProvider>
    );

    // Wait for parsePPTX
    await act(async () => {
      await Promise.resolve();
    });

    const settingsButton = screen.getByLabelText('Open Settings');
    expect(settingsButton).toHaveStyle({ width: '48px', height: '48px' });

    fireEvent.click(settingsButton);

    const buttons = screen.getAllByRole('button');
    const largeButtons = buttons.filter(b => {
      const style = window.getComputedStyle(b);
      return style.width === '48px' && style.height === '48px';
    });
    expect(largeButtons.length).toBeGreaterThanOrEqual(1);

    const reloadButton = screen.getByText('Reload Player');
    expect(reloadButton).toHaveStyle({ height: '48px' });
  });

  // TS-4: Wake Lock Recovery
  it('should re-acquire wake lock on visibility change', async () => {
    render(
      <DiagnosticProvider>
        <PlaybackProvider initialSettings={{ ...INITIAL_SETTINGS }}>
          <Player />
        </PlaybackProvider>
      </DiagnosticProvider>
    );

    expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen');

    vi.clearAllMocks();
    
    // Simulate visibility change
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    fireEvent(document, new Event('visibilitychange'));

    expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen');
  });

  // TS-6: Sliding Window Limit
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

    await act(async () => { await Promise.resolve(); });

    const slides = screen.getAllByTestId('slide-view');
    expect(slides.length).toBeLessThanOrEqual(3);
  });

  // TS-7: Error Failover
  it('should automatically advance after a slide render error', async () => {
    render(
      <DiagnosticProvider>
        <PlaybackProvider initialSettings={{ ...INITIAL_SETTINGS, presentationId: 1, interval: 5 }}>
          <Player />
        </PlaybackProvider>
      </DiagnosticProvider>
    );

    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText('1 / 50')).toBeInTheDocument();

    const triggerErrorButton = screen.getAllByText('Trigger Error')[0];
    fireEvent.click(triggerErrorButton);

    // Should advance after interval (via PlaybackContext global timer)
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('2 / 50')).toBeInTheDocument();
  });

  // TS-8: Periodic Update Check
  it('should check for updates every hour', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    
    render(<App />);

    // Flush microtasks and timers to move past loading spinner
    await act(async () => {
      await Promise.resolve();
      vi.runOnlyPendingTimers();
      await Promise.resolve();
    });

    // Advance by 1 hour
    act(() => {
      vi.advanceTimersByTime(60 * 60 * 1000);
    });

    expect(mockUpdateServiceWorker).toHaveBeenCalled();
  });
});
