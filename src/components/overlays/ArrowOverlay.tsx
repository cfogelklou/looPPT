import React from 'react';

interface ArrowOverlayProps {
  className?: string;
  style?: React.CSSProperties;
}

export function ArrowOverlay({ className, style }: ArrowOverlayProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="arrow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          {/* unslop-ignore: app accent is Tailwind blue; end stop stays in the blue family (blue-400), not AI violet */}
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
      <polygon
        points="50,5 95,50 65,50 65,95 35,95 35,50 5,50"
        fill="url(#arrow-grad)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="2"
      />
    </svg>
  );
}
