import React, { useCallback, useEffect, useState } from 'react';
import { usePlayback } from '../store/PlaybackContext';
import { db, type PresentationSourceType } from '../store/db';
import { PlayerShell } from './PlayerShell';
import { PptxPlayer } from './PptxPlayer';
import { PdfPlayer } from './PdfPlayer';
import { useWakeLock } from '../hooks/useWakeLock';

export function Player() {
  const { state } = usePlayback();
  const [sourceType, setSourceType] = useState<PresentationSourceType | null>(null);
  const { isActive, requestWakeLock } = useWakeLock(state.isPlaying);

  useEffect(() => {
    if (state.presentationId) {
      db.presentations.get(state.presentationId).then(pres => {
        setSourceType(pres?.sourceType ?? 'pptx');
      });
    }
  }, [state.presentationId]);

  const handleRequestWakeLock = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch { /* fullscreen may already be active */ }
    await requestWakeLock();
  }, [requestWakeLock]);

  if (!state.presentationId) return null;

  if (sourceType === 'pdf') return <PdfPlayer wakeLockActive={isActive} onRequestWakeLock={handleRequestWakeLock} />;
  if (sourceType === 'pptx') return <PptxPlayer wakeLockActive={isActive} onRequestWakeLock={handleRequestWakeLock} />;
  return <PlayerShell isLoading error={null} wakeLockActive={isActive} onRequestWakeLock={handleRequestWakeLock}><div /></PlayerShell>;
}
