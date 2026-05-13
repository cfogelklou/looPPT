import type { OverlayPreset } from '../../store/db';
import { ArrowOverlay } from './ArrowOverlay';
import { CircleHighlight } from './CircleHighlight';
import { StarBurst } from './StarBurst';
import React from 'react';

type BuiltInPreset = 'bounce' | 'fly-across' | 'pulse';

export const PRESET_COMPONENTS: Record<BuiltInPreset, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  'bounce': ArrowOverlay,
  'fly-across': StarBurst,
  'pulse': CircleHighlight,
};

export const PRESET_META: Record<BuiltInPreset, { label: string; component: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  'bounce': { label: 'Bounce', component: ArrowOverlay },
  'fly-across': { label: 'Fly Across', component: StarBurst },
  'pulse': { label: 'Pulse', component: CircleHighlight },
};
