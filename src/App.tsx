import React, { useCallback, useEffect, useState, useRef } from 'react';
import { ensureSettings, factoryReset, type Settings } from './store/db';
import { PlaybackProvider, usePlayback } from './store/PlaybackContext';
import { DiagnosticProvider } from './store/DiagnosticContext';
import { AnimationProvider } from './store/AnimationContext';
import { Player } from './components/Player';
import { Uploader } from './components/Uploader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SettingsOverlay } from './components/SettingsOverlay';
import { Layout } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

function AppContent() {
  const { state } = usePlayback();
  const stableSince = useRef(0);
  useEffect(() => { stableSince.current = Date.now(); }, []);

  const onNeedRefresh = useCallback((updateSW: (reload?: boolean) => Promise<void>) => {
    const elapsed = Date.now() - stableSince.current;
    if (elapsed > 30_000) {
      updateSW(true);
    } else {
      setTimeout(() => updateSW(true), 30_000 - elapsed);
    }
  }, []);

  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() { onNeedRefresh(updateServiceWorker); },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) {
        updateServiceWorker();
      }
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [updateServiceWorker]);

  if (!state.presentationId) {
    return (
      <>
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
          <div className="mb-12 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-900/20">
                <Layout className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">LooPPT</h1>
            <p className="text-zinc-500">Perpetual Presentation Loop Player</p>
          </div>
          <Uploader />
        </div>
        <SettingsOverlay alwaysShowGear />
      </>
    );
  }

  return <Player />;
}

export default function App() {
  const [initialSettings, setInitialSettings] = useState<Settings | null>(null);
  const [startupError, setStartupError] = useState<string | null>(null);

  useEffect(() => {
    ensureSettings()
      .then(setInitialSettings)
      .catch((err) => {
        setStartupError(err instanceof Error ? err.message : 'Failed to initialize database.');
      });
  }, []);

  if (startupError) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">!</div>
        <h2 className="text-xl font-bold text-zinc-200 mb-2">Startup Error</h2>
        <p className="text-sm text-zinc-400 max-w-md mb-6">{startupError}</p>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-white"
          >
            Retry
          </button>
          <button
            onClick={() => factoryReset()}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg transition-colors text-white"
          >
            Factory Reset
          </button>
        </div>
      </div>
    );
  }

  if (!initialSettings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-zinc-800 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <DiagnosticProvider>
        <PlaybackProvider initialSettings={initialSettings}>
          <AnimationProvider initialSettings={initialSettings}>
            <AppContent />
          </AnimationProvider>
        </PlaybackProvider>
      </DiagnosticProvider>
    </ErrorBoundary>
  );
}
