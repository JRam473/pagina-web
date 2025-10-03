// components/SilentErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class SilentErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Error silenciado:', error);
    
    // Recarga automática e inmediata sin mostrar nada
    setTimeout(() => {
      window.location.reload();
    }, 100); // Delay mínimo para evitar bucles
  }

  public render() {
    if (this.state.hasError) {
      // Renderizar ABSOLUTAMENTE NADA durante el breve momento antes del reload
      return null;
    }

    return this.props.children;
  }
}