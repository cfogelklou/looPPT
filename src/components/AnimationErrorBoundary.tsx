import React, { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  logError: (message: string) => void;
}

interface State {
  hasError: boolean;
}

export class AnimationErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.logError(`AnimationOverlay: ${error.message}\n${errorInfo.componentStack}`);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
