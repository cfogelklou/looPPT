import React, { useEffect, useState } from 'react';
import { usePlayback } from '../store/PlaybackContext';
import { db, type PresentationSourceType } from '../store/db';
import { PlayerShell } from './PlayerShell';
import { PptxPlayer } from './PptxPlayer';
import { PdfPlayer } from './PdfPlayer';
import { useWakeLock } from '../hooks/useWakeLock';

export function Player() {
  const { state } = usePlayback();
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

  if (sourceType === 'pdf') return <PdfPlayer />;
  if (sourceType === 'pptx') return <PptxPlayer />;
  return <PlayerShell isLoading error={null}><div /></PlayerShell>;
}
