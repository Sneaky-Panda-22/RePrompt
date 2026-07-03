import { Component } from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto">
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
            <h2 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">
              Component Error
            </h2>
            <pre className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap font-mono bg-black/5 dark:bg-white/5 p-4 rounded-lg overflow-auto max-h-96">
              {this.state.error?.message}
              {"\n\n"}
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
