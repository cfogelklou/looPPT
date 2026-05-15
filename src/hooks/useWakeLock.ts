import { useEffect, useRef, useState, useCallback } from 'react';

export function useWakeLock(enabled: boolean) {
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setIsActive(true);

        wakeLockRef.current.addEventListener('release', () => {
          setIsActive(false);
          wakeLockRef.current = null;
        });

        console.log('Wake Lock acquired');
      } catch (err: unknown) {
        const name = (err as { name?: string })?.name ?? 'Unknown';
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Wake Lock request failed: ${name}, ${message}`);
        setIsActive(false);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
        console.log('Wake Lock released');
      } catch (err: unknown) {
        const name = (err as { name?: string })?.name ?? 'Unknown';
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Wake Lock release failed: ${name}, ${message}`);
      }
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [enabled, requestWakeLock, releaseWakeLock]);

  return { isActive, requestWakeLock };
}
