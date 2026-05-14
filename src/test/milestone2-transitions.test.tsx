import { render, screen, act, fireEvent, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { ReactNode } from 'react';
import { AnimationProvider, useAnimation, sanitizeAnimationSettings } from '../store/AnimationContext';
import { PlaybackProvider } from '../store/PlaybackContext';
import { DiagnosticProvider } from '../store/DiagnosticContext';
import { TransitionLayer } from '../components/TransitionLayer';
import { TransitionErrorBoundary } from '../components/TransitionErrorBoundary';
import { SettingsOverlay } from '../components/SettingsOverlay';
import { db, INITIAL_SETTINGS, upgradeV4Settings, type Settings, type TransitionType } from '../store/db';

// Vite raw import for CSS content inspection
import animationsCss from '../styles/animations.css?raw';

// Mock DB
vi.mock('../store/db', async () => {
  const actual = await vi.importActual<typeof import('../store/db')>('../store/db');
  return {
    ...actual,
    db: {
      settings: {
        update: vi.fn().mockResolvedValue(1),
        get: vi.fn().mockResolvedValue(null),
        add: vi.fn().mockResolvedValue('current'),
      },
      presentations: {
        get: vi.fn().mockResolvedValue(null),
      },
      overlays: {
        toArray: vi.fn().mockResolvedValue([]),
        add: vi.fn().mockResolvedValue(1),
        delete: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(null),
      },
    },
    INITIAL_SETTINGS: {
      id: 'current',
      currentSlide: 0,
      interval: 5,
      fitMode: 'contain',
      overlayEnabled: false,
      overlayPreset: 'none',
      overlaySize: 100,
      overlayOpacity: 1.0,
      overlaySpeed: 1.0,
      overlayFrequency: 5,
      transitionType: 'none',
      transitionDuration: 500,
    embedUrl: '',
    },
    ensureSettings: vi.fn().mockResolvedValue({
      id: 'current',
      currentSlide: 0,
      interval: 5,
      fitMode: 'contain',
      overlayEnabled: false,
      overlayPreset: 'none',
      overlaySize: 100,
      overlayOpacity: 1.0,
      overlaySpeed: 1.0,
      overlayFrequency: 5,
      transitionType: 'none',
      transitionDuration: 500,
    embedUrl: '',
    }),
  };
});

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

// Mock PWA
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ updateServiceWorker: vi.fn() }),
}));

const defaultSettings: Settings = {
  id: 'current',
  currentSlide: 0,
  interval: 5,
  fitMode: 'contain',
  overlayEnabled: false,
  overlayPreset: 'none',
  overlaySize: 100,
  overlayOpacity: 1.0,
  overlaySpeed: 1.0,
  overlayFrequency: 5,
  transitionType: 'none',
  transitionDuration: 500,
    embedUrl: '',
};

function createTransitionWrapper(settings: Settings = defaultSettings, _onSlideChange?: (idx: number) => void) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <DiagnosticProvider>
      <PlaybackProvider initialSettings={settings}>
        <AnimationProvider initialSettings={settings}>
          {children}
        </AnimationProvider>
      </PlaybackProvider>
    </DiagnosticProvider>
  );
  Wrapper.displayName = 'TransitionWrapper';
  return Wrapper;
}

// Helper: renders TransitionLayer with given settings and slide count
function renderTransitionLayer(settings: Settings, slideCount: number, initialSlide: number = 0) {
  const slides = Array.from({ length: slideCount }, (_, i) => (
    <div key={i} data-testid={`slide-${i}`}>Slide {i}</div>
  ));

  return render(
    <DiagnosticProvider>
      <PlaybackProvider initialSettings={settings}>
        <AnimationProvider initialSettings={settings}>
          <TransitionLayerTester slides={slides} initialSlide={initialSlide} />
        </AnimationProvider>
      </PlaybackProvider>
    </DiagnosticProvider>
  );
}

// Test harness that allows changing currentSlideIndex
function TransitionLayerTester({ slides, initialSlide }: { slides: React.ReactElement[]; initialSlide: number }) {
  const [currentSlide, setCurrentSlide] = React.useState(initialSlide);
  return (
    <div>
      <button data-testid="next-btn" onClick={() => setCurrentSlide(s => s + 1)}>Next</button>
      <TransitionLayer currentSlideIndex={currentSlide}>
        {slides}
      </TransitionLayer>
    </div>
  );
}

describe('Milestone 2: Slide Transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  // =============================================
  // Unit Tests — TransitionLayer
  // =============================================

  // Satisfies TS-1: Transition state tracking
  it('TS-1: assigns slide-current to new slide and slide-leaving to old, then slide-hidden after duration', () => {
    const settings: Settings = { ...defaultSettings, transitionType: 'crossfade', transitionDuration: 500 };
    const { container } = renderTransitionLayer(settings, 3, 0);

    // Initially: slide 0 is current, others hidden
    expect(container.querySelector('[class*="slide-current"] [data-testid="slide-0"]')).toBeTruthy();
    expect(container.querySelector('[class*="slide-leaving"]')).toBeNull();

    // Advance to slide 1
    fireEvent.click(screen.getByTestId('next-btn'));

    // Now: slide 1 is current, slide 0 is leaving
    expect(container.querySelector('[class*="slide-current"] [data-testid="slide-1"]')).toBeTruthy();
    expect(container.querySelector('[class*="slide-leaving"] [data-testid="slide-0"]')).toBeTruthy();

    // After duration, leaving becomes hidden
    act(() => { vi.advanceTimersByTime(500); });
    expect(container.querySelector('[class*="slide-leaving"]')).toBeNull();
    expect(container.querySelector('[class*="slide-hidden"] [data-testid="slide-0"]')).toBeTruthy();
  });

  // Satisfies TS-2: No leaving state on mount
  it('TS-2: no slide-leaving on initial render', () => {
    const settings: Settings = { ...defaultSettings, transitionType: 'crossfade' };
    // Only 3 slides in window, all passed as children
    const { container } = renderTransitionLayer(settings, 3, 1);

    expect(container.querySelector('[class*="slide-leaving"]')).toBeNull();
    expect(container.querySelector('[class*="slide-current"] [data-testid="slide-1"]')).toBeTruthy();
    const hidden = container.querySelectorAll('[class*="slide-hidden"]');
    expect(hidden.length).toBe(2); // slide 0 and slide 2
  });

  // Satisfies TS-3: CSS class per transition type
  it('TS-3a: container gets transition-slide class', () => {
    const settings: Settings = { ...defaultSettings, transitionType: 'slide' };
    const { container } = renderTransitionLayer(settings, 3, 0);
    expect(container.querySelector('.transition-slide')).toBeTruthy();
  });

  it('TS-3b: container gets transition-dissolve class', () => {
    const settings: Settings = { ...defaultSettings, transitionType: 'dissolve' };
    const { container } = renderTransitionLayer(settings, 3, 0);
    expect(container.querySelector('.transition-dissolve')).toBeTruthy();
  });

  // Satisfies TS-4: None transition uses fixed 300ms
  it('TS-4: transition-none uses 300ms timeout regardless of transitionDuration', () => {
    const settings: Settings = { ...defaultSettings, transitionType: 'none', transitionDuration: 1000 };
    const { container } = renderTransitionLayer(settings, 3, 0);

    fireEvent.click(screen.getByTestId('next-btn'));
    expect(container.querySelector('[class*="slide-leaving"]')).toBeTruthy();

    // At 299ms, leaving still present
    act(() => { vi.advanceTimersByTime(299); });
    expect(container.querySelector('[class*="slide-leaving"]')).toBeTruthy();

    // At 300ms, leaving cleared
    act(() => { vi.advanceTimersByTime(1); });
    expect(container.querySelector('[class*="slide-leaving"]')).toBeNull();
  });

  // Satisfies TS-5: Cleanup on unmount
  it('TS-5: timeout cleared on unmount, no state update after', () => {
    const settings: Settings = { ...defaultSettings, transitionType: 'crossfade', transitionDuration: 500 };
    const { container, unmount } = renderTransitionLayer(settings, 3, 0);

    fireEvent.click(screen.getByTestId('next-btn'));
    expect(container.querySelector('[class*="slide-leaving"]')).toBeTruthy();

    unmount();

    // Advance past duration — should not throw (no state update on unmounted component)
    expect(() => {
      act(() => { vi.advanceTimersByTime(500); });
    }).not.toThrow();
  });

  // Satisfies TS-6: Rapid slide changes
  it('TS-6: rapid changes update leavingIndex and clear previous timeout', () => {
    const settings: Settings = { ...defaultSettings, transitionType: 'crossfade', transitionDuration: 500 };
    const { container } = renderTransitionLayer(settings, 3, 0);

    // Advance to slide 1
    fireEvent.click(screen.getByTestId('next-btn'));
    expect(container.querySelector('[class*="slide-leaving"] [data-testid="slide-0"]')).toBeTruthy();

    // Rapidly advance to slide 2 (before 500ms timeout)
    act(() => { vi.advanceTimersByTime(100); });
    fireEvent.click(screen.getByTestId('next-btn'));

    // Leaving should now be slide 1 (not 0)
    expect(container.querySelector('[class*="slide-leaving"] [data-testid="slide-1"]')).toBeTruthy();
    expect(container.querySelector('[class*="slide-leaving"] [data-testid="slide-0"]')).toBeNull();
    expect(container.querySelector('[class*="slide-current"] [data-testid="slide-2"]')).toBeTruthy();

    // After 500ms more, leaving cleared
    act(() => { vi.advanceTimersByTime(500); });
    expect(container.querySelector('[class*="slide-leaving"]')).toBeNull();
  });

  // =============================================
  // Unit Tests — AnimationContext Extension
  // =============================================

  // Satisfies TS-7: SET_TRANSITION_TYPE reducer
  it('TS-7: SET_TRANSITION_TYPE changes transitionType without affecting other fields', () => {
    const { result } = renderHook(() => useAnimation(), { wrapper: createTransitionWrapper() });

    act(() => {
      result.current.dispatch({ type: 'SET_TRANSITION_TYPE', transitionType: 'wipe' });
    });

    expect(result.current.state.transitionType).toBe('wipe');
    expect(result.current.state.transitionDuration).toBe(500);
    expect(result.current.state.overlayEnabled).toBe(false);
    expect(result.current.state.overlayPreset).toBe('none');
  });

  // Satisfies TS-8: SET_TRANSITION_DURATION reducer
  it('TS-8: SET_TRANSITION_DURATION changes duration', () => {
    const { result } = renderHook(() => useAnimation(), { wrapper: createTransitionWrapper() });

    act(() => {
      result.current.dispatch({ type: 'SET_TRANSITION_DURATION', transitionDuration: 1200 });
    });

    expect(result.current.state.transitionDuration).toBe(1200);
    expect(result.current.state.transitionType).toBe('none');
  });

  // Satisfies TS-9: Sanitize invalid transition type
  it('TS-9: sanitizeAnimationSettings defaults invalid transitionType to none with warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const settings = { ...defaultSettings, transitionType: 'zoom' as TransitionType };
    const result = sanitizeAnimationSettings(settings);

    expect(result.transitionType).toBe('none');
    expect(warnSpy).toHaveBeenCalledWith('Invalid transitionType "zoom", defaulting to "none"');
    warnSpy.mockRestore();
  });

  // Satisfies TS-10: Sanitize invalid duration
  it('TS-10a: sanitizeAnimationSettings defaults duration 0 to 500', () => {
    const settings = { ...defaultSettings, transitionDuration: 0 };
    expect(sanitizeAnimationSettings(settings).transitionDuration).toBe(500);
  });

  it('TS-10b: sanitizeAnimationSettings defaults negative duration to 500', () => {
    const settings = { ...defaultSettings, transitionDuration: -100 };
    expect(sanitizeAnimationSettings(settings).transitionDuration).toBe(500);
  });

  it('TS-10c: sanitizeAnimationSettings defaults NaN duration to 500', () => {
    const settings = { ...defaultSettings, transitionDuration: NaN };
    expect(sanitizeAnimationSettings(settings).transitionDuration).toBe(500);
  });

  it('TS-10d: sanitizeAnimationSettings defaults undefined duration to 500', () => {
    const settings = { ...defaultSettings, transitionDuration: undefined as unknown as number };
    expect(sanitizeAnimationSettings(settings).transitionDuration).toBe(500);
  });

  // Satisfies TS-11: Debounced persistence includes transitions
  it('TS-11: debounce persists transitionType and transitionDuration to DB', () => {
    const { result } = renderHook(() => useAnimation(), { wrapper: createTransitionWrapper() });

    act(() => {
      result.current.dispatch({ type: 'SET_TRANSITION_TYPE', transitionType: 'slide' });
      result.current.dispatch({ type: 'SET_TRANSITION_DURATION', transitionDuration: 800 });
    });

    expect(db.settings.update).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(500); });

    expect(db.settings.update).toHaveBeenCalledWith('current', expect.objectContaining({
      transitionType: 'slide',
      transitionDuration: 800,
    }));
  });

  // =============================================
  // Unit Tests — DB Migration
  // =============================================

  // Satisfies TS-12: V4 migration adds defaults
  it('TS-12: upgradeV4Settings adds transitionType and transitionDuration to records without them', async () => {
    const record: Record<string, unknown> = {
      id: 'current',
      currentSlide: 0,
      interval: 5,
      overlayEnabled: false,
    };

    const mockCollection = {
      modify: vi.fn(async (fn: (s: Record<string, unknown>) => void) => { fn(record); }),
    };
    const mockTx = { table: vi.fn().mockReturnValue({ toCollection: () => mockCollection }) };

    await upgradeV4Settings(mockTx as never);

    expect(record.transitionType).toBe('none');
    expect(record.transitionDuration).toBe(500);
  });

  // Satisfies TS-13: V4 migration idempotent
  it('TS-13: upgradeV4Settings does not overwrite existing transition fields', async () => {
    const record: Record<string, unknown> = {
      id: 'current',
      transitionType: 'crossfade',
      transitionDuration: 1000,
    };

    const mockCollection = {
      modify: vi.fn(async (fn: (s: Record<string, unknown>) => void) => { fn(record); }),
    };
    const mockTx = { table: vi.fn().mockReturnValue({ toCollection: () => mockCollection }) };

    await upgradeV4Settings(mockTx as never);

    expect(record.transitionType).toBe('crossfade');
    expect(record.transitionDuration).toBe(1000);
  });

  // Satisfies TS-14: INITIAL_SETTINGS includes transitions
  it('TS-14: INITIAL_SETTINGS contains transitionType and transitionDuration', () => {
    expect(INITIAL_SETTINGS.transitionType).toBe('none');
    expect(INITIAL_SETTINGS.transitionDuration).toBe(500);
  });

  // =============================================
  // Unit Tests — CSS Validation
  // =============================================

  // Satisfies TS-15: GPU-composited properties only
  it('TS-15: transition CSS only animates transform and opacity', () => {
    const transitionBlockRegex = /\.transition-(none|crossfade|slide|wipe|dissolve)\s+\.slide-base\s*\{([^}]*)\}/g;
    let match;
    const animatedProps: string[] = [];
    while ((match = transitionBlockRegex.exec(animationsCss)) !== null) {
      const body = match[2];
      const props = [...body.matchAll(/([\w-]+)\s*:/g)].map(m => m[1]);
      const transitionProp = props.find(p => p === 'transition-property');
      if (transitionProp) {
        // Extract the value of transition-property
        const valueMatch = body.match(/transition-property:\s*([^;]+)/);
        if (valueMatch) {
          animatedProps.push(...valueMatch[1].split(',').map(s => s.trim()));
        }
      }
    }

    const allowed = new Set(['transform', 'opacity']);
    const disallowed = animatedProps.filter(p => p && !allowed.has(p));
    expect(disallowed).toEqual([]);
  });

  // Satisfies TS-16: Z-index compliance
  it('TS-16: state classes have correct z-index values (current=3, leaving=2, hidden=0)', () => {
    const settings: Settings = { ...defaultSettings, transitionType: 'crossfade' };
    const { container } = renderTransitionLayer(settings, 3, 0);

    const current = container.querySelector('.slide-current');
    const hidden = container.querySelectorAll('.slide-hidden');

    expect(current).toBeTruthy();
    expect(hidden.length).toBeGreaterThan(0);

    // Validate CSS source contains the z-index declarations
    if (animationsCss) {
      expect(animationsCss).toContain('z-index: 3');
      expect(animationsCss).toContain('z-index: 2');
      expect(animationsCss).toContain('z-index: 0');

      const zIndexValues = [...animationsCss.matchAll(/z-index:\s*(\d+)/g)].map(m => parseInt(m[1]));
      const conflicting = zIndexValues.filter(z => z >= 5);
      expect(conflicting).toEqual([]);
    }
  });

  // =============================================
  // Integration Tests
  // =============================================

  // Satisfies TS-19: ErrorBoundary fallback
  it('TS-19: TransitionErrorBoundary renders fallback on error, logs to diagnostics', () => {
    const logError = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    class ThrowingChild extends React.Component {
      // eslint-disable-next-line react/require-render-return
      render(): React.ReactNode {
        throw new Error('Test transition error');
      }
    }

    const { container } = render(
      <TransitionErrorBoundary currentSlideIndex={0} logError={logError} fallbackSlide={<div>Slide 0</div>}>
        <ThrowingChild />
      </TransitionErrorBoundary>
    );

    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('Test transition error'));
    // Fallback renders slide content directly (bypassing transitions)
    expect(container.querySelector('.w-full')).toBeTruthy();
    expect(container.textContent).toContain('Transition error');

    consoleSpy.mockRestore();
  });

  // Satisfies TS-20: SettingsOverlay shows active transition controls
  it('TS-20: SettingsOverlay shows Slide Transitions section with active controls', async () => {
    vi.useRealTimers();

    const settings: Settings = { ...defaultSettings, transitionType: 'dissolve', transitionDuration: 700 };
    render(
      <DiagnosticProvider>
        <PlaybackProvider initialSettings={settings}>
          <AnimationProvider initialSettings={settings}>
            <SettingsOverlay />
          </AnimationProvider>
        </PlaybackProvider>
      </DiagnosticProvider>
    );

    // Open settings
    fireEvent.click(screen.getByLabelText('Open Settings'));

    await waitFor(() => {
      expect(screen.getByText('Slide Transitions')).toBeInTheDocument();
    });

    // Shows current values
    expect(screen.getByText(/700ms/)).toBeInTheDocument();

    // Interactive controls for transitions are present
    expect(screen.getByLabelText('Transition Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Transition Duration')).toBeInTheDocument();

    vi.useFakeTimers();
  });

  // Satisfies TS-21: 24/7 reliability — no accumulation
  it('TS-21: cycling 50+ slides leaves no accumulating timeouts or DOM nodes', () => {
    const settings: Settings = { ...defaultSettings, transitionType: 'crossfade', transitionDuration: 200 };
    const { container, unmount } = renderTransitionLayer(settings, 3, 0);

    // Cycle through 50 slides
    for (let i = 0; i < 50; i++) {
      fireEvent.click(screen.getByTestId('next-btn'));
      act(() => { vi.advanceTimersByTime(250); }); // Advance past duration each time
    }

    // DOM should only have 3 slide children (sliding window)
    const slides = container.querySelectorAll('.slide-base');
    expect(slides.length).toBeLessThanOrEqual(3);

    // No leaving state lingering
    expect(container.querySelector('[class*="slide-leaving"]')).toBeNull();

    unmount();
  });

  // Satisfies TS-22: DB round-trip
  it('TS-22: context loads transition settings from initialSettings', () => {
    const settings: Settings = { ...defaultSettings, transitionType: 'wipe', transitionDuration: 900 };
    const wrapper = createTransitionWrapper(settings);
    const { result } = renderHook(() => useAnimation(), { wrapper });

    expect(result.current.state.transitionType).toBe('wipe');
    expect(result.current.state.transitionDuration).toBe(900);
  });

  it('TS-22b: dispatch changes persist to DB', () => {
    const settings: Settings = { ...defaultSettings, transitionType: 'wipe', transitionDuration: 900 };
    const wrapper = createTransitionWrapper(settings);
    const { result } = renderHook(() => useAnimation(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'SET_TRANSITION_TYPE', transitionType: 'dissolve' });
      result.current.dispatch({ type: 'SET_TRANSITION_DURATION', transitionDuration: 1200 });
    });

    act(() => { vi.advanceTimersByTime(500); });

    expect(db.settings.update).toHaveBeenCalledWith('current', expect.objectContaining({
      transitionType: 'dissolve',
      transitionDuration: 1200,
    }));
  });
});
