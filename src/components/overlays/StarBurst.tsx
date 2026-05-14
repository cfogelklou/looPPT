import React from 'react';

interface StarBurstProps {
  className?: string;
  style?: React.CSSProperties;
}

export function StarBurst({ className, style }: StarBurstProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="star-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <polygon
        points="50,2 61,38 98,38 68,60 79,96 50,74 21,96 32,60 2,38 39,38"
        fill="url(#star-grad)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="2"
      />
    </svg>
  );
}
