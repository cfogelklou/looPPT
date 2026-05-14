import React, { ReactElement, useEffect, useRef, useState, useMemo } from 'react';
import { useAnimation } from '../store/AnimationContext';

interface TransitionLayerProps {
  currentSlideIndex: number;
  children: ReactElement[];
}

export function TransitionLayer({ currentSlideIndex, children }: TransitionLayerProps) {
  const { state } = useAnimation();
  const { transitionType, transitionDuration } = state;

  const [leavingIndex, setLeavingIndex] = useState<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const prevIndexRef = useRef<number>(currentSlideIndex);

  const duration = transitionType === 'none' ? 300 : transitionDuration;

  useEffect(() => {
    if (prevIndexRef.current !== currentSlideIndex) {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      setLeavingIndex(prevIndexRef.current);
      prevIndexRef.current = currentSlideIndex;

      timeoutRef.current = window.setTimeout(() => {
        setLeavingIndex(null);
        timeoutRef.current = null;
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [currentSlideIndex, duration]);

  const containerStyle = useMemo(() => ({
    '--transition-duration': `${duration}ms`,
  }) as React.CSSProperties, [duration]);

  return (
    <div
      className={`slide-transition-container transition-${transitionType}`}
      style={containerStyle}
    >
      {children.map((child) => {
        const key = Number(child.key);
        let stateClass: string;
        if (key === currentSlideIndex) {
          stateClass = 'slide-current';
        } else if (key === leavingIndex) {
          stateClass = 'slide-leaving';
        } else {
          stateClass = 'slide-hidden';
        }

        return (
          <div key={key} className={`slide-base ${stateClass}`}>
            {child}
          </div>
        );
      })}
    </div>
  );
}
