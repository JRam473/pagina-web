import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../lib/axios';

interface Admin {
  id: string;
  usuario: string;
  email: string;
  rol: string;
  avatar_url?: string;
}

interface ApiResponse {
  token: string;
  administrador: Admin;
}

interface AuthContextType {
  admin: Admin | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signOut: () => void;
  signInWithGoogle: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  redirectPath: string;
  setRedirectPath: (path: string) => void;
  getPreLoginPath: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [redirectPath, setRedirectPath] = useState('/');
  const isAdmin = isAuthenticated;

  // ✅ Cargar admin desde token
  const loadAdminFromToken = useCallback(async (token: string): Promise<void> => {
    try {
      const response = await api.get<{ administrador: Admin }>('/api/admin/perfil', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAdmin(response.data.administrador);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('❌ Token inválido o expirado:', error);
      localStorage.removeItem('admin_token');
      setIsAuthenticated(false);
      setAdmin(null);
    }
  }, []);

  // ✅ Verificar autenticación al cargar la app
  const checkAuth = useCallback(async (): Promise<void> => {
    const token = localStorage.getItem('admin_token');
    
    if (token) {
      await loadAdminFromToken(token);
    } else {
      setIsAuthenticated(false);
      setAdmin(null);
    }
    setLoading(false);
  }, [loadAdminFromToken]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // ✅ Login para administradores
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      const response = await api.post<ApiResponse>('/api/admin/login', { 
        email, 
        password 
      });
      
      const { token, administrador } = response.data;
      
      localStorage.setItem('admin_token', token);
      setAdmin(administrador);
      setIsAuthenticated(true);
      
    } catch (error: unknown) {
      console.error('Error en login:', error);
      setIsAuthenticated(false);
      setAdmin(null);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        if (axiosError.response?.data?.error) {
          throw new Error(axiosError.response.data.error);
        }
      }
      throw new Error('Error al iniciar sesión');
    }
  };

  const signOut = (): void => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('pre_login_path');
    setAdmin(null);
    setIsAuthenticated(false);
    setRedirectPath('/');
  };

  // ✅ Función para obtener la ruta guardada (para OAuthCallback)
  const getPreLoginPath = (): string => {
    const path = redirectPath || localStorage.getItem('pre_login_path') || '/';
    console.log('📍 getPreLoginPath - Ruta recuperada:', path);
    localStorage.removeItem('pre_login_path');
    return path;
  };

  const signInWithGoogle = (): void => {
    const pathToSave = redirectPath !== '/' ? redirectPath : window.location.pathname;
    
    console.log('📍 signInWithGoogle - Ruta a guardar:', pathToSave);
    
    localStorage.setItem('pre_login_path', pathToSave);
    
    const googleAuthUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/google?state=${encodeURIComponent(pathToSave)}`;
    console.log('🔗 Redirigiendo a Google OAuth con estado:', googleAuthUrl);
    
    window.location.href = googleAuthUrl;
  };

  return (
    <AuthContext.Provider value={{ 
      admin, 
      loading, 
      isAuthenticated,
      isAdmin,
      signOut, 
      signInWithGoogle,
      signIn,
      redirectPath,
      setRedirectPath,
      getPreLoginPath
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ✅ Exportar el hook en un archivo separado para evitar el error de Fast Refresh
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};