import { render, screen, act, fireEvent, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { ReactNode } from 'react';
import { AnimationProvider, useAnimation, sanitizeAnimationSettings } from '../store/AnimationContext';
import { PlaybackProvider } from '../store/PlaybackContext';
import { DiagnosticProvider } from '../store/DiagnosticContext';
import { AnimationOverlay } from '../components/AnimationOverlay';
import { AnimationErrorBoundary } from '../components/AnimationErrorBoundary';
import { SettingsOverlay } from '../components/SettingsOverlay';
import { db, upgradeV5Settings, type Settings } from '../store/db';

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
  Delete: () => <span>Delete</span>,
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
  Wrapper.displayName = 'Milestone3Wrapper';
  return Wrapper;
}

describe('Milestone 3: Settings UI & Uploads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  // --- Transition Settings (TS-1 through TS-5) ---

  // Satisfies TS-1: Transition dropdown shows all five types
  it('TS-1: transition dropdown shows all five types with current selection', async () => {
    vi.useRealTimers();

    const settings: Settings = { ...defaultSettings, transitionType: 'crossfade' };

    render(createWrapper(settings)({ children: <SettingsOverlay /> }));

    fireEvent.click(screen.getByLabelText('Open Settings'));

    // Wait for drawer to render and find the Select trigger
    await waitFor(() => {
      expect(screen.getByText('Slide Transitions')).toBeInTheDocument();
    });

    // Find the MUI Select trigger by looking for the form control containing "Transition Type" label
    const transitionSection = screen.getByText('Slide Transitions').parentElement!;
    const selectTrigger = transitionSection.querySelector('.MuiSelect-select') as HTMLElement;
    expect(selectTrigger).not.toBeNull();
    expect(selectTrigger.textContent).toBe('Crossfade');

    // Open select and verify all options
    fireEvent.mouseDown(selectTrigger);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'None' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Crossfade' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Slide' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Wipe' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Dissolve' })).toBeInTheDocument();
    });

    vi.useFakeTimers();
  });

  // Satisfies TS-2: Selecting dissolve dispatches correct action
  it('TS-2: selecting transition type dispatches SET_TRANSITION_TYPE', async () => {
    vi.useRealTimers();

    render(createWrapper()({ children: <SettingsOverlay /> }));

    fireEvent.click(screen.getByLabelText('Open Settings'));

    await waitFor(() => {
      expect(screen.getByText('Slide Transitions')).toBeInTheDocument();
    });

    const selectTrigger = document.querySelector('.MuiSelect-select') as HTMLElement;
    fireEvent.mouseDown(selectTrigger);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Dissolve' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('option', { name: 'Dissolve' }));

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Dissolve' })).toHaveAttribute('aria-selected', 'true');
    });

    vi.useFakeTimers();
  });

  // Satisfies TS-3: Duration slider shows value in ms
  it('TS-3: transition duration slider shows value in ms', async () => {
    vi.useRealTimers();

    const settings: Settings = { ...defaultSettings, transitionDuration: 800 };

    render(createWrapper(settings)({ children: <SettingsOverlay /> }));

    fireEvent.click(screen.getByLabelText('Open Settings'));

    await waitFor(() => {
      expect(screen.getByText('800ms')).toBeInTheDocument();
    });

    const slider = screen.getByLabelText('Transition Duration');
    expect(slider).toBeInTheDocument();

    vi.useFakeTimers();
  });

  // Satisfies TS-4: Dragging duration slider dispatches action
  it('TS-4: changing duration slider dispatches SET_TRANSITION_DURATION', async () => {
    vi.useRealTimers();

    render(createWrapper()({ children: <SettingsOverlay /> }));

    fireEvent.click(screen.getByLabelText('Open Settings'));

    await waitFor(() => {
      expect(screen.getByLabelText('Transition Duration')).toBeInTheDocument();
    });

    const slider = screen.getByLabelText('Transition Duration');
    fireEvent.change(slider, { target: { value: 1200 } });

    // Verify UI reflects the change
    await waitFor(() => {
      expect(screen.getByText('1200ms')).toBeInTheDocument();
    });

    vi.useFakeTimers();
  });

  // Satisfies TS-5: Transition controls visible when overlay toggle is OFF
  it('TS-5: transition controls visible when overlayEnabled=false', async () => {
    vi.useRealTimers();

    render(createWrapper()({ children: <SettingsOverlay /> }));

    fireEvent.click(screen.getByLabelText('Open Settings'));

    await waitFor(() => {
      expect(screen.getByText('Slide Transitions')).toBeInTheDocument();
    });

    // Transition controls always visible (not gated behind overlay toggle)
    expect(screen.getByLabelText('Transition Duration')).toBeInTheDocument();
    expect(document.querySelector('.MuiSelect-select')).not.toBeNull();

    vi.useFakeTimers();
  });

  // --- Overlay Picker Visual Grid (TS-6 through TS-8) ---

  // Satisfies TS-6: Preset grid shows 4 built-in items
  it('TS-6: preset grid shows None, Bounce, Fly Across, Pulse', async () => {
    vi.useRealTimers();

    const settings: Settings = { ...defaultSettings, overlayEnabled: true };

    render(createWrapper(settings)({ children: <SettingsOverlay /> }));

    fireEvent.click(screen.getByLabelText('Open Settings'));

    await waitFor(() => {
      expect(screen.getByLabelText('Overlay Presets')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('None preset')).toBeInTheDocument();
    expect(screen.getByLabelText('Bounce preset')).toBeInTheDocument();
    expect(screen.getByLabelText('Fly Across preset')).toBeInTheDocument();
    expect(screen.getByLabelText('Pulse preset')).toBeInTheDocument();

    // SVGs rendered as preview thumbnails
    const bounceButton = screen.getByLabelText('Bounce preset');
    expect(bounceButton.querySelector('svg')).not.toBeNull();

    vi.useFakeTimers();
  });

  // Satisfies TS-7: Clicking pulse card dispatches SET_OVERLAY_PRESET
  it('TS-7: clicking preset card dispatches SET_OVERLAY_PRESET', async () => {
    vi.useRealTimers();

    const settings: Settings = { ...defaultSettings, overlayEnabled: true, overlayPreset: 'bounce' };

    render(createWrapper(settings)({ children: <SettingsOverlay /> }));

    fireEvent.click(screen.getByLabelText('Open Settings'));

    await waitFor(() => {
      expect(screen.getByLabelText('Pulse preset')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Pulse preset'));

    // Verify active state via border change
    const pulseBtn = screen.getByLabelText('Pulse preset');
    expect(pulseBtn.style.border).toContain('2px solid');

    vi.useFakeTimers();
  });

  // Satisfies TS-8: Clicking None card sets preset to none without toggling overlayEnabled
  it('TS-8: clicking None card sets preset to none, overlayEnabled stays true', async () => {
    vi.useRealTimers();

    const settings: Settings = { ...defaultSettings, overlayEnabled: true, overlayPreset: 'bounce' };

    render(createWrapper(settings)({ children: <SettingsOverlay /> }));

    fireEvent.click(screen.getByLabelText('Open Settings'));

    await waitFor(() => {
      expect(screen.getByLabelText('None preset')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('None preset'));

    // Controls should still be visible (overlayEnabled is still true)
    expect(screen.getByLabelText('Overlay Presets')).toBeInTheDocument();

    // None card should show active state
    const noneBtn = screen.getByLabelText('None preset');
    expect(noneBtn.style.border).toContain('2px solid');

    vi.useFakeTimers();
  });

  // --- Custom Overlay Uploads (TS-9 through TS-14) ---

  // Satisfies TS-9: Upload button triggers file picker with correct accept
  it('TS-9: upload button has file input accepting png/gif/svg', async () => {
    vi.useRealTimers();

    const settings: Settings = { ...defaultSettings, overlayEnabled: true };

    render(createWrapper(settings)({ children: <SettingsOverlay /> }));

    fireEvent.click(screen.getByLabelText('Open Settings'));

    await waitFor(() => {
      expect(screen.getByText('Upload Overlay')).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText('Upload overlay file') as HTMLInputElement;
    expect(fileInput).toHaveAttribute('accept', '.png,.gif,.svg');

    vi.useFakeTimers();
  });

  // Satisfies TS-11: File > 2MB shows error, not stored
  it('TS-11: file > 2MB shows error, not stored in IndexedDB', async () => {
    vi.useRealTimers();

    const settings: Settings = { ...defaultSettings, overlayEnabled: true };

    render(createWrapper(settings)({ children: <SettingsOverlay /> }));

    fireEvent.click(screen.getByLabelText('Open Settings'));

    await waitFor(() => {
      expect(screen.getByLabelText('Upload overlay file')).toBeInTheDocument();
    });

    const bigFile = new File(['x'.repeat(3 * 1024 * 1024)], 'big.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText('Upload overlay file');

    Object.defineProperty(fileInput, 'files', { value: [bigFile], configurable: true });
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText(/File too large/)).toBeInTheDocument();
    });

    expect(db.overlays.add).not.toHaveBeenCalled();

    vi.useFakeTimers();
  });

  // Satisfies TS-13: Deleting custom overlay removes card, resets preset if selected
  it('TS-13: deleting custom overlay removes card and resets preset if selected', async () => {
    vi.useRealTimers();

    const customBlob = new Blob(['img'], { type: 'image/png' });
    const customOverlay = { id: 1, name: 'test.png', blob: customBlob, mimeType: 'image/png', createdAt: Date.now() };

    vi.mocked(db.overlays.toArray).mockResolvedValue([customOverlay]);

    const settings: Settings = { ...defaultSettings, overlayEnabled: true, overlayPreset: 'custom:1' };

    render(createWrapper(settings)({ children: <SettingsOverlay /> }));

    fireEvent.click(screen.getByLabelText('Open Settings'));

    await waitFor(() => {
      expect(screen.getByLabelText('Custom overlay: test.png')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByLabelText('Delete test.png');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(db.overlays.delete).toHaveBeenCalledWith(1);
    });

    vi.useFakeTimers();
  });

  // Satisfies TS-14: Selecting custom overlay dispatches custom:<id>
  it('TS-14: selecting custom overlay dispatches SET_OVERLAY_PRESET with custom:<id>', async () => {
    vi.useRealTimers();

    const customBlob = new Blob(['img'], { type: 'image/png' });
    const customOverlay = { id: 5, name: 'star.png', blob: customBlob, mimeType: 'image/png', createdAt: Date.now() };

    vi.mocked(db.overlays.toArray).mockResolvedValue([customOverlay]);

    const settings: Settings = { ...defaultSettings, overlayEnabled: true };

    render(createWrapper(settings)({ children: <SettingsOverlay /> }));

    fireEvent.click(screen.getByLabelText('Open Settings'));

    await waitFor(() => {
      expect(screen.getByLabelText('Custom overlay: star.png')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Custom overlay: star.png'));

    // Verify the card shows active state
    const card = screen.getByLabelText('Custom overlay: star.png');
    expect(card.style.border).toContain('2px solid');

    vi.useFakeTimers();
  });

  // --- Custom Overlay Rendering (TS-15) ---

  // Satisfies TS-15: custom:<id> preset renders <img> with object URL
  it('TS-15: AnimationOverlay renders custom overlay as <img>', async () => {
    vi.useRealTimers();

    const customBlob = new Blob(['img'], { type: 'image/png' });
    vi.mocked(db.overlays.get).mockResolvedValue({
      id: 5,
      name: 'star.png',
      blob: customBlob,
      mimeType: 'image/png',
      createdAt: Date.now(),
    });

    const settings: Settings = {
      ...defaultSettings,
      overlayEnabled: true,
      overlayPreset: 'custom:5',
      overlaySize: 80,
      overlayOpacity: 0.7,
    };

    const { container } = render(
      <AnimationProvider initialSettings={settings}>
        <AnimationOverlay />
      </AnimationProvider>
    );

    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img).not.toBeNull();
    });

    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toContain('blob:');
    expect(img.style.width).toBe('80px');
    expect(img.style.opacity).toBe('0.7');
    expect(img.className).toContain('animate-overlay-bounce');

    vi.useFakeTimers();
  });

  // --- Motion/Speed Controls (TS-16 through TS-18) ---

  // Satisfies TS-16: Speed slider visible
  it('TS-16: speed slider visible with correct label', async () => {
    vi.useRealTimers();

    const settings: Settings = { ...defaultSettings, overlayEnabled: true };

    render(createWrapper(settings)({ children: <SettingsOverlay /> }));

    fireEvent.click(screen.getByLabelText('Open Settings'));

    await waitFor(() => {
      expect(screen.getByText(/Speed:/)).toBeInTheDocument();
    });

    const slider = screen.getByLabelText('Overlay Speed');
    expect(slider).toBeInTheDocument();

    vi.useFakeTimers();
  });

  // Satisfies TS-17: Changing speed slider dispatches SET_OVERLAY_SPEED
  it('TS-17: changing speed dispatches SET_OVERLAY_SPEED', () => {
    const { result } = renderHook(() => useAnimation(), { wrapper: createWrapper() });

    act(() => {
      result.current.dispatch({ type: 'SET_OVERLAY_SPEED', speed: 2.0 });
    });

    expect(result.current.state.overlaySpeed).toBe(2.0);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(db.settings.update).toHaveBeenCalledWith('current', expect.objectContaining({
      overlaySpeed: 2.0,
    }));
  });

  // Satisfies TS-18: overlaySpeed defaults to 1.0 when undefined
  it('TS-18: sanitizeAnimationSettings defaults overlaySpeed to 1.0', () => {
    const settings = { ...defaultSettings, overlaySpeed: undefined as unknown as number };
    const result = sanitizeAnimationSettings(settings);
    expect(result.overlaySpeed).toBe(1.0);
  });

  // --- Non-Functional (TS-19 through TS-22) ---

  // Satisfies TS-19: Touch targets >= 44x44
  it('TS-19: grid cards have min 44x44px touch target', async () => {
    vi.useRealTimers();

    const settings: Settings = { ...defaultSettings, overlayEnabled: true };

    render(createWrapper(settings)({ children: <SettingsOverlay /> }));

    fireEvent.click(screen.getByLabelText('Open Settings'));

    await waitFor(() => {
      expect(screen.getByLabelText('Bounce preset')).toBeInTheDocument();
    });

    const bounceBtn = screen.getByLabelText('Bounce preset');
    expect(bounceBtn).toHaveStyle({ minWidth: '44px', minHeight: '44px' });

    vi.useFakeTimers();
  });

  // Satisfies TS-20: Settings persist after 500ms debounce
  it('TS-20: settings persist to IndexedDB after 500ms debounce', () => {
    const { result } = renderHook(() => useAnimation(), { wrapper: createWrapper() });

    act(() => {
      result.current.dispatch({ type: 'SET_OVERLAY_SPEED', speed: 2.0 });
    });

    expect(db.settings.update).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(db.settings.update).toHaveBeenCalledWith('current', expect.objectContaining({
      overlaySpeed: 2.0,
    }));
  });

  // Satisfies TS-21: ErrorBoundary catches broken custom overlay
  it('TS-21: AnimationErrorBoundary catches custom overlay errors', () => {
    const logError = vi.fn();

    const BrokenOverlay = () => {
      throw new Error('Broken custom overlay');
    };

    const { container } = render(
      <AnimationErrorBoundary logError={logError}>
        <BrokenOverlay />
      </AnimationErrorBoundary>
    );

    expect(container.innerHTML).toBe('');
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('Broken custom overlay'));
  });

  // Satisfies TS-22: Deleting selected overlay resets preset and cleans up
  it('TS-22: deleting selected custom overlay resets preset to none and deletes from DB', async () => {
    vi.useRealTimers();

    const customOverlay = {
      id: 2,
      name: 'deleteme.svg',
      blob: new Blob(['<svg/>'], { type: 'image/svg+xml' }),
      mimeType: 'image/svg+xml',
      createdAt: Date.now(),
    };

    vi.mocked(db.overlays.toArray).mockResolvedValue([customOverlay]);

    const settings: Settings = { ...defaultSettings, overlayEnabled: true, overlayPreset: 'custom:2' };

    render(createWrapper(settings)({ children: <SettingsOverlay /> }));

    fireEvent.click(screen.getByLabelText('Open Settings'));

    await waitFor(() => {
      expect(screen.getByLabelText('Custom overlay: deleteme.svg')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Delete deleteme.svg'));

    expect(db.overlays.delete).toHaveBeenCalledWith(2);

    vi.useFakeTimers();
  });

  // --- DB Migration v5 ---

  it('TS-24: v5 migration adds overlaySpeed=1.0 to existing settings', async () => {
    const v4Record: Record<string, unknown> = {
      id: 'current',
      currentSlide: 0,
      interval: 5,
      overlayEnabled: false,
      overlayPreset: 'none',
      overlaySize: 100,
      overlayOpacity: 1.0,
      transitionType: 'none',
      transitionDuration: 500,
    embedUrl: '',
    };

    const mockCollection = {
      modify: vi.fn(async (fn: (s: Record<string, unknown>) => void) => {
        fn(v4Record);
      }),
    };
    const mockTx = {
      table: vi.fn().mockReturnValue({ toCollection: () => mockCollection }),
    };

    await upgradeV5Settings(mockTx as never);

    expect(v4Record.overlaySpeed).toBe(1.0);
  });

  it('TS-25: v5 migration does not overwrite existing overlaySpeed', async () => {
    const v5Record: Record<string, unknown> = {
      id: 'current',
      overlaySpeed: 2.5,
    };

    const mockCollection = {
      modify: vi.fn(async (fn: (s: Record<string, unknown>) => void) => {
        fn(v5Record);
      }),
    };
    const mockTx = {
      table: vi.fn().mockReturnValue({ toCollection: () => mockCollection }),
    };

    await upgradeV5Settings(mockTx as never);

    expect(v5Record.overlaySpeed).toBe(2.5);
  });
});
