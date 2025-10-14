// hooks/useExperiences.ts (CORRECCIÓN COMPLETA)
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

export interface Experience {
  id: string;
  url_foto: string;
  descripcion: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'procesando';
  creado_en: string;
  lugar_id?: string;
  lugar_nombre?: string;
  lugar_ubicacion?: string;
  contador_vistas: number;
  ancho_imagen?: number;
  alto_imagen?: number;
  tamaño_archivo?: number;
  tipo_archivo?: string;
  // Campos de moderación
  moderado?: boolean;
  puntuacion_texto?: number;
  puntuacion_imagen?: number;
  aprobado_automatico?: boolean;
  motivo_rechazo?: string;
  hash_navegador?: string;
}

export interface ExperienceStats {
  total: number;
  total_vistas: number;
  por_estado: Array<{
    estado: string;
    cantidad: number;
    total_vistas: number;
  }>;
}

interface ExperiencesResponse {
  experiencias: Experience[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

interface MyExperiencesResponse {
  experiencias: Experience[];
  total: number;
}

interface UploadResponse {
  mensaje: string;
  experiencia: {
    id: string;
    estado: string;
    limite_restante: number;
  };
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
      detalles?: string;
    };
    status?: number;
  };
  message?: string;
}

interface VistaDetallada {
  ip_usuario: string;
  agente_usuario: string;
  visto_en: string;
  creado_en: string;
}

export const useExperiences = () => {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [myExperiences, setMyExperiences] = useState<Experience[]>([]);
  const [pendingExperiences, setPendingExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [moderating, setModerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleError = (err: unknown): string => {
    const apiError = err as ApiError;
    
    if (apiError?.response?.status === 429) {
      return apiError.response.data?.detalles || 'Límite diario alcanzado';
    }
    
    return apiError?.response?.data?.error || apiError?.message || 'Error desconocido';
  };

  // Función para construir URLs de imágenes
  const buildImageUrl = (imagePath: string | null | undefined): string => {
    if (!imagePath) return '/placeholder-experience.jpg';
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    
    return `${backendUrl}${normalizedPath}`;
  };

  /**
   * Obtener todas las experiencias aprobadas (público)
   */
  const fetchExperiences = useCallback(async (filters?: {
    pagina?: number;
    limite?: number;
    lugar_id?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.pagina) params.append('pagina', filters.pagina.toString());
      if (filters?.limite) params.append('limite', filters.limite.toString());
      if (filters?.lugar_id) params.append('lugar_id', filters.lugar_id);

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
  const fetchMyExperiences = useCallback(async (): Promise<Experience[]> => {
    try {
      setLoading(true);
      const response = await api.get<MyExperiencesResponse>('/api/experiencias/usuario/mis-experiencias');
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
      toast({
        title: 'Error',
        description: 'No se pudieron cargar tus experiencias',
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Obtener experiencia específica por ID
   */
  const fetchExperienceById = useCallback(async (id: string): Promise<Experience | null> => {
    try {
      setLoading(true);
      const response = await api.get<{ experiencia: Experience }>(`/api/experiencias/${id}`);
      const experience = response.data.experiencia;
      
      return {
        ...experience,
        url_foto: buildImageUrl(experience.url_foto)
      };
    } catch (err: unknown) {
      const errorMessage = handleError(err);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

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

      // Validaciones frontend adicionales
      if (descripcion.trim().length > 500) {
        toast({
          title: 'Error',
          description: 'La descripción no puede exceder los 500 caracteres',
          variant: 'destructive',
        });
        return false;
      }

      const formData = new FormData();
      formData.append('imagen', imageFile);
      formData.append('descripcion', descripcion.trim());
      if (lugarId) {
        formData.append('lugar_id', lugarId);
      }

      await api.post<UploadResponse>('/api/experiencias/subir', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Recargar mis experiencias después de subir
      await fetchMyExperiences();

      toast({
        title: '✅ Experiencia subida',
        description: 'Tu experiencia ha sido enviada para moderación.',
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
  }, [toast, fetchMyExperiences]);

  /**
   * Editar experiencia existente
   */
  const editExperience = useCallback(async (
    experienceId: string,
    descripcion: string
  ): Promise<boolean> => {
    try {
      setEditing(experienceId);

      // Validación frontend
      if (descripcion.trim().length > 500) {
        toast({
          title: 'Error',
          description: 'La descripción no puede exceder los 500 caracteres',
          variant: 'destructive',
        });
        return false;
      }

      await api.put(`/api/experiencias/${experienceId}/editar`, {
        descripcion: descripcion.trim()
      });

      // Actualizar mis experiencias
      await fetchMyExperiences();

      toast({
        title: '✅ Experiencia actualizada',
        description: 'Tu experiencia ha sido actualizada y será revisada nuevamente.',
        variant: 'default',
      });

      return true;
    } catch (err: unknown) {
      const errorMessage = handleError(err);
      toast({
        title: '❌ Error al editar experiencia',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setEditing(null);
    }
  }, [toast, fetchMyExperiences]);

  /**
   * Eliminar experiencia
   */
  const deleteExperience = useCallback(async (experienceId: string): Promise<boolean> => {
    try {
      setDeleting(experienceId);

      await api.delete(`/api/experiencias/${experienceId}/eliminar`);

      // Actualizar mis experiencias
      await fetchMyExperiences();

      toast({
        title: '✅ Experiencia eliminada',
        description: 'Tu experiencia ha sido eliminada exitosamente.',
        variant: 'default',
      });

      return true;
    } catch (err: unknown) {
      const errorMessage = handleError(err);
      toast({
        title: '❌ Error al eliminar experiencia',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setDeleting(null);
    }
  }, [toast, fetchMyExperiences]);

  // ==================== FUNCIONES DE ADMIN/MODERACIÓN ====================

  /**
   * Obtener experiencias pendientes de moderación (admin only)
   */
  const fetchPendingExperiences = useCallback(async (filters?: {
    pagina?: number;
    limite?: number;
  }) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filters?.pagina) params.append('pagina', filters.pagina.toString());
      if (filters?.limite) params.append('limite', filters.limite.toString());

      const queryString = params.toString();
      const url = queryString ? `/api/experiencias/admin/pendientes?${queryString}` : '/api/experiencias/admin/pendientes';

      const response = await api.get<ExperiencesResponse>(url);
      const experiencesData = response.data.experiencias || [];
      
      const parsedExperiences = experiencesData.map(exp => ({
        ...exp,
        url_foto: buildImageUrl(exp.url_foto)
      }));
      
      setPendingExperiences(parsedExperiences);
      
      return {
        experiencias: parsedExperiences,
        total: response.data.total,
        pagina: response.data.pagina
      };
    } catch (err: unknown) {
      const errorMessage = handleError(err);
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
   * Moderar experiencia (aprobar/rechazar) - admin only
   */
  const moderateExperience = useCallback(async (
    experienceId: string,
    accion: 'aprobar' | 'rechazar',
    razon?: string
  ): Promise<boolean> => {
    try {
      setModerating(experienceId);

      const response = await api.patch(`/api/experiencias/${experienceId}/moderar`, {
        accion,
        razon
      });

      // Actualizar lista de pendientes
      await fetchPendingExperiences();

      toast({
        title: `✅ Experiencia ${accion === 'aprobar' ? 'aprobada' : 'rechazada'}`,
        description: response.headers.mensaje,
        variant: 'default',
      });

      return true;
    } catch (err: unknown) {
      const errorMessage = handleError(err);
      toast({
        title: '❌ Error en moderación',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setModerating(null);
    }
  }, [toast, fetchPendingExperiences]);

  /**
   * Obtener estadísticas de experiencias (admin)
   */
  const getExperienceStats = useCallback(async (): Promise<ExperienceStats | null> => {
    try {
      const response = await api.get<ExperienceStats>('/api/experiencias/admin/estadisticas');
      return response.data;
    } catch (err: unknown) {
      console.error('Error obteniendo estadísticas:', err);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las estadísticas',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  /**
   * Incrementar contador de vistas - VERSIÓN CORREGIDA
   */
  const incrementViewCount = useCallback(async (experienceId: string): Promise<boolean> => {
    try {
      console.log('👀 Incrementando vista para experiencia:', experienceId);
      
      await api.post(`/api/experiencias/${experienceId}/vista`);
      
      console.log('✅ Vista registrada exitosamente');
      return true;
    } catch (err: unknown) {
      console.error('❌ Error incrementando vista:', err);
      // No mostrar toast para errores de vistas (son silenciosos)
      return false;
    }
  }, []);

  /**
   * Obtener estadísticas detalladas de vistas (admin)
   */
  const getVistasDetalladas = useCallback(async (experienceId: string): Promise<VistaDetallada[]> => {
    try {
      const response = await api.get<{vistas: VistaDetallada[]}>(`/api/experiencias/${experienceId}/vistas-detalladas`);
      return response.data.vistas || [];
    } catch (err: unknown) {
      console.error('Error obteniendo vistas detalladas:', err);
      return [];
    }
  }, []);

  /**
   * Reevaluar experiencias automáticamente (para vistas en tiempo real)
   */
  const reevaluateExperiences = useCallback(async (): Promise<void> => {
    try {
      // Recargar experiencias públicas
      await fetchExperiences();
      
      // Si el usuario está logueado, recargar sus experiencias también
      const hasMyExperiences = myExperiences.length > 0;
      if (hasMyExperiences) {
        await fetchMyExperiences();
      }
    } catch (err) {
      console.error('Error en reevaluación automática:', err);
    }
  }, [fetchExperiences, fetchMyExperiences, myExperiences.length]);

  // Efecto para recarga automática periódica (opcional)
  useEffect(() => {
    const interval = setInterval(() => {
      reevaluateExperiences();
    }, 30000); // Recargar cada 30 segundos

    return () => clearInterval(interval);
  }, [reevaluateExperiences]);

  return {
    // Estado
    experiences,
    myExperiences,
    pendingExperiences,
    loading,
    uploading,
    editing,
    deleting,
    moderating,
    error,
    
    // Acciones públicas
    fetchExperiences,
    fetchMyExperiences,
    fetchExperienceById,
    uploadExperience,
    editExperience,
    deleteExperience,
    incrementViewCount,
    
    // Acciones de administración
    fetchPendingExperiences,
    moderateExperience,
    getExperienceStats,
    getVistasDetalladas,
    
    // Utilidades
    reevaluateExperiences,
    refetch: fetchExperiences,
    resetError: () => setError(null),
    
    // Estados de carga específicos
    isUploading: uploading,
    isEditing: (id: string) => editing === id,
    isDeleting: (id: string) => deleting === id,
    isModerating: (id: string) => moderating === id,
  };
};

// Hook complementario para pre-moderación en frontend
export const useExperienceValidation = () => {
  useToast();

  const validateDescription = (descripcion: string): { isValid: boolean; message?: string } => {
    if (!descripcion.trim()) {
      return { isValid: false, message: 'La descripción es requerida' };
    }

    if (descripcion.trim().length > 500) {
      return { isValid: false, message: 'La descripción no puede exceder los 500 caracteres' };
    }

    if (descripcion.trim().length < 10) {
      return { isValid: false, message: 'La descripción debe tener al menos 10 caracteres' };
    }

    return { isValid: true };
  };

  const validateImage = (file: File): { isValid: boolean; message?: string } => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      return { isValid: false, message: 'Formato de imagen no válido. Use JPEG, PNG, WebP o GIF' };
    }

    if (file.size > maxSize) {
      return { isValid: false, message: 'La imagen no puede ser mayor a 5MB' };
    }

    if (file.size < 1024) {
      return { isValid: false, message: 'La imagen es demasiado pequeña' };
    }

    return { isValid: true };
  };

  const preModerateContent = async (descripcion: string, imageFile?: File): Promise<{
    isValid: boolean;
    warnings: string[];
  }> => {
    const warnings: string[] = [];
    
    // Validar descripción
    const descValidation = validateDescription(descripcion);
    if (!descValidation.isValid) {
      return { isValid: false, warnings: [descValidation.message!] };
    }

    // Validar imagen si se proporciona
    if (imageFile) {
      const imageValidation = validateImage(imageFile);
      if (!imageValidation.isValid) {
        return { isValid: false, warnings: [imageValidation.message!] };
      }
    }

    // Detección básica de spam en frontend
    const spamWords = ['vendo', 'compro', 'oferta', 'descuento', 'ganar dinero', 'trabajo desde casa'];
    const hasSpam = spamWords.some(word => 
      descripcion.toLowerCase().includes(word.toLowerCase())
    );

    if (hasSpam) {
      warnings.push('Tu contenido parece contener elementos comerciales. Por favor, mantén el contenido personal y auténtico.');
    }

    return { isValid: true, warnings };
  };

  return {
    validateDescription,
    validateImage,
    preModerateContent
  };
};