// components/ErrorBoundary/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    this.props.onReset?.();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              ¡Ups! Algo salió mal
            </h1>
            
            <p className="text-gray-600 mb-6">
              Ha ocurrido un error inesperado en el sistema de mapas. 
              Esto puede ser temporal.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-500 mb-2">Detalles del error:</p>
              <code className="text-xs text-red-600 break-all">
                {this.state.error?.message || 'Error desconocido'}
              </code>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RotateCw className="w-4 h-4" />
                Reintentar
              </Button>
              
              <Button
                onClick={this.handleReload}
                variant="outline"
                className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Home className="w-4 h-4" />
                Recargar página
              </Button>
            </div>

            <p className="text-xs text-gray-500 mt-6">
              Si el problema persiste, contacta al soporte técnico.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook para usar el ErrorBoundary en componentes funcionales
export const useErrorHandler = () => {
  const throwError = (error: Error) => {
    throw error;
  };

  return { throwError };
};