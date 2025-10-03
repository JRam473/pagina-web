// components/SilentRouteError.tsx
import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';

export function SilentRouteError() {
  const error = useRouteError();
  
  console.warn('Error de ruta silenciado:', error);

  useEffect(() => {
    // Recarga automática inmediata
    window.location.reload();
  }, []);

  // No renderizar absolutamente nada
  return null;
}