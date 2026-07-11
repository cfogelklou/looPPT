import React, { useEffect, useState } from 'react';
import { ensureSettings, type Settings } from './store/db';
import { PlaybackProvider, usePlayback } from './store/PlaybackContext';
import { DiagnosticProvider } from './store/DiagnosticContext';
import { AnimationProvider } from './store/AnimationContext';
import { Player } from './components/Player';
import { Uploader } from './components/Uploader';
import { SettingsOverlay } from './components/SettingsOverlay';
import { Layout } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AdBanner } from './components/AdBanner';

function AppContent() {
  const { state } = usePlayback();
  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      // R5: Auto-apply updates
      updateServiceWorker(true);
    },
  });

  // R5: Periodically check for updates (every 1 hour)
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) {
        // This will trigger onNeedRefresh if an update is found
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
          
          {/* Manual AdSense Banner */}
          <div className="mt-8 w-full max-w-[1200px] ad-banner-wrapper">
            <AdBanner orientation="portrait" height={90} width={1200} />
          </div>
        </div>
        <SettingsOverlay alwaysShowGear />
      </>
    );
  }

  return <Player />;
}

export default function App() {
  const [initialSettings, setInitialSettings] = useState<Settings | null>(null);

  useEffect(() => {
    ensureSettings().then(setInitialSettings);
  }, []);

  if (!initialSettings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-zinc-800 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DiagnosticProvider>
      <PlaybackProvider initialSettings={initialSettings}>
        <AnimationProvider initialSettings={initialSettings}>
          <AppContent />
        </AnimationProvider>
      </PlaybackProvider>
    </DiagnosticProvider>
  );
}
