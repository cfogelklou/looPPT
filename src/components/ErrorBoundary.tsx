import React, { Component, ReactNode } from 'react';
import { factoryReset } from '../store/db';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="text-5xl mb-4">!</div>
          <h2 className="text-xl font-bold text-zinc-200 mb-2">Something went wrong</h2>
          <p className="text-sm text-zinc-400 max-w-md mb-6">{this.state.error.message}</p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-white"
            >
              Reload
            </button>
            <button
              onClick={() => factoryReset()}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg transition-colors text-white"
            >
              Factory Reset
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
