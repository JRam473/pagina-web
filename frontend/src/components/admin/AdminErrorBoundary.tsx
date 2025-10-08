// components/admin/AdminErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  operation?: string; // Para identificar qué operación falló
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class AdminErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    console.log('🛡️ [AdminErrorBoundary] Error capturado:', error.message);
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`🛡️ [AdminErrorBoundary] Error en ${this.props.operation || 'operación'}:`, error);
    console.error('🛡️ [AdminErrorBoundary] Error Info:', errorInfo);
    
    // Ejecutar callback personalizado si existe
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-3 border border-red-300 bg-red-50 rounded-lg">
          <h3 className="text-red-800 font-medium text-sm">
            Error en {this.props.operation || 'la operación'}
          </h3>
          <p className="text-red-600 text-xs mt-1">
            {this.state.error?.message || 'Ha ocurrido un error inesperado.'}
          </p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}