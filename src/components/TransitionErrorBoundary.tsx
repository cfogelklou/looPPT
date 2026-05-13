import React, { ReactNode } from 'react';

interface Props {
  currentSlideIndex: number;
  children: ReactNode;
  logError: (message: string) => void;
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
          <div style={{ opacity: 1, visibility: 'visible' as const, zIndex: 1 }}>
            Slide render error — transitions disabled
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
