import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getPreLoginPath } = useAuth(); // ✅ Usar la nueva función
  
  const token = searchParams.get('token');
  const error = searchParams.get('error');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      if (error) {
        console.error('❌ Error de OAuth:', error);
        navigate('/login', { 
          replace: true,
          state: { error: getErrorMessage(error) }
        });
        return;
      }

      if (token) {
        try {
          // ✅ OBTENER LA RUTA GUARDADA usando la nueva función
          const redirectTo = getPreLoginPath();
          
          console.log('✅ Token recibido, guardando...');
          console.log('📍 OAuthCallback - Redirigiendo a:', redirectTo);
          
          // Guardar el token de admin
          localStorage.setItem('admin_token', token);
          
          // ✅ REDIRIGIR A LA RUTA GUARDADA
          setTimeout(() => {
            navigate(redirectTo, { replace: true });
          }, 500);
          
        } catch (error) {
          console.error('❌ Error procesando OAuth callback:', error);
          navigate('/login', { 
            replace: true,
            state: { error: 'Error procesando autenticación' }
          });
        }
      } else {
        console.error('❌ Token no recibido');
        navigate('/login', { 
          replace: true,
          state: { error: 'Token de autenticación no recibido' }
        });
      }
    };

    handleOAuthCallback();
  }, [token, error, navigate, getPreLoginPath]);

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'unauthorized':
        return 'No estás autorizado para acceder al panel administrativo';
      case 'server_error':
        return 'Error del servidor durante la autenticación';
      default:
        return 'Error durante la autenticación';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800">
          {token ? 'Autenticación exitosa' : 'Procesando autenticación'}
        </h2>
        <p className="text-gray-600 mt-2">
          {token ? 'Redirigiendo...' : 'Esperando respuesta...'}
        </p>
      </div>
    </div>
  );
};