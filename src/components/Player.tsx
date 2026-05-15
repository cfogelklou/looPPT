import React, { useCallback, useEffect, useState } from 'react';
import { usePlayback } from '../store/PlaybackContext';
import { db, type PresentationSourceType } from '../store/db';
import { PlayerShell } from './PlayerShell';
import { PptxPlayer } from './PptxPlayer';
import { PdfPlayer } from './PdfPlayer';
import { useWakeLock } from '../hooks/useWakeLock';
import { useAnimation } from '../store/AnimationContext';
import { WakeLockFallback } from './WakeLockFallback';

export function Player() {
  const { state } = usePlayback();
  const { state: animState } = useAnimation();
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

  return (
    <>
      {sourceType === 'pdf' ? <PdfPlayer wakeLockActive={isActive} onRequestWakeLock={handleRequestWakeLock} />
        : sourceType === 'pptx' ? <PptxPlayer wakeLockActive={isActive} onRequestWakeLock={handleRequestWakeLock} />
        : <PlayerShell isLoading error={null} wakeLockActive={isActive} onRequestWakeLock={handleRequestWakeLock}><div /></PlayerShell>}
      <WakeLockFallback active={animState.wakeLockFallback && state.isPlaying} />
    </>
  );
}
