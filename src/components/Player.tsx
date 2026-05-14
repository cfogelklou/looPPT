import React, { useEffect, useState } from 'react';
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

  useWakeLock(state.isPlaying);

  useEffect(() => {
    if (state.presentationId) {
      db.presentations.get(state.presentationId).then(pres => {
        setSourceType(pres?.sourceType ?? 'pptx');
      });
    }
  }, [state.presentationId]);

  if (!state.presentationId) return null;

  return (
    <>
      {sourceType === 'pdf' ? <PdfPlayer />
        : sourceType === 'pptx' ? <PptxPlayer />
        : <PlayerShell isLoading error={null}><div /></PlayerShell>}
      <WakeLockFallback active={animState.wakeLockFallback && state.isPlaying} />
    </>
  );
}
