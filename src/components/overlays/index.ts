import type { OverlayPreset } from '../../store/db';
import { ArrowOverlay } from './ArrowOverlay';
import { CircleHighlight } from './CircleHighlight';
import { StarBurst } from './StarBurst';
import React from 'react';

export const PRESET_COMPONENTS: Record<Exclude<OverlayPreset, 'none'>, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  'bounce': ArrowOverlay,
  'fly-across': StarBurst,
  'pulse': CircleHighlight,
};
