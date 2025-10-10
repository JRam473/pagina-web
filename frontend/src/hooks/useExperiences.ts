// hooks/useExperiences.ts
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

export interface Experience {
  id: string;
  url_foto: string;
  descripcion: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  creado_en: string;
  lugar_id?: string;
  lugar_nombre?: string;
  lugar_ubicacion?: string;
  contador_vistas: number;
  ancho_imagen?: number;
  alto_imagen?: number;
  tamaño_archivo?: number;
  tipo_archivo?: string;
}

export interface ExperienceStats {
  total: number;
  aprobadas: number;
  pendientes: number;
  total_vistas: number;
}

interface ExperiencesResponse {
  experiencias: Experience[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

export const useExperiences = () => {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [myExperiences, setMyExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleError = (err: unknown): string => {
    const error = err as ApiError;
    return error?.response?.data?.error || error?.message || 'Error desconocido';
  };

  // Función para construir URLs de imágenes
  const buildImageUrl = (imagePath: string | null | undefined): string => {
    if (!imagePath) return '/placeholder.svg';
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    
    return `${backendUrl}${normalizedPath}`;
  };

  /**
   * Obtener todas las experiencias aprobadas
   */
  const fetchExperiences = useCallback(async (filters?: {
    pagina?: number;
    limite?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.pagina) params.append('pagina', filters.pagina.toString());
      if (filters?.limite) params.append('limite', filters.limite.toString());

      const queryString = params.toString();
      const url = queryString ? `/api/experiencias?${queryString}` : '/api/experiencias';

      const response = await api.get<ExperiencesResponse>(url);
      const experiencesData = response.data.experiencias || [];
      
      // Procesar URLs de imágenes
      const parsedExperiences = experiencesData.map(exp => ({
        ...exp,
        url_foto: buildImageUrl(exp.url_foto)
      }));
      
      setExperiences(parsedExperiences);
      
      return {
        experiencias: parsedExperiences,
        total: response.data.total,
        pagina: response.data.pagina,
        totalPaginas: response.data.totalPaginas
      };
    } catch (err: unknown) {
      const errorMessage = handleError(err);
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Obtener experiencias del usuario actual
   */
  const fetchMyExperiences = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/experiencias/usuario/mis-experiencias');
      const experiencesData = response.data.experiencias || [];
      
      // Procesar URLs de imágenes
      const parsedExperiences = experiencesData.map(exp => ({
        ...exp,
        url_foto: buildImageUrl(exp.url_foto)
      }));
      
      setMyExperiences(parsedExperiences);
      return parsedExperiences;
    } catch (err: unknown) {
      const errorMessage = handleError(err);
      console.error('Error obteniendo mis experiencias:', errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Subir nueva experiencia
   */
  const uploadExperience = useCallback(async (
    imageFile: File,
    descripcion: string,
    lugarId?: string
  ): Promise<boolean> => {
    try {
      setUploading(true);

      // Verificar términos y condiciones
      const termsAccepted = localStorage.getItem('experience_terms_accepted') === 'true';
      
      if (!termsAccepted) {
        throw new Error('TERMS_REQUIRED');
      }

      const formData = new FormData();
      formData.append('imagen', imageFile);
      formData.append('descripcion', descripcion);
      if (lugarId) {
        formData.append('lugar_id', lugarId);
      }

      const response = await api.post('/api/experiencias/subir', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Recargar ambas listas después de subir
      await Promise.all([
        fetchExperiences(),
        fetchMyExperiences()
      ]);

      toast({
        title: '✅ Experiencia subida',
        description: `Tu experiencia ha sido enviada para moderación. ${response.data.experiencia?.limite_restante ? `Te quedan ${response.data.experiencia.limite_restante} experiencias hoy.` : ''}`,
        variant: 'default',
      });

      return true;
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'TERMS_REQUIRED') {
        throw err;
      }
      
      const errorMessage = handleError(err);
      toast({
        title: '❌ Error al subir experiencia',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setUploading(false);
    }
  }, [toast, fetchExperiences, fetchMyExperiences]);

  /**
   * Obtener estadísticas de experiencias (admin)
   */
  const getExperienceStats = useCallback(async (): Promise<ExperienceStats | null> => {
    try {
      const response = await api.get('/api/experiencias/admin/estadisticas');
      return response.data;
    } catch (err: unknown) {
      console.error('Error obteniendo estadísticas:', err);
      return null;
    }
  }, []);

  /**
   * Incrementar contador de vistas
   */
  const incrementViewCount = useCallback(async (experienceId: string): Promise<void> => {
    try {
      await api.post(`/api/experiencias/${experienceId}/vista`);
    } catch (err) {
      console.error('Error incrementando vista:', err);
    }
  }, []);

  return {
    // Estado
    experiences,
    myExperiences,
    loading,
    uploading,
    error,
    
    // Acciones
    fetchExperiences,
    fetchMyExperiences,
    uploadExperience,
    getExperienceStats,
    incrementViewCount,
    
    // Utilidades
    refetch: fetchExperiences,
    resetError: () => setError(null),
  };
};