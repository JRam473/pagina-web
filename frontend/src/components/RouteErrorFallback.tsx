// components/RouteErrorFallback.tsx
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RouteErrorFallback() {
  const error = useRouteError();
  
  console.error('Error de ruta:', error);

  let errorMessage = 'Ha ocurrido un error inesperado';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || error.data?.message || 'Error de ruta';
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Error {errorStatus}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {errorMessage}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Recargar
          </Button>
          
          <Button asChild variant="outline" className="flex items-center gap-2">
            <Link to="/">
              <Home className="w-4 h-4" />
              Ir al Inicio
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}