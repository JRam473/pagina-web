// hooks/useSilentRecovery.ts
import { useEffect } from 'react';

export const useSilentRecovery = (dependencies: any[] = []) => {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Detectar errores específicos de React/removeChild
      if (event.error?.message?.includes('removeChild') || 
          event.error?.message?.includes('Node')) {
        event.preventDefault();
        console.warn('Error silenciado, recargando...');
        setTimeout(() => window.location.reload(), 100);
      }
    };

    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, dependencies);
};