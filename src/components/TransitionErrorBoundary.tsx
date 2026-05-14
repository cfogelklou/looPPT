import React, { ReactNode } from 'react';

interface Props {
  currentSlideIndex: number;
  children: ReactNode;
  logError: (message: string) => void;
  fallbackSlide: ReactNode;
}

interface State {
  hasError: boolean;
}

export class TransitionErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.logError(`TransitionLayer: ${error.message}\n${errorInfo.componentStack}`);
  }

  render() {
    if (this.state.hasError) {
      // Fallback: render basic container without transition logic
      // (cannot re-render children that threw — React will re-throw)
      return (
        <div className="w-full h-full relative">
          <div style={{ position: 'absolute', inset: 0, zIndex: 1, opacity: 1, visibility: 'visible' as const }}>
            {this.props.fallbackSlide}
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2, background: 'rgba(0,0,0,0.7)', color: '#ffab40', fontSize: 12, padding: '4px 8px' }}>
            Transition error — showing slide without transitions
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
