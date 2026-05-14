import { render, screen, act, fireEvent, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { ReactNode } from 'react';
import { AnimationProvider, useAnimation, sanitizeAnimationSettings } from '../store/AnimationContext';
import { PlaybackProvider, usePlayback } from '../store/PlaybackContext';
import { DiagnosticProvider } from '../store/DiagnosticContext';
import { AnimationOverlay } from '../components/AnimationOverlay';
import { AnimationErrorBoundary } from '../components/AnimationErrorBoundary';
import { SettingsOverlay } from '../components/SettingsOverlay';
import { db, upgradeV3Settings, upgradeV8Settings, type Settings } from '../store/db';

// Vite raw import for CSS content inspection
import animationsCss from '../styles/animations.css?raw';

// Mock DB — keep real upgradeV3Settings for T7/T8
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
    wakeLockFallback: false,
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
    wakeLockFallback: false,
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
    wakeLockFallback: false,
};

function createWrapper(settings: Settings = defaultSettings) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <DiagnosticProvider>
      <PlaybackProvider initialSettings={settings}>
        <AnimationProvider initialSettings={settings}>
          {children}
        </AnimationProvider>
      </PlaybackProvider>
    </DiagnosticProvider>
  );
  Wrapper.displayName = 'Milestone1Wrapper';
  return Wrapper;
}

describe('Milestone 1: Overlays MVP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  // Satisfies T1: Animation Context Initial State
  it('T1: initializes with default animation state', () => {
    const { result } = renderHook(() => useAnimation(), { wrapper: createWrapper() });

    expect(result.current.state.overlayEnabled).toBe(false);
    expect(result.current.state.overlayPreset).toBe('none');
    expect(result.current.state.overlaySize).toBe(100);
    expect(result.current.state.overlayOpacity).toBe(1.0);
  });

  // Satisfies T2: Animation Context Actions
  it('T2: dispatches SET_OVERLAY_ENABLED and persists after 500ms', () => {
    const { result } = renderHook(() => useAnimation(), { wrapper: createWrapper() });

    act(() => {
      result.current.dispatch({ type: 'SET_OVERLAY_ENABLED', enabled: true });
    });

    expect(result.current.state.overlayEnabled).toBe(true);
    expect(result.current.state.overlayPreset).toBe('none');

    expect(db.settings.update).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(db.settings.update).toHaveBeenCalledWith('current', expect.objectContaining({
      overlayEnabled: true,
    }));
  });

  // Satisfies T3: Persistence Single-Writer Isolation
  it('T3: animation and playback persist without conflict', () => {
    const { result: animResult } = renderHook(() => useAnimation(), { wrapper: createWrapper() });
    const { result: playbackResult } = renderHook(() => usePlayback(), { wrapper: createWrapper() });

    act(() => {
      animResult.current.dispatch({ type: 'SET_OVERLAY_SIZE', size: 200 });
      playbackResult.current.dispatch({ type: 'NEXT_SLIDE' });
    });

    act(() => {
      vi.advanceTimersByTime(600);
    });

    const updateCalls = (db.settings.update as ReturnType<typeof vi.fn>).mock.calls;
    const animationUpdate = updateCalls.find((call: unknown[]) =>
      typeof call[1] === 'object' && call[1] !== null && 'overlaySize' in (call[1] as Record<string, unknown>)
    );
    const playbackUpdate = updateCalls.find((call: unknown[]) =>
      typeof call[1] === 'object' && call[1] !== null && 'currentSlide' in (call[1] as Record<string, unknown>)
    );

    expect(animationUpdate).toBeDefined();
    expect(playbackUpdate).toBeDefined();
  });

  // Satisfies T4: Overlay Disabled Renders Null
  it('T4a: AnimationOverlay renders null when overlayEnabled is false', () => {
    const { container } = render(
      <AnimationProvider initialSettings={defaultSettings}>
        <AnimationOverlay />
      </AnimationProvider>
    );

    expect(container.innerHTML).toBe('');
  });

  // Satisfies T4: Overlay also renders null when enabled but preset is 'none'
  it('T4b: AnimationOverlay renders null when overlayEnabled=true but overlayPreset=none', () => {
    const enabledNoPreset: Settings = {
      ...defaultSettings,
      overlayEnabled: true,
      overlayPreset: 'none',
    };

    const { container } = render(
      <AnimationProvider initialSettings={enabledNoPreset}>
        <AnimationOverlay />
      </AnimationProvider>
    );

    expect(container.innerHTML).toBe('');
  });

  // Satisfies T5: Overlay Enabled Renders SVG
  it('T5: AnimationOverlay renders SVG with correct classes when enabled', () => {
    const enabledSettings: Settings = {
      ...defaultSettings,
      overlayEnabled: true,
      overlayPreset: 'bounce',
    };

    const { container } = render(
      <AnimationProvider initialSettings={enabledSettings}>
        <AnimationOverlay />
      </AnimationProvider>
    );

    const overlayDiv = container.querySelector('.pointer-events-none');
    expect(overlayDiv).not.toBeNull();
    expect(overlayDiv?.className).toContain('z-[5]');

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('class')).toContain('animate-overlay-bounce');
  });

  // Satisfies T6: ErrorBoundary Catches Overlay Errors
  it('T6: ErrorBoundary catches errors and logs to diagnostic context', () => {
    const logError = vi.fn();

    const ThrowingOverlay = () => {
      throw new Error('Test overlay error');
    };

    const { container } = render(
      <AnimationErrorBoundary logError={logError}>
        <ThrowingOverlay />
      </AnimationErrorBoundary>
    );

    expect(container.innerHTML).toBe('');
    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('Test overlay error'));
  });

  // Satisfies T7: DB v3 Migration Preserves Existing Data
  it('T7: v3 migration adds overlay fields to existing v2 data without overwriting', async () => {
    // Simulate a v2 settings record (no overlay fields)
    const v2Record: Record<string, unknown> = {
      id: 'current',
      currentSlide: 3,
      interval: 10,
      fitMode: 'contain',
    };

    const mockCollection = {
      modify: vi.fn(async (fn: (s: Record<string, unknown>) => void) => {
        fn(v2Record);
      }),
    };
    const mockTx = {
      table: vi.fn().mockReturnValue({ toCollection: () => mockCollection }),
    };

    await upgradeV3Settings(mockTx as never);

    // Existing v2 data preserved
    expect(v2Record.currentSlide).toBe(3);
    expect(v2Record.interval).toBe(10);
    expect(v2Record.fitMode).toBe('contain');
    // New overlay fields added with defaults
    expect(v2Record.overlayEnabled).toBe(false);
    expect(v2Record.overlayPreset).toBe('none');
    expect(v2Record.overlaySize).toBe(100);
    expect(v2Record.overlayOpacity).toBe(1.0);
  });

  // Satisfies T8: DB v3 Migration Idempotent
  it('T8: v3 migration does not overwrite existing overlay fields', async () => {
    // Simulate an already-migrated v3 record
    const v3Record: Record<string, unknown> = {
      id: 'current',
      currentSlide: 3,
      interval: 10,
      fitMode: 'contain',
      overlayEnabled: true,
      overlayPreset: 'bounce',
      overlaySize: 150,
      overlayOpacity: 0.8,
    };

    const mockCollection = {
      modify: vi.fn(async (fn: (s: Record<string, unknown>) => void) => {
        fn(v3Record);
      }),
    };
    const mockTx = {
      table: vi.fn().mockReturnValue({ toCollection: () => mockCollection }),
    };

    await upgradeV3Settings(mockTx as never);

    // Overlay fields unchanged — not overwritten with defaults
    expect(v3Record.overlayEnabled).toBe(true);
    expect(v3Record.overlayPreset).toBe('bounce');
    expect(v3Record.overlaySize).toBe(150);
    expect(v3Record.overlayOpacity).toBe(0.8);
  });

  // V8 migration: wakeLockFallback field
  it('upgradeV8Settings adds default wakeLockFallback when missing', async () => {
    const v7Record: Record<string, unknown> = {
      id: 'current',
      currentSlide: 0,
      interval: 5,
    };

    const mockCollection = {
      modify: vi.fn(async (fn: (s: Record<string, unknown>) => void) => {
        fn(v7Record);
      }),
    };
    const mockTx = {
      table: vi.fn().mockReturnValue({ toCollection: () => mockCollection }),
    };

    await upgradeV8Settings(mockTx as never);

    expect(v7Record.wakeLockFallback).toBe(false);
  });

  it('upgradeV8Settings preserves existing wakeLockFallback value', async () => {
    const v8Record: Record<string, unknown> = {
      id: 'current',
      currentSlide: 0,
      interval: 5,
      wakeLockFallback: true,
    };

    const mockCollection = {
      modify: vi.fn(async (fn: (s: Record<string, unknown>) => void) => {
        fn(v8Record);
      }),
    };
    const mockTx = {
      table: vi.fn().mockReturnValue({ toCollection: () => mockCollection }),
    };

    await upgradeV8Settings(mockTx as never);

    expect(v8Record.wakeLockFallback).toBe(true);
  });

  // Satisfies T9: Corrupted DB Settings Fallback
  it('T9: sanitizeAnimationSettings rejects invalid preset', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const corruptedSettings = {
      ...defaultSettings,
      overlayPreset: 'invalid-value' as 'bounce',
    };

    const result = sanitizeAnimationSettings(corruptedSettings);

    expect(result.overlayPreset).toBe('none');
    expect(warnSpy).toHaveBeenCalledWith('Invalid overlayPreset "invalid-value", defaulting to "none"');

    warnSpy.mockRestore();
  });

  it('sanitizeAnimationSettings handles embedUrl', () => {
    const empty = sanitizeAnimationSettings({ ...defaultSettings, embedUrl: '' });
    expect(empty.embedUrl).toBe('');

    const valid = sanitizeAnimationSettings({ ...defaultSettings, embedUrl: 'https://example.com' });
    expect(valid.embedUrl).toBe('https://example.com');

    const trimmed = sanitizeAnimationSettings({ ...defaultSettings, embedUrl: '  https://example.com  ' });
    expect(trimmed.embedUrl).toBe('https://example.com');

    const invalid = sanitizeAnimationSettings({ ...defaultSettings, embedUrl: 'http://example.com' });
    expect(invalid.embedUrl).toBe('');
  });

  // Satisfies T10: Settings UI Toggle
  it('T10: toggling overlay switch ON makes animation controls visible', async () => {
    vi.useRealTimers();

    render(
      <DiagnosticProvider>
        <PlaybackProvider initialSettings={defaultSettings}>
          <AnimationProvider initialSettings={defaultSettings}>
            <SettingsOverlay />
          </AnimationProvider>
        </PlaybackProvider>
      </DiagnosticProvider>
    );

    // Open the settings drawer by clicking the gear icon
    const gearButton = screen.getByLabelText('Open Settings');
    fireEvent.click(gearButton);

    // Find the overlay toggle switch by role (MUI renders Switch as checkbox)
    const toggle = screen.getByRole('checkbox', { name: /Animation Overlay/ });
    expect(toggle).toBeInTheDocument();

    // Initially unchecked
    expect(toggle).not.toBeChecked();

    // Controls should not be visible yet
    expect(screen.queryByLabelText('Overlay Presets')).not.toBeInTheDocument();

    // Toggle ON
    fireEvent.click(toggle);

    // After toggle, controls become visible
    await waitFor(() => {
      expect(screen.getByLabelText('Overlay Presets')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Overlay Size')).toBeInTheDocument();
    expect(screen.getByLabelText('Overlay Opacity')).toBeInTheDocument();

    vi.useFakeTimers();
  });

  // Satisfies T11: Settings UI Section Collapse
  it('T11: toggling overlay OFF hides animation controls', async () => {
    vi.useRealTimers();

    const enabledSettings: Settings = {
      ...defaultSettings,
      overlayEnabled: true,
      overlayPreset: 'bounce',
    };

    render(
      <DiagnosticProvider>
        <PlaybackProvider initialSettings={enabledSettings}>
          <AnimationProvider initialSettings={enabledSettings}>
            <SettingsOverlay />
          </AnimationProvider>
        </PlaybackProvider>
      </DiagnosticProvider>
    );

    // Open the settings drawer
    const gearButton = screen.getByLabelText('Open Settings');
    fireEvent.click(gearButton);

    // Controls should be visible initially (overlay enabled)
    await waitFor(() => {
      expect(screen.getByLabelText('Overlay Presets')).toBeInTheDocument();
    });

    // Toggle OFF
    const toggle = screen.getByRole('checkbox', { name: /Animation Overlay/ });
    fireEvent.click(toggle);

    // After toggle, controls should collapse
    await waitFor(() => {
      expect(screen.queryByLabelText('Overlay Presets')).not.toBeInTheDocument();
    });
    expect(screen.queryByLabelText('Overlay Size')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Overlay Opacity')).not.toBeInTheDocument();

    // Toggle switch still visible
    expect(screen.getByRole('checkbox', { name: /Animation Overlay/ })).toBeInTheDocument();

    vi.useFakeTimers();
  });

  // Satisfies T12: CSS Animations Use Only Transform/Opacity
  it('T12: all keyframe definitions use only transform/opacity', () => {
    const keyframeRegex = /@keyframes\s+[\w-]+\s*\{([\s\S]*?)\}/g;
    let match;
    while ((match = keyframeRegex.exec(animationsCss)) !== null) {
      const body = match[1];
      const properties = [...body.matchAll(/([\w-]+)\s*:/g)].map(m => m[1]);
      const allowed = new Set(['transform', 'opacity']);
      const disallowed = properties.filter(p => !allowed.has(p));
      expect(disallowed).toEqual([]);
    }
  });

  // Satisfies T13: ErrorBoundary Recovery on Preset Change
  it('T13: ErrorBoundary key change forces remount', () => {
    const logError = vi.fn();
    let shouldThrow = true;

    const ConditionalOverlay = () => {
      if (shouldThrow) throw new Error('Conditional error');
      return <div>Recovered</div>;
    };

    // First render: error boundary catches
    const { container, rerender } = render(
      <AnimationErrorBoundary logError={logError} key="bad-preset">
        <ConditionalOverlay />
      </AnimationErrorBoundary>
    );

    expect(container.innerHTML).toBe('');
    expect(logError).toHaveBeenCalledTimes(1);

    // Fix the error and change key
    shouldThrow = false;
    rerender(
      <AnimationErrorBoundary logError={logError} key="bounce">
        <ConditionalOverlay />
      </AnimationErrorBoundary>
    );

    expect(container.textContent).toBe('Recovered');
  });
});
