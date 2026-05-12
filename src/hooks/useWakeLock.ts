import { useEffect, useRef, useState, useCallback } from 'react';

export function useWakeLock(enabled: boolean) {
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && enabled) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setIsActive(true);
        
        wakeLockRef.current.addEventListener('release', () => {
          setIsActive(false);
          wakeLockRef.current = null;
        });
        
        console.log('Wake Lock acquired');
      } catch (err: any) {
        console.error(`Wake Lock request failed: ${err.name}, ${err.message}`);
        setIsActive(false);
      }
    }
  }, [enabled]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
        console.log('Wake Lock released');
      } catch (err: any) {
        console.error(`Wake Lock release failed: ${err.name}, ${err.message}`);
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

  return { isActive };
}
