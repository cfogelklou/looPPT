import React, { useEffect, useState } from 'react';
import { ensureSettings, type Settings } from './store/db';
import { PlaybackProvider, usePlayback } from './store/PlaybackContext';
import { Player } from './components/Player';
import { Uploader } from './components/Uploader';
import { Layout } from 'lucide-react';

function AppContent() {
  const { state } = usePlayback();

  if (!state.presentationId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-900/20">
              <Layout className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">LooPPT</h1>
          <p className="text-zinc-500">Perpetual PowerPoint Loop Player</p>
        </div>
        <Uploader />
      </div>
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
    <PlaybackProvider initialSettings={initialSettings}>
      <AppContent />
    </PlaybackProvider>
  );
}
