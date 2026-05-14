import React, { useEffect, useRef } from 'react';

const SILENT_VIDEO_B64 = 'GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAHoEU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHYTbuMU6uEElTDZ1OsggElTbuMU6uEHFO7a1OsggHS7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsirXsYMPQkBNgI1MYXZmNjIuMTIuMTAwV0GNTGF2ZjYyLjEyLjEwMESJiEB/QAAAAAAAFlSua8iuAQAAAAAAAD/XgQFzxYjb8KrvQFRQY5yBACK1nIN1bmSIgQCGhVZfVlA4g4EBI+ODhB3NZQDgkLCBArqBApqBAlWwhFW5gQESVMNn/HNzoGPAgGfImkWjh0VOQ09ERVJEh41MYXZmNjIuMTIuMTAwc3PWY8CLY8WI2/Cq70BUUGNnyKFFo4dFTkNPREVSRIeUTGF2YzYyLjI4LjEwMCBsaWJ2cHhnyKFFo4hEVVJBVElPTkSHkzAwOjAwOjAwLjUwMDAwMDAwMAAfQ7Z1p+eBAKOigQAAgBACAJ0BKgIAAgALxwiFhYiZhIg/ggAMDWAA/ua1ABxTu2uRu4+zgQC3iveBAfGCAabwgQM=';

const SILENT_VIDEO_URL = URL.createObjectURL(
  new Blob([Uint8Array.from(atob(SILENT_VIDEO_B64), c => c.charCodeAt(0))], { type: 'video/webm' })
);

interface WakeLockFallbackProps {
  active: boolean;
}

export function WakeLockFallback({ active }: WakeLockFallbackProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!active) {
      video.pause();
      return;
    }

    video.src = SILENT_VIDEO_URL;
    video.play().catch(e => console.warn('WakeLockFallback play failed:', e.message));

    return () => {
      video.pause();
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const handleVisibility = () => {
      const video = videoRef.current;
      if (document.visibilityState === 'visible' && video && video.paused) {
        video.play().catch(e => console.warn('WakeLockFallback play failed:', e.message));
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [active]);

  return (
    <video
      ref={videoRef}
      muted
      playsInline
      loop
      disablePictureInPicture
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: 'none',
        zIndex: -9999,
      }}
    />
  );
}
