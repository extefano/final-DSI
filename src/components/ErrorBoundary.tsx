import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Error inesperado' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B1120] p-4">
          <div className="w-full max-w-md rounded-3xl border-2 border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-7 text-center space-y-4">
            <AlertTriangle className="mx-auto h-10 w-10 text-rose-500" />
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Ocurrió un problema inesperado
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="duo-btn inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-blue-600 border-b-4 bg-blue-600 px-5 text-sm font-bold text-white"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Recargar aplicación</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
