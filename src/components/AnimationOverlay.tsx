import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAnimation } from '../store/AnimationContext';
import { PRESET_COMPONENTS } from './overlays';
import { db } from '../store/db';

const ANIMATION_CLASSES: Record<string, string> = {
  'bounce': 'animate-overlay-bounce',
  'fly-across': 'animate-overlay-fly-across',
  'pulse': 'animate-overlay-pulse',
};

const BASE_DURATIONS: Record<string, number> = {
  'bounce': 4,
  'fly-across': 6,
  'pulse': 2,
};

function getAnimDuration(preset: string, speed: number) {
  const base = BASE_DURATIONS[preset] ?? 4;
  return base / speed;
}

function CustomOverlayRenderer({ motionPreset, size, opacity, speed }: {
  motionPreset: string;
  size: number;
  opacity: number;
  speed: number;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  const preset = motionPreset.startsWith('custom:') ? 'bounce' : motionPreset;

  useEffect(() => {
    const id = parseInt(motionPreset.replace('custom:', ''), 10);
    let revoked = false;
    db.overlays.get(id).then((overlay) => {
      if (revoked) return;
      if (overlay) {
        const url = URL.createObjectURL(overlay.blob);
        setObjectUrl(url);
      } else {
        setObjectUrl(null);
      }
    }).catch(console.error);
    return () => {
      revoked = true;
    };
  }, [motionPreset]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  if (!objectUrl) return null;

  const animClass = ANIMATION_CLASSES[preset] ?? ANIMATION_CLASSES['bounce'];
  const duration = getAnimDuration(preset, speed);

  return (
    <img
      src={objectUrl}
      alt="Custom overlay"
      className={animClass}
      style={{
        width: size,
        height: size,
        opacity,
        objectFit: 'contain',
        '--overlay-duration': `${duration}s`,
      } as React.CSSProperties}
    />
  );
}

export function AnimationOverlay() {
  const { state } = useAnimation();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);
  const animTimerRef = useRef<number | null>(null);

  const presetKey = state.overlayPreset.startsWith('custom:')
    ? 'bounce'
    : state.overlayPreset;
  const animDuration = getAnimDuration(presetKey, state.overlaySpeed);
  const frequencyMs = state.overlayFrequency * 60 * 1000;

  const show = useCallback(() => {
    setVisible(true);
    // Clear previous hide timer before scheduling new one
    if (animTimerRef.current != null) {
      clearTimeout(animTimerRef.current);
    }
    // Hide after animation completes
    animTimerRef.current = window.setTimeout(() => {
      setVisible(false);
    }, animDuration * 1000);
  }, [animDuration]);

  useEffect(() => {
    if (!state.overlayEnabled || state.overlayPreset === 'none') {
      setVisible(false);
      return;
    }

    // Show immediately on first mount
    show();

    // Then show every frequencyMs
    timerRef.current = window.setInterval(show, frequencyMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, [state.overlayEnabled, state.overlayPreset, frequencyMs, show]);

  if (!state.overlayEnabled || state.overlayPreset === 'none' || !visible) {
    return null;
  }

  const isCustom = state.overlayPreset.startsWith('custom:');
  const presetComponentKey = isCustom ? null : state.overlayPreset as keyof typeof PRESET_COMPONENTS;
  const SvgComponent = presetComponentKey ? PRESET_COMPONENTS[presetComponentKey] : null;

  const duration = getAnimDuration(presetKey, state.overlaySpeed);

  if (isCustom) {
    return (
      <div className="absolute inset-0 pointer-events-none z-[5]">
        <CustomOverlayRenderer
          motionPreset={state.overlayPreset}
          size={state.overlaySize}
          opacity={state.overlayOpacity}
          speed={state.overlaySpeed}
        />
      </div>
    );
  }

  if (!SvgComponent) return null;

  const animationClass = `animate-overlay-${state.overlayPreset}`;

  return (
    <div className="absolute inset-0 pointer-events-none z-[5]">
      <SvgComponent
        className={animationClass}
        style={{
          width: state.overlaySize,
          height: state.overlaySize,
          opacity: state.overlayOpacity,
          '--overlay-opacity': state.overlayOpacity,
          '--overlay-duration': `${duration}s`,
        } as React.CSSProperties}
      />
    </div>
  );
}
