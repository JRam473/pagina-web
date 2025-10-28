// frontend/src/hooks/useExperiences.ts - VERSIÓN CORREGIDA
import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

// ✅ INTERFACES UNIFICADAS
export interface Experience {
  id: string;
  url_foto: string;
  descripcion: string;
  nombre_usuario: string;
  creado_en: string;
  lugar_id?: string;
  lugar_nombre?: string;
  lugar_ubicacion?: string;
  contador_vistas: number;
  ancho_imagen?: number;
  alto_imagen?: number;
  tamaño_archivo?: number;
  tipo_archivo?: string;
  hash_navegador?: string;
}

export interface ExperienceStats {
  estadisticas: {
    total_experiencias: number;
    total_vistas: number;
    usuarios_unicos: number;
    total_experiencias_subidas: number;
    promedio_vistas_por_experiencia: number;
    experiencias_con_nombre: number;
    experiencias_anonimas: number;
    porcentaje_con_nombre: number;
  };
  tendencias: Array<{
    fecha: string;
    cantidad: number;
  }>;
  top_vistas: Array<{
    id: string;
    descripcion: string;
    nombre_usuario: string;
    vistas: number;
  }>;
}

// ✅ INTERFACES DE MODERACIÓN UNIFICADAS
interface ValidacionTextoResponse {
  success: boolean;
  esAprobado?: boolean;
  mensaje?: string;
  motivo?: string;
  detalles?: {
    puntuacion: number;
    problemas: string[];
    sugerencias: string[];
    timestamp: string;
  };
}

interface ModeracionError {
  error: 'TEXTO_RECHAZADO' | 'CONTENIDO_RECHAZADO' | 'NOMBRE_USUARIO_RECHAZADO';
  message: string;
  motivo: string;
  tipo?: string;
  detalles: {
    puntuacion?: number;
    problemas?: string[];
    sugerencias?: string[];
    timestamp?: string;
  };
}

export interface ValidacionResultado {
  esAprobado: boolean;
  motivo?: string;
  detalles?: {
    puntuacion?: number;
    problemas?: string[];
    sugerencias?: string[];
    timestamp?: string;
  };
}

// ✅ INTERFACES DE RESPUESTAS DE API
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
  success: boolean;
  mensaje: string;
  experiencia: {
    id: string;
    url_foto: string;
    descripcion: string;
    nombre_usuario: string;
    creado_en: string;
    limite_restante: number;
  };
}

interface EditWithImageResponse {
  success: boolean;
  mensaje: string;
  experiencia: Experience;
}

interface EditNombreUsuarioResponse {
  success: boolean;
  mensaje: string;
  experiencia: Experience;
}

// ✅ INTERFACES PARA ESTADOS Y FILTROS
interface ExperienceFilters {
  pagina?: number;
  limite?: number;
  lugar_id?: string;
  cargarMas?: boolean;
}

interface PaginationState {
  pagina: number;
  totalPaginas: number;
  total: number;
  tieneMas: boolean;
}

interface UploadResult {
  success: boolean;
  necesitaTerminos?: boolean;
  error?: string;
}

interface VistaDetallada {
  ip_usuario: string;
  agente_usuario: string;
  visto_en: string;
  creado_en: string;
}

interface IncrementViewResponse {
  success: boolean;
  mensaje: string;
  tipo: 'nueva_vista' | 'vista_duplicada';
}

// ✅ TIPO PARA ERRORES DE API
interface ApiError {
  response?: {
    status?: number;
    data?: {
      error?: string;
      message?: string;
      motivo?: string;
      detalles?: string | { problemas?: string[] };
    };
  };
  message?: string;
}

// ✅ HOOK PRINCIPAL UNIFICADO CON NOMBRE DE USUARIO
export const useExperiences = () => {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [myExperiences, setMyExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validandoTexto, setValidandoTexto] = useState(false);
  const [validandoNombreUsuario, setValidandoNombreUsuario] = useState(false);
  
  const [pagination, setPagination] = useState<PaginationState>({
    pagina: 1,
    totalPaginas: 1,
    total: 0,
    tieneMas: false
  });
  
  const [loadingMore, setLoadingMore] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const { toast } = useToast();
  const isFetching = useRef(false);

  // ✅ FUNCIONES DE MODERACIÓN UNIFICADAS

  /**
   * Validación de texto silenciosa (sin toasts)
   */
  const validarTextoSilencioso = useCallback(async (texto: string): Promise<ValidacionResultado> => {
    try {
      setValidandoTexto(true);

      if (!texto.trim()) {
        return {
          esAprobado: false,
          motivo: 'Texto requerido'
        };
      }

      const response = await api.post<ValidacionTextoResponse>(
        '/api/experiencias/moderacion/validar-texto', 
        { texto: texto.trim() }
      );

      if (!response.data.success) {
        return {
          esAprobado: false,
          motivo: response.data.mensaje || 'Error en validación'
        };
      }

      return {
        esAprobado: response.data.esAprobado ?? true,
        motivo: response.data.motivo,
        detalles: response.data.detalles
      };

    } catch (err: unknown) {
      const error = err as ApiError;
      
      // Manejar errores específicos de moderación
      if (error.response?.data && 'error' in error.response.data && 
          (error.response.data.error === 'TEXTO_RECHAZADO' || 
           error.response.data.error === 'CONTENIDO_RECHAZADO' ||
           error.response.data.error === 'NOMBRE_USUARIO_RECHAZADO')) {
        const errorData = error.response.data as ModeracionError;
        
        return {
          esAprobado: false,
          motivo: errorData.motivo,
          detalles: errorData.detalles
        };
      }

      // Error genérico
      const errorMessage = error.response?.data?.message || error.message || 'Error validando texto';
      return {
        esAprobado: false,
        motivo: errorMessage
      };
    } finally {
      setValidandoTexto(false);
    }
  }, []);

  /**
   * ✅ NUEVO: Validación específica para nombre de usuario
   */
  const validarNombreUsuario = useCallback(async (nombreUsuario: string): Promise<ValidacionResultado> => {
    try {
      setValidandoNombreUsuario(true);

      // Validaciones frontend básicas
      if (nombreUsuario.trim().length > 50) {
        return {
          esAprobado: false,
          motivo: 'El nombre de usuario no puede exceder los 50 caracteres'
        };
      }

      if (nombreUsuario.trim().length < 2 && nombreUsuario.trim().length > 0) {
        return {
          esAprobado: false,
          motivo: 'El nombre de usuario debe tener al menos 2 caracteres'
        };
      }

      // Si el nombre está vacío, es válido (será "Usuario Anónimo")
      if (!nombreUsuario.trim()) {
        return {
          esAprobado: true
        };
      }

      // Validación de texto con moderación
      const resultadoValidacion = await validarTextoSilencioso(nombreUsuario);
      
      return resultadoValidacion;

    } catch (error) {
      console.error('Error validando nombre de usuario:', error);
      return {
        esAprobado: false,
        motivo: 'Error al validar nombre de usuario'
      };
    } finally {
      setValidandoNombreUsuario(false);
    }
  }, [validarTextoSilencioso]);

  /**
   * Validación de texto con toasts para uso manual
   */
  const validarTexto = useCallback(async (texto: string): Promise<ValidacionResultado> => {
    const resultado = await validarTextoSilencioso(texto);
    
    if (!resultado.esAprobado && resultado.motivo) {
      toast({
        title: '❌ Texto no aprobado',
        description: resultado.motivo,
        variant: 'destructive',
        duration: 8000,
      });
    }

    return resultado;
  }, [toast, validarTextoSilencioso]);

  /**
   * Mostrar toast de rechazo con detalles
   */
  const mostrarToastRechazo = useCallback((resultado: ValidacionResultado, tipo: 'texto' | 'nombre_usuario' = 'texto') => {
    if (!resultado.esAprobado && resultado.motivo) {
      const problemas = resultado.detalles?.problemas;
      const tieneProblemas = problemas && problemas.length > 0;
      
      const title = tipo === 'nombre_usuario' 
        ? '❌ Nombre de usuario no aprobado' 
        : '❌ Contenido no aprobado';
      
      const description = tieneProblemas 
        ? `${resultado.motivo}\n\nProblemas detectados:\n• ${problemas.join('\n• ')}`
        : resultado.motivo;

      toast({
        title,
        description,
        variant: 'destructive',
        duration: 10000,
      });
    }
  }, [toast]);

  /**
   * Obtener motivos de rechazo específicos
   */
  const obtenerMotivosRechazo = useCallback(async (hashNavegador?: string): Promise<any[]> => {
    try {
      const params: Record<string, string> = {};
      if (hashNavegador) {
        params.hash_navegador = hashNavegador;
      }

      const response = await api.get<{ success: boolean; motivos: any[]; total: number }>(
        '/api/experiencias/moderacion/motivos-rechazo', 
        { params }
      );
      
      return response.data.motivos || [];
    } catch (error) {
      console.error('Error obteniendo motivos de rechazo:', error);
      return [];
    }
  }, []);

  // ✅ FUNCIONES DE MANEJO DE ERRORES UNIFICADAS

  const handleError = useCallback((err: unknown): string => {
    const apiError = err as ApiError;
    
    if (apiError?.response?.status === 429) {
      const detalles = apiError.response.data?.detalles;
      return typeof detalles === 'string' ? detalles : 'Límite diario alcanzado';
    }
    
    // Manejar errores de moderación específicos
    if (apiError?.response?.data && 'error' in apiError.response.data && 
        (apiError.response.data.error === 'CONTENIDO_RECHAZADO' || 
         apiError.response.data.error === 'TEXTO_RECHAZADO' ||
         apiError.response.data.error === 'NOMBRE_USUARIO_RECHAZADO')) {
      const moderacionError = apiError.response.data as ModeracionError;
      return moderacionError.motivo || moderacionError.message;
    }
    
    if (apiError?.response?.data?.error) {
      return apiError.response.data.error;
    }
    
    if (apiError?.response?.data?.message) {
      return apiError.response.data.message;
    }
    
    if (apiError?.message) {
      return apiError.message;
    }
    
    return 'Error desconocido al procesar la solicitud';
  }, []);

  // ✅ FUNCIONES DE EXPERIENCIAS ACTUALIZADAS

  const buildImageUrl = useCallback((imagePath: string | null | undefined): string => {
    if (!imagePath) return '/placeholder-experience.jpg';
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    
    return `${backendUrl}${normalizedPath}`;
  }, []);

  const fetchExperiences = useCallback(async (filters?: ExperienceFilters): Promise<{
    experiencias: Experience[];
    total: number;
    pagina: number;
    totalPaginas: number;
    tieneMas: boolean;
  } | void> => {
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
      const limite = filters?.limite || 6;
      
      params.append('pagina', pagina.toString());
      params.append('limite', limite.toString());
      
      if (filters?.lugar_id) {
        params.append('lugar_id', filters.lugar_id);
      }

      const response = await api.get<ExperiencesResponse>(`/api/experiencias?${params}`);
      const experiencesData = response.data.experiencias || [];
      
      const parsedExperiences = experiencesData.map(exp => ({
        ...exp,
        url_foto: buildImageUrl(exp.url_foto)
      }));
      
      if (filters?.cargarMas) {
        setExperiences(prev => [...prev, ...parsedExperiences]);
      } else {
        setExperiences(parsedExperiences);
      }
      
      const newPagination = {
        pagina: response.data.pagina,
        totalPaginas: response.data.totalPaginas,
        total: response.data.total,
        tieneMas: response.data.pagina < response.data.totalPaginas
      };
      
      setPagination(newPagination);
      
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
  }, [toast, buildImageUrl, handleError]);

  const fetchMyExperiences = useCallback(async (): Promise<Experience[]> => {
    try {
      setLoading(true);
      const response = await api.get<MyExperiencesResponse>('/api/experiencias/usuario/mis-experiencias');
      const experiencesData = response.data.experiencias || [];
      
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
  }, [toast, buildImageUrl, handleError]);

  // ✅ SUBIDA ACTUALIZADA CON NOMBRE DE USUARIO
  const uploadExperienceWithValidation = useCallback(async (
    imageFile: File,
    descripcion: string,
    lugarId?: string,
    nombreUsuario?: string
  ): Promise<UploadResult> => {
    try {
      setUploading(true);

      // Verificar términos
      const termsAccepted = localStorage.getItem('experience_terms_accepted') === 'true';
      if (!termsAccepted) {
        return { success: false, necesitaTerminos: true };
      }

      // Validaciones frontend
      if (descripcion.trim().length === 0) {
        toast({
          title: 'Error',
          description: 'La descripción no puede estar vacía',
          variant: 'destructive',
        });
        return { success: false, error: 'La descripción no puede estar vacía' };
      }

      if (descripcion.trim().length > 500) {
        toast({
          title: 'Error',
          description: 'La descripción no puede exceder los 500 caracteres',
          variant: 'destructive',
        });
        return { success: false, error: 'La descripción no puede exceder los 500 caracteres' };
      }

      // ✅ VALIDACIÓN DE NOMBRE DE USUARIO
      if (nombreUsuario && nombreUsuario.trim()) {
        const resultadoValidacionNombre = await validarNombreUsuario(nombreUsuario);
        if (!resultadoValidacionNombre.esAprobado) {
          mostrarToastRechazo(resultadoValidacionNombre, 'nombre_usuario');
          return { success: false, error: resultadoValidacionNombre.motivo };
        }
      }

      // Validación de texto con moderación
      console.log('🔍 Validando texto antes de subir archivo...');
      const resultadoValidacion = await validarTextoSilencioso(descripcion);
      
      if (!resultadoValidacion.esAprobado) {
        console.log('❌ Texto rechazado por moderación:', resultadoValidacion.motivo);
        mostrarToastRechazo(resultadoValidacion);
        return { success: false, error: resultadoValidacion.motivo };
      }

      console.log('✅ Texto aprobado, procediendo con subida de archivo...');

      // Subir archivo
      const formData = new FormData();
      formData.append('imagen', imageFile);
      formData.append('descripcion', descripcion.trim());
      if (lugarId) {
        formData.append('lugar_id', lugarId);
      }
      if (nombreUsuario !== undefined) {
        formData.append('nombre_usuario', nombreUsuario.trim());
      }

      const response = await api.post<UploadResponse>('/api/experiencias', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.mensaje || 'Error al subir experiencia');
      }

      // Éxito
      await fetchMyExperiences();
      await fetchExperiences({ pagina: 1, limite: 6 });

      toast({
        title: '✅ Experiencia publicada',
        description: response.data.mensaje,
        variant: 'default',
      });

      return { success: true };

    } catch (err: unknown) {
      const apiError = err as ApiError;
      
      if (apiError.response?.data && typeof apiError.response.data === 'object') {
        const errorData = apiError.response.data;
        
        if ('error' in errorData && 
            (errorData.error === 'CONTENIDO_RECHAZADO' || 
             errorData.error === 'TEXTO_RECHAZADO' ||
             errorData.error === 'NOMBRE_USUARIO_RECHAZADO')) {
          const moderacionError = errorData as ModeracionError;
          const tipo = errorData.error === 'NOMBRE_USUARIO_RECHAZADO' ? 'nombre_usuario' : 'texto';
          mostrarToastRechazo({
            esAprobado: false,
            motivo: moderacionError.motivo,
            detalles: moderacionError.detalles
          }, tipo);
          return { success: false, error: moderacionError.motivo };
        } else if ('message' in errorData) {
          const errorMessage = errorData.message || handleError(err);
          toast({
            title: '❌ Error al subir experiencia',
            description: errorMessage,
            variant: 'destructive',
          });
          return { success: false, error: errorMessage };
        }
      }
      
      const errorMessage = handleError(err);
      toast({
        title: '❌ Error al subir experiencia',
        description: errorMessage,
        variant: 'destructive',
      });
      return { success: false, error: errorMessage };
    } finally {
      setUploading(false);
    }
  }, [toast, fetchMyExperiences, fetchExperiences, handleError, validarTextoSilencioso, validarNombreUsuario, mostrarToastRechazo]);

  // ✅ MÉTODO DE SUBIDA COMPATIBLE
  const uploadExperience = useCallback(async (
    imageFile: File,
    descripcion: string,
    lugarId?: string,
    nombreUsuario?: string
  ): Promise<boolean> => {
    const result = await uploadExperienceWithValidation(imageFile, descripcion, lugarId, nombreUsuario);
    
    if (result.necesitaTerminos) {
      throw new Error('TERMS_REQUIRED');
    }
    
    return result.success;
  }, [uploadExperienceWithValidation]);

  // ✅ NUEVO: EDITAR NOMBRE DE USUARIO
  const editUserName = useCallback(async (
    experienceId: string,
    nombreUsuario: string
  ): Promise<boolean> => {
    try {
      setEditingUserName(experienceId);

      // Validación frontend
      if (nombreUsuario.trim().length > 50) {
        toast({
          title: 'Error',
          description: 'El nombre de usuario no puede exceder los 50 caracteres',
          variant: 'destructive',
        });
        return false;
      }

      // Validar nombre de usuario
      const resultadoValidacion = await validarNombreUsuario(nombreUsuario);
      if (!resultadoValidacion.esAprobado) {
        mostrarToastRechazo(resultadoValidacion, 'nombre_usuario');
        return false;
      }

      const response = await api.put<EditNombreUsuarioResponse>(
        `/api/experiencias/${experienceId}/nombre-usuario`,
        { nombre_usuario: nombreUsuario.trim() }
      );

      if (!response.data.success) {
        throw new Error(response.data.mensaje || 'Error al actualizar nombre de usuario');
      }

      // Actualizar experiencias
      await fetchMyExperiences();
      await fetchExperiences({ pagina: 1, limite: 6 });

      toast({
        title: '✅ Nombre actualizado',
        description: response.data.mensaje,
        variant: 'default',
      });

      return true;
    } catch (err: unknown) {
      const errorMessage = handleError(err);
      toast({
        title: '❌ Error al actualizar nombre',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setEditingUserName(null);
    }
  }, [toast, fetchMyExperiences, fetchExperiences, handleError, validarNombreUsuario, mostrarToastRechazo]);

  // ✅ CARGAR MÁS EXPERIENCIAS
  const loadMoreExperiences = useCallback(async (): Promise<void> => {
    if (loadingMore || !pagination.tieneMas) return;
    
    const nextPage = pagination.pagina + 1;
    await fetchExperiences({ 
      pagina: nextPage, 
      limite: 6, 
      cargarMas: true 
    });
  }, [loadingMore, pagination, fetchExperiences]);

  // ✅ SISTEMA DE ACTUALIZACIÓN AUTOMÁTICA
  const startAutoRefresh = useCallback(() => {
    setAutoRefresh(true);
  }, []);

  const stopAutoRefresh = useCallback(() => {
    setAutoRefresh(false);
  }, []);

  // ✅ EDITAR EXPERIENCIA CON CAMBIO DE IMAGEN (COMPLETAMENTE REESCRITO)
  const editExperienceWithImage = useCallback(async (
    experienceId: string,
    descripcion: string,
    imageFile?: File | null,
    nombreUsuario?: string
  ): Promise<boolean> => {
    try {
      setEditing(experienceId);

      // Validación frontend mejorada
      if (descripcion.trim().length === 0) {
        toast({
          title: 'Error',
          description: 'La descripción no puede estar vacía',
          variant: 'destructive',
        });
        return false;
      }

      if (descripcion.trim().length > 500) {
        toast({
          title: 'Error',
          description: 'La descripción no puede exceder los 500 caracteres',
          variant: 'destructive',
        });
        return false;
      }

      // ✅ VALIDACIÓN DE NOMBRE DE USUARIO SI SE PROPORCIONA
      if (nombreUsuario !== undefined) {
        const resultadoValidacionNombre = await validarNombreUsuario(nombreUsuario);
        if (!resultadoValidacionNombre.esAprobado) {
          mostrarToastRechazo(resultadoValidacionNombre, 'nombre_usuario');
          return false;
        }
      }

      // Validar texto antes de proceder con la edición
      const resultadoValidacion = await validarTextoSilencioso(descripcion);
      if (!resultadoValidacion.esAprobado) {
        mostrarToastRechazo(resultadoValidacion);
        return false;
      }

      // ✅ CORRECCIÓN PRINCIPAL: Lógica mejorada para decidir qué endpoint usar
      if (imageFile) {
        // ✅ USAR ENDPOINT CON IMAGEN
        console.log('🔄 Editando experiencia CON nueva imagen');
        const formData = new FormData();
        formData.append('descripcion', descripcion.trim());
        formData.append('imagen', imageFile);
        
        if (nombreUsuario !== undefined) {
          formData.append('nombre_usuario', nombreUsuario.trim());
        }

        const response = await api.put<EditWithImageResponse>(
          `/api/experiencias/${experienceId}/con-imagen`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        if (!response.data.success) {
          throw new Error(response.data.mensaje || 'Error al editar experiencia con imagen');
        }

        // Actualizar experiencias
        await fetchMyExperiences();
        await fetchExperiences({ pagina: 1, limite: 6 });

        toast({
          title: '✅ Experiencia actualizada',
          description: response.data.mensaje,
          variant: 'default',
        });

        return true;
      } else {
        // ✅ USAR ENDPOINT SIN IMAGEN (solo texto y nombre)
        console.log('🔄 Editando experiencia SIN nueva imagen');
        
        const updateData: { descripcion: string; nombre_usuario?: string } = {
          descripcion: descripcion.trim()
        };

        if (nombreUsuario !== undefined) {
          updateData.nombre_usuario = nombreUsuario.trim();
        }

        const response = await api.put<EditWithImageResponse>(
          `/api/experiencias/${experienceId}`,
          updateData
        );

        if (!response.data.success) {
          throw new Error(response.data.mensaje || 'Error al editar experiencia');
        }

        // Actualizar experiencias
        await fetchMyExperiences();
        await fetchExperiences({ pagina: 1, limite: 6 });

        toast({
          title: '✅ Experiencia actualizada',
          description: 'Tu experiencia ha sido actualizada exitosamente.',
          variant: 'default',
        });

        return true;
      }
    } catch (err: unknown) {
      // Manejo de errores más robusto
      const apiError = err as ApiError;
      
      if (apiError.response?.data && typeof apiError.response.data === 'object') {
        const errorData = apiError.response.data;
        
        if ('error' in errorData && 
            (errorData.error === 'CONTENIDO_RECHAZADO' || 
             errorData.error === 'NOMBRE_USUARIO_RECHAZADO')) {
          const moderacionError = errorData as ModeracionError;
          const tipo = errorData.error === 'NOMBRE_USUARIO_RECHAZADO' ? 'nombre_usuario' : 'texto';
          mostrarToastRechazo({
            esAprobado: false,
            motivo: moderacionError.motivo,
            detalles: moderacionError.detalles
          }, tipo);
        } else if ('message' in errorData) {
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
  }, [toast, fetchMyExperiences, fetchExperiences, handleError, validarTextoSilencioso, validarNombreUsuario, mostrarToastRechazo]);

  // ✅ OBTENER EXPERIENCIA ESPECÍFICA POR ID
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
  }, [toast, buildImageUrl, handleError]);

  // ✅ EDITAR EXPERIENCIA EXISTENTE (ACTUALIZADO)
  const editExperience = useCallback(async (
    experienceId: string,
    descripcion: string,
    nombreUsuario?: string
  ): Promise<boolean> => {
    try {
      setEditing(experienceId);

      // Validación frontend
      if (descripcion.trim().length === 0) {
        toast({
          title: 'Error',
          description: 'La descripción no puede estar vacía',
          variant: 'destructive',
        });
        return false;
      }

      if (descripcion.trim().length > 500) {
        toast({
          title: 'Error',
          description: 'La descripción no puede exceder los 500 caracteres',
          variant: 'destructive',
        });
        return false;
      }

      // ✅ VALIDACIÓN DE NOMBRE DE USUARIO SI SE PROPORCIONA
      if (nombreUsuario !== undefined) {
        const resultadoValidacionNombre = await validarNombreUsuario(nombreUsuario);
        if (!resultadoValidacionNombre.esAprobado) {
          mostrarToastRechazo(resultadoValidacionNombre, 'nombre_usuario');
          return false;
        }
      }

      // Validar texto antes de proceder con la edición
      const resultadoValidacion = await validarTextoSilencioso(descripcion);
      if (!resultadoValidacion.esAprobado) {
        mostrarToastRechazo(resultadoValidacion);
        return false;
      }

      const updateData: { descripcion: string; nombre_usuario?: string } = {
        descripcion: descripcion.trim()
      };

      if (nombreUsuario !== undefined) {
        updateData.nombre_usuario = nombreUsuario.trim();
      }

      await api.put(`/api/experiencias/${experienceId}`, updateData);

      // Actualizar experiencias
      await fetchMyExperiences();

      toast({
        title: '✅ Experiencia actualizada',
        description: 'Tu experiencia ha sido actualizada exitosamente.',
        variant: 'default',
      });

      return true;
    } catch (err: unknown) {
      // Manejo de errores más robusto
      const apiError = err as ApiError;
      
      if (apiError.response?.data && typeof apiError.response.data === 'object') {
        const errorData = apiError.response.data;
        
        if ('error' in errorData && 
            (errorData.error === 'CONTENIDO_RECHAZADO' || 
             errorData.error === 'NOMBRE_USUARIO_RECHAZADO')) {
          const moderacionError = errorData as ModeracionError;
          const tipo = errorData.error === 'NOMBRE_USUARIO_RECHAZADO' ? 'nombre_usuario' : 'texto';
          mostrarToastRechazo({
            esAprobado: false,
            motivo: moderacionError.motivo,
            detalles: moderacionError.detalles
          }, tipo);
        } else if ('message' in errorData) {
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
  }, [toast, fetchMyExperiences, handleError, validarTextoSilencioso, validarNombreUsuario, mostrarToastRechazo]);

  // ✅ ELIMINAR EXPERIENCIA
  const deleteExperience = useCallback(async (experienceId: string): Promise<boolean> => {
    try {
      setDeleting(experienceId);

      await api.delete(`/api/experiencias/${experienceId}`);

      // Actualizar experiencias
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
  }, [toast, fetchMyExperiences, handleError]);

  // ✅ INCREMENTAR VISTAS
  const incrementViewCount = useCallback(async (experienceId: string): Promise<{
    success: boolean;
    isNewView?: boolean;
    message?: string;
  }> => {
    try {
      console.log('👀 Incrementando vista para experiencia:', experienceId);
      
      const response = await api.post<IncrementViewResponse>(`/api/experiencias/${experienceId}/vista`);
      
      console.log('✅ Respuesta vista:', response.data.tipo);
      
      // Actualizar contadores en tiempo real
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
      const errorMessage = handleError(err);
      return {
        success: false,
        message: errorMessage
      };
    }
  }, [handleError]);

  // ✅ ACTUALIZAR EXPERIENCIA ESPECÍFICA
  const updateExperience = useCallback((updatedExperience: Experience) => {
    const experienceWithImage = {
      ...updatedExperience,
      url_foto: buildImageUrl(updatedExperience.url_foto)
    };
    
    setExperiences(prev => prev.map(exp => 
      exp.id === updatedExperience.id ? experienceWithImage : exp
    ));
    
    setMyExperiences(prev => prev.map(exp => 
      exp.id === updatedExperience.id ? experienceWithImage : exp
    ));
  }, [buildImageUrl]);

  // ✅ AGREGAR NUEVA EXPERIENCIA
  const addNewExperience = useCallback((newExperience: Experience) => {
    const experienceWithImage = {
      ...newExperience,
      url_foto: buildImageUrl(newExperience.url_foto)
    };
    
    setExperiences(prev => [experienceWithImage, ...prev]);
    setMyExperiences(prev => [experienceWithImage, ...prev]);
  }, [buildImageUrl]);

  // ✅ OBTENER ESTADÍSTICAS DE EXPERIENCIAS
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
      const errorMessage = handleError(err);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    }
  }, [toast, handleError]);

  // ✅ OBTENER ESTADÍSTICAS DETALLADAS DE VISTAS
  const getVistasDetalladas = useCallback(async (experienceId: string): Promise<VistaDetallada[]> => {
    try {
      const response = await api.get<{vistas: VistaDetallada[]}>(`/api/experiencias/${experienceId}/vistas-detalladas`);
      return response.data.vistas || [];
    } catch (err: unknown) {
      console.error('Error obteniendo vistas detalladas:', err);
      const errorMessage = handleError(err);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return [];
    }
  }, [toast, handleError]);

  // ✅ REEVALUAR EXPERIENCIAS AUTOMÁTICAMENTE
  const reevaluateExperiences = useCallback(async (): Promise<void> => {
    try {
      await fetchExperiences();
      
      if (myExperiences.length > 0) {
        await fetchMyExperiences();
      }
    } catch (err) {
      console.error('Error en reevaluación automática:', err);
    }
  }, [fetchExperiences, fetchMyExperiences, myExperiences.length]);

  // ✅ EFECTO PARA ACTUALIZACIÓN AUTOMÁTICA
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      try {
        if (!isFetching.current) {
          await fetchExperiences({ pagina: 1, limite: 6 });
          console.log('🔄 Actualización automática de experiencias');
        }
      } catch (error) {
        console.error('Error en actualización automática:', error);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchExperiences]);

  // ✅ RETORNO COMPLETO DEL HOOK
  return {
    // Estado
    experiences,
    myExperiences,
    loading,
    uploading,
    editing,
    deleting,
    editingUserName,
    error,
    pagination,
    loadingMore,
    autoRefresh,
    validandoTexto,
    validandoNombreUsuario,
    
    // Funciones de moderación
    validarTexto,
    validarTextoSilencioso,
    validarTextoRapido: validarTextoSilencioso,
    validarNombreUsuario,
    obtenerMotivosRechazo,
    mostrarToastRechazo,
    
    // Acciones principales de experiencias
    fetchExperiences,
    fetchMyExperiences,
    fetchExperienceById,
    uploadExperience,
    uploadExperienceWithValidation,
    editExperience,
    deleteExperience,
    incrementViewCount,
    editExperienceWithImage,
    editUserName,
    
    // Acciones de administración
    getExperienceStats,
    getVistasDetalladas,

    // Actualizaciones en tiempo real
    updateExperience,
    addNewExperience,
    
    // Paginación y carga automática
    loadMoreExperiences,
    startAutoRefresh,
    stopAutoRefresh,
    
    // Utilidades
    reevaluateExperiences,
    refetch: fetchExperiences,
    resetError: () => setError(null),
    
    // Estados de carga específicos
    isUploading: uploading,
    isEditing: (id: string) => editing === id,
    isDeleting: (id: string) => deleting === id,
    isEditingUserName: (id: string) => editingUserName === id,
  };
};

// ✅ HOOK COMPLEMENTARIO PARA PRE-VALIDACIÓN ACTUALIZADO
export const useExperienceValidation = () => {
  const { toast } = useToast();

  const validateDescription = useCallback((descripcion: string): { isValid: boolean; message?: string } => {
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
  }, []);

  const validateImage = useCallback((file: File): { isValid: boolean; message?: string } => {
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
  }, []);

  const validateUserName = useCallback((nombreUsuario: string): { isValid: boolean; message?: string } => {
    if (nombreUsuario.trim().length > 50) {
      return { isValid: false, message: 'El nombre de usuario no puede exceder los 50 caracteres' };
    }

    if (nombreUsuario.trim().length < 2 && nombreUsuario.trim().length > 0) {
      return { isValid: false, message: 'El nombre de usuario debe tener al menos 2 caracteres' };
    }

    // Validar caracteres permitidos (opcional)
    const caracteresPermitidos = /^[a-zA-ZÀ-ÿ0-9\s\-_.]*$/;
    if (!caracteresPermitidos.test(nombreUsuario)) {
      return { isValid: false, message: 'El nombre de usuario contiene caracteres no permitidos' };
    }

    return { isValid: true };
  }, []);

  const preValidateContent = useCallback(async (
    descripcion: string, 
    imageFile?: File, 
    nombreUsuario?: string
  ): Promise<{
    isValid: boolean;
    warnings: string[];
  }> => {
    const warnings: string[] = [];
    
    // Validar descripción
    const descValidation = validateDescription(descripcion);
    if (!descValidation.isValid) {
      toast({
        title: 'Error de validación',
        description: descValidation.message,
        variant: 'destructive',
      });
      return { isValid: false, warnings: [descValidation.message!] };
    }

    // Validar imagen si se proporciona
    if (imageFile) {
      const imageValidation = validateImage(imageFile);
      if (!imageValidation.isValid) {
        toast({
          title: 'Error de imagen',
          description: imageValidation.message,
          variant: 'destructive',
        });
        return { isValid: false, warnings: [imageValidation.message!] };
      }
    }

    // ✅ VALIDAR NOMBRE DE USUARIO SI SE PROPORCIONA
    if (nombreUsuario && nombreUsuario.trim()) {
      const userNameValidation = validateUserName(nombreUsuario);
      if (!userNameValidation.isValid) {
        toast({
          title: 'Error de nombre de usuario',
          description: userNameValidation.message,
          variant: 'destructive',
        });
        return { isValid: false, warnings: [userNameValidation.message!] };
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
  }, [toast, validateDescription, validateImage, validateUserName]);

  return {
    validateDescription,
    validateImage,
    validateUserName,
    preValidateContent
  };
};