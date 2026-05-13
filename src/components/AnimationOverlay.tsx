import React, { useEffect, useState } from 'react';
import { useAnimation } from '../store/AnimationContext';
import { PRESET_COMPONENTS } from './overlays';
import { db } from '../store/db';

const PRESET_POSITIONS: Record<string, string> = {
  'bounce': 'flex items-center justify-center',
  'fly-across': 'flex items-start justify-start',
  'pulse': 'flex items-start justify-end',
};

function CustomOverlayRenderer({ preset, size, opacity, speed }: {
  preset: string;
  size: number;
  opacity: number;
  speed: number;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  const id = parseInt(preset.replace('custom:', ''), 10);

  useEffect(() => {
    let revoked = false;
    db.overlays.get(id).then((overlay) => {
      if (overlay && !revoked) {
        const url = URL.createObjectURL(overlay.blob);
        setObjectUrl(url);
      }
    }).catch(console.error);
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  // Cleanup object URL on unmount or when it changes
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  if (!objectUrl) return null;

  const duration = 2 / speed;

  return (
    <img
      src={objectUrl}
      alt="Custom overlay"
      className="animate-overlay-custom"
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

  if (!state.overlayEnabled || state.overlayPreset === 'none') {
    return null;
  }

  const isCustom = state.overlayPreset.startsWith('custom:');
  const presetKey = isCustom ? null : state.overlayPreset as keyof typeof PRESET_COMPONENTS;
  const SvgComponent = presetKey ? PRESET_COMPONENTS[presetKey] : null;

  const positionClasses = isCustom
    ? 'flex items-center justify-center'
    : (PRESET_POSITIONS[state.overlayPreset] ?? 'flex items-center justify-center');

  const baseDuration = state.overlayPreset === 'fly-across' ? 8 : 2;
  const duration = baseDuration / state.overlaySpeed;

  if (isCustom) {
    return (
      <div className={`absolute inset-0 pointer-events-none z-[5] ${positionClasses}`}>
        <CustomOverlayRenderer
          preset={state.overlayPreset}
          size={state.overlaySize}
          opacity={state.overlayOpacity}
          speed={state.overlaySpeed}
        />
      </div>
    );
  }

  if (!SvgComponent) {
    return null;
  }

  const animationClass = `animate-overlay-${state.overlayPreset}`;

  return (
    <div className={`absolute inset-0 pointer-events-none z-[5] ${positionClasses}`}>
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
