import { useAuth } from '../hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = true }: ProtectedRouteProps) => {
  const { isAuthenticated, isAdmin, loading, setRedirectPath } = useAuth(); // ✅ Cambiar a setRedirectPath
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // ✅ Guardar la ruta usando setRedirectPath
    const currentPath = location.pathname + location.search;
    console.log('🚫 No autenticado, guardando ruta:', currentPath);
    setRedirectPath(currentPath);
    
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};