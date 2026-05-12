import React, { useState, useCallback } from 'react';
import { db } from '../store/db';
import { usePlayback } from '../store/PlaybackContext';
import { Upload, AlertCircle } from 'lucide-react';

export function Uploader() {
  const { dispatch } = usePlayback();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pptx')) {
      setError('Please upload a valid .pptx file.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setProgress(10);

    try {
      // Check quota
      if (navigator.storage && navigator.storage.estimate) {
        const { quota, usage } = await navigator.storage.estimate();
        if (quota !== undefined && usage !== undefined && (quota - usage) < file.size) {
          throw new Error('Insufficient storage space.');
        }
      }
      setProgress(30);

      const id = await db.presentations.add({
        name: file.name,
        blob: file,
        updatedAt: Date.now()
      });
      setProgress(70);

      dispatch({ type: 'SET_PRESENTATION', id: id as number, totalSlides: 0 });
      setProgress(100);

      setTimeout(() => {
        setIsUploading(false);
        setProgress(0);
      }, 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file.');
      setIsUploading(false);
    }
  }, [dispatch]);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl max-w-md w-full mx-auto">
      <label className="flex flex-col items-center cursor-pointer group w-full">
        <div className="w-16 h-16 mb-4 flex items-center justify-center bg-zinc-800 group-hover:bg-zinc-700 rounded-full transition-colors">
          <Upload className="w-8 h-8 text-zinc-400 group-hover:text-zinc-200" />
        </div>
        <span className="text-lg font-medium text-zinc-200">Upload Presentation</span>
        <span className="text-sm text-zinc-500 mt-1 text-center">Select a .pptx file to start looping</span>
        <input 
          type="file" 
          className="hidden" 
          accept=".pptx" 
          onChange={handleFileUpload}
          disabled={isUploading}
          aria-label="Upload Presentation"
        />
      </label>

      {isUploading && (
        <div className="w-full mt-6">
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-center text-zinc-500 mt-2 font-mono">Processing {progress}%...</p>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg w-full">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="break-words">{error}</span>
        </div>
      )}
    </div>
  );
}
