import React from 'react';
import { useAnimation } from '../store/AnimationContext';
import { PRESET_COMPONENTS } from './overlays';

const PRESET_POSITIONS: Record<string, string> = {
  'bounce': 'flex items-center justify-center',
  'fly-across': 'flex items-start justify-start',
  'pulse': 'flex items-start justify-end',
};

export function AnimationOverlay() {
  const { state } = useAnimation();

  if (!state.overlayEnabled || state.overlayPreset === 'none') {
    return null;
  }

  const SvgComponent = PRESET_COMPONENTS[state.overlayPreset];
  if (!SvgComponent) {
    return null;
  }

  const positionClasses = PRESET_POSITIONS[state.overlayPreset] ?? 'flex items-center justify-center';
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
        } as React.CSSProperties}
      />
    </div>
  );
}
