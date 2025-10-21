// hooks/useExperiences.ts (CORREGIDO - SIN ERRORES TYPESCRIPT)
import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

export interface Experience {
  id: string;
  url_foto: string;
  descripcion: string;
  // ✅ ELIMINADO: estado ya no existe, todas son aprobadas
  creado_en: string;
  lugar_id?: string;
  lugar_nombre?: string;
  lugar_ubicacion?: string;
  contador_vistas: number;
  ancho_imagen?: number;
  alto_imagen?: number;
  tamaño_archivo?: number;
  tipo_archivo?: string;
  // ✅ ELIMINADO: campos de moderación ya no son necesarios
  hash_navegador?: string;
}

// ✅ ACTUALIZADO: Nuevo formato de estadísticas
export interface ExperienceStats {
  estadisticas: {
    total_experiencias: number;
    total_vistas: number;
    usuarios_unicos: number;
    total_experiencias_subidas: number;
    promedio_vistas_por_experiencia: number;
  };
  tendencias: Array<{
    fecha: string;
    cantidad: number;
  }>;
  top_vistas: Array<{
    id: string;
    descripcion: string;
    vistas: number;
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

// ✅ ACTUALIZADO: Nuevo formato de respuesta para subida
interface UploadResponse {
  success: boolean;
  mensaje: string;
  experiencia: {
    id: string;
    url_foto: string;
    descripcion: string;
    creado_en: string;
    limite_restante: number;
  };
}

// ✅ NUEVO: Interface para errores de moderación
interface ModeracionError {
  error: 'CONTENIDO_RECHAZADO';
  message: string;
  motivo: string;
  tipo: string;
  detalles: {
    puntuacion: number;
    problemas: string[];
    sugerencias: string[];
    timestamp: string;
  };
}

// ✅ MEJORADO: Interface más específica para errores de API
interface ApiErrorResponse {
  response?: {
    data?: {
      error?: string;
      detalles?: string;
      message?: string;
    };
    status?: number;
  };
  message?: string;
}

// ✅ NUEVO: Interface para errores de Axios
interface AxiosError {
  response?: {
    data: ModeracionError | { error?: string; message?: string };
    status: number;
  };
  message: string;
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
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ NUEVO: Estados para paginación y carga automática
  const [pagination, setPagination] = useState({
    pagina: 1,
    totalPaginas: 1,
    total: 0,
    tieneMas: false
  });
  
  const [loadingMore, setLoadingMore] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const { toast } = useToast();
  
  // ✅ NUEVO: Referencia para evitar múltiples llamadas
  const isFetching = useRef(false);

  const handleError = (err: unknown): string => {
    const apiError = err as ApiErrorResponse;
    
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
   * Obtener experiencias con paginación - ACTUALIZADO
   */
  const fetchExperiences = useCallback(async (filters?: {
    pagina?: number;
    limite?: number;
    lugar_id?: string;
    cargarMas?: boolean; // ✅ NUEVO: Para cargar más en lugar de reemplazar
  }) => {
    // ✅ NUEVO: Evitar múltiples llamadas simultáneas
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      if (filters?.cargarMas) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      setError(null);

      const params = new URLSearchParams();
      const pagina = filters?.pagina || 1;
      const limite = filters?.limite || 6; // ✅ ESTÁNDAR: 6 experiencias por carga
      
      params.append('pagina', pagina.toString());
      params.append('limite', limite.toString());
      
      if (filters?.lugar_id) params.append('lugar_id', filters.lugar_id);

      const response = await api.get<ExperiencesResponse>(`/api/experiencias?${params}`);
      const experiencesData = response.data.experiencias || [];
      
      // Procesar URLs de imágenes
      const parsedExperiences = experiencesData.map(exp => ({
        ...exp,
        url_foto: buildImageUrl(exp.url_foto)
      }));
      
      // ✅ NUEVO: Actualizar estado según si es carga inicial o "cargar más"
      if (filters?.cargarMas) {
        setExperiences(prev => [...prev, ...parsedExperiences]);
      } else {
        setExperiences(parsedExperiences);
      }
      
      // ✅ NUEVO: Actualizar información de paginación
      setPagination({
        pagina: response.data.pagina,
        totalPaginas: response.data.totalPaginas,
        total: response.data.total,
        tieneMas: response.data.pagina < response.data.totalPaginas
      });
      
      return {
        experiencias: parsedExperiences,
        total: response.data.total,
        pagina: response.data.pagina,
        totalPaginas: response.data.totalPaginas,
        tieneMas: response.data.pagina < response.data.totalPaginas
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
      setLoadingMore(false);
      isFetching.current = false;
    }
  }, [toast]);

  /**
   * ✅ NUEVO: Cargar más experiencias
   */
  const loadMoreExperiences = useCallback(async () => {
    if (loadingMore || !pagination.tieneMas) return;
    
    const nextPage = pagination.pagina + 1;
    await fetchExperiences({ 
      pagina: nextPage, 
      limite: 6, 
      cargarMas: true 
    });
  }, [loadingMore, pagination, fetchExperiences]);

  /**
   * ✅ NUEVO: Sistema de actualización automática
   */
  const startAutoRefresh = useCallback(() => {
    setAutoRefresh(true);
  }, []);

  const stopAutoRefresh = useCallback(() => {
    setAutoRefresh(false);
  }, []);

  // ✅ NUEVO: Efecto para actualización automática
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      try {
        // Solo actualizar si no hay carga en curso
        if (!isFetching.current) {
          await fetchExperiences({ pagina: 1, limite: 6 });
          console.log('🔄 Actualización automática de experiencias');
        }
      } catch (error) {
        console.error('Error en actualización automática:', error);
      }
    }, 10000); // ✅ Actualizar cada 10 segundos

    return () => clearInterval(interval);
  }, [autoRefresh, fetchExperiences]);

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
   * Subir nueva experiencia - CON MANEJO DE MODERACIÓN EN TIEMPO REAL
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

      // ✅ ACTUALIZADO: Nueva ruta y manejo de respuesta
      const response = await api.post<UploadResponse>('/api/experiencias', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.mensaje || 'Error al subir experiencia');
      }

      // Recargar mis experiencias después de subir
      await fetchMyExperiences();

      toast({
        title: '✅ Experiencia publicada',
        description: response.data.mensaje,
        variant: 'default',
      });

      return true;
    } catch (err: unknown) {
      // Manejo de términos requeridos
      if (err instanceof Error && err.message === 'TERMS_REQUIRED') {
        throw err;
      }

      // ✅ CORREGIDO: Manejo específico de errores de moderación sin 'any'
      const apiError = err as AxiosError;
      if (apiError.response?.data && typeof apiError.response.data === 'object' && 'error' in apiError.response.data) {
        const errorData = apiError.response.data;
        
        if (errorData.error === 'CONTENIDO_RECHAZADO') {
          const moderacionError = errorData as ModeracionError;
          
          toast({
            title: '❌ Contenido no aprobado',
            description: moderacionError.message,
            variant: 'destructive',
            duration: 8000,
          });

          // Opcional: Mostrar detalles en consola para debugging
          console.log('Detalles de moderación:', moderacionError.detalles);
        } else {
          // Error genérico
          const errorMessage = errorData.message || handleError(err);
          toast({
            title: '❌ Error al subir experiencia',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      } else {
        // Error genérico sin estructura específica
        const errorMessage = handleError(err);
        toast({
          title: '❌ Error al subir experiencia',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      
      return false;
    } finally {
      setUploading(false);
    }
  }, [toast, fetchMyExperiences]);

  /**
   * Editar experiencia existente - CON MANEJO DE MODERACIÓN EN TIEMPO REAL
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

      // ✅ ACTUALIZADO: Nueva ruta
      await api.put(`/api/experiencias/${experienceId}`, {
        descripcion: descripcion.trim()
      });

      // Actualizar mis experiencias
      await fetchMyExperiences();

      toast({
        title: '✅ Experiencia actualizada',
        description: 'Tu experiencia ha sido actualizada exitosamente.',
        variant: 'default',
      });

      return true;
    } catch (err: unknown) {
      // ✅ CORREGIDO: Manejo de errores de moderación en edición sin 'any'
      const apiError = err as AxiosError;
      if (apiError.response?.data && typeof apiError.response.data === 'object' && 'error' in apiError.response.data) {
        const errorData = apiError.response.data;
        
        if (errorData.error === 'CONTENIDO_RECHAZADO') {
          const moderacionError = errorData as ModeracionError;
          
          toast({
            title: '❌ Contenido no aprobado',
            description: moderacionError.message,
            variant: 'destructive',
            duration: 8000,
          });
        } else {
          const errorMessage = errorData.message || handleError(err);
          toast({
            title: '❌ Error al editar experiencia',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      } else {
        const errorMessage = handleError(err);
        toast({
          title: '❌ Error al editar experiencia',
          description: errorMessage,
          variant: 'destructive',
        });
      }
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

      // ✅ ACTUALIZADO: Nueva ruta
      await api.delete(`/api/experiencias/${experienceId}`);

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

  /**
   * ✅ MEJORADO: Incrementar vistas con actualización automática
   */
  const incrementViewCount = useCallback(async (experienceId: string): Promise<{
    success: boolean;
    isNewView?: boolean;
    message?: string;
  }> => {
    try {
      console.log('👀 Incrementando vista para experiencia:', experienceId);
      
      const response = await api.post<{
        success: boolean;
        mensaje: string;
        tipo: 'nueva_vista' | 'vista_duplicada';
      }>(`/api/experiencias/${experienceId}/vista`);
      
      console.log('✅ Respuesta vista:', response.data.tipo);
      
      // ✅ NUEVO: Actualizar el contador en tiempo real si fue una vista nueva
      if (response.data.tipo === 'nueva_vista') {
        setExperiences(prev => prev.map(exp => 
          exp.id === experienceId 
            ? { ...exp, contador_vistas: exp.contador_vistas + 1 }
            : exp
        ));
        
        setMyExperiences(prev => prev.map(exp => 
          exp.id === experienceId 
            ? { ...exp, contador_vistas: exp.contador_vistas + 1 }
            : exp
        ));
      }
      
      return {
        success: true,
        isNewView: response.data.tipo === 'nueva_vista',
        message: response.data.mensaje
      };
    } catch (err: unknown) {
      console.error('❌ Error incrementando vista:', err);
      return {
        success: false,
        message: 'Error al registrar vista'
      };
    }
  }, []);

  /**
   * ✅ NUEVO: Actualizar una experiencia específica (para WebSockets)
   */
  const updateExperience = useCallback((updatedExperience: Experience) => {
    setExperiences(prev => prev.map(exp => 
      exp.id === updatedExperience.id 
        ? { ...updatedExperience, url_foto: buildImageUrl(updatedExperience.url_foto) }
        : exp
    ));
    
    setMyExperiences(prev => prev.map(exp => 
      exp.id === updatedExperience.id 
        ? { ...updatedExperience, url_foto: buildImageUrl(updatedExperience.url_foto) }
        : exp
    ));
  }, []);

  /**
   * ✅ NUEVO: Agregar nueva experiencia (para WebSockets)
   */
  const addNewExperience = useCallback((newExperience: Experience) => {
    const experienceWithImage = {
      ...newExperience,
      url_foto: buildImageUrl(newExperience.url_foto)
    };
    
    setExperiences(prev => [experienceWithImage, ...prev]);
  }, []);

  /**
   * Obtener estadísticas de experiencias (admin) - ACTUALIZADO
   */
  const getExperienceStats = useCallback(async (): Promise<ExperienceStats | null> => {
    try {
      const response = await api.get<{
        success: boolean;
        estadisticas: ExperienceStats['estadisticas'];
        tendencias: ExperienceStats['tendencias'];
        top_vistas: ExperienceStats['top_vistas'];
      }>('/api/experiencias/estadisticas');
      
      return {
        estadisticas: response.data.estadisticas,
        tendencias: response.data.tendencias,
        top_vistas: response.data.top_vistas
      };
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
    loading,
    uploading,
    editing,
    deleting,
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
    getExperienceStats,
    getVistasDetalladas,

    // Actualizaciones en tiempo real
    updateExperience,
    addNewExperience,
    // Paginación y carga automática
    loadMoreExperiences,
    pagination,
    loadingMore,
    startAutoRefresh,
    stopAutoRefresh,
    autoRefresh,
    
    
    
    // Utilidades
    reevaluateExperiences,
    refetch: fetchExperiences,
    resetError: () => setError(null),
    
    // Estados de carga específicos
    isUploading: uploading,
    isEditing: (id: string) => editing === id,
    isDeleting: (id: string) => deleting === id,
  };
};

// ✅ CORREGIDO: Hook complementario para pre-validación en frontend
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

  const preValidateContent = async (descripcion: string, imageFile?: File): Promise<{
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

    // Detección básica de spam en frontend (solo como sugerencia)
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
    preValidateContent
  };
};