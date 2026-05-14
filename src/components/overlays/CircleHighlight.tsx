import React from 'react';

interface CircleHighlightProps {
  className?: string;
  style?: React.CSSProperties;
}

export function CircleHighlight({ className, style }: CircleHighlightProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="6"
        opacity="0.8"
      />
      <circle
        cx="50"
        cy="50"
        r="30"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="3"
        opacity="0.5"
      />
    </svg>
  );
}
