// hooks/useAdminPlaces.ts - VERSIÓN COMPLETAMENTE CORREGIDA
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';
import { useModeracionDescripciones, type ResultadoAnalisisDescripcion } from './useModeracionDescripciones';

export interface Place {
  id: string;
  name: string;
  description: string;
  location: string;
  category: string;
  image_url: string;
  pdf_url: string;
  average_rating: number;
  total_ratings: number;
  total_experiences: number;
  created_at: string;
  updated_at: string;
  gallery_images?: GalleryImage[];
}

// Interface para imágenes de la galería
export interface GalleryImage {
  id: string;
  url_foto: string;
  descripcion: string;
  es_principal: boolean;
  orden: number;
  creado_en: string;
  ancho_imagen?: number;
  alto_imagen?: number;
  tamaño_archivo?: number;
  tipo_archivo?: string;
}

// Interface para la API (nombres en español)
interface ApiPlace {
  id: string;
  nombre: string;
  descripcion: string;
  ubicacion: string;
  categoria: string;
  foto_principal_url: string;
  pdf_url: string;
  puntuacion_promedio: number;
  total_calificaciones: number;
  total_experiencias: number;
  creado_en: string;
  actualizado_en: string;
}

interface PlaceFormData {
  name: string;
  description: string;
  location: string;
  category: string;
  image_url?: string;
  pdf_url?: string;
}

// ✅ INTERFACE CORREGIDA PARA ERRORES DE MODERACIÓN
interface ApiError {
  response?: {
    data?: {
      error?: string;
      message?: string;
      motivo?: string;
      tipo?: string;
      detalles?: {
        puntuacion?: number;
        problemas?: string[];
        sugerencias?: string[];
        campoEspecifico?: 'nombre' | 'descripcion' | 'descripcion_foto' | 'imagen' | 'ambos';
        timestamp?: string;
        analisisCompleto?: Record<string, unknown>;
      };
    };
  };
  message?: string;
}

// ✅ INTERFACE CORREGIDA PARA ERRORES DE MODERACIÓN
export interface ModeracionError {
  message: string;
  motivo?: string;
  tipo?: string;
  detalles?: {
    puntuacion?: number;
    problemas?: string[];
    sugerencias?: string[];
    campoEspecifico?: 'nombre' | 'descripcion' | 'descripcion_foto' | 'imagen' | 'ambos';
    timestamp?: string;
  };
}

// ✅ INTERFACE PARA ESTADO DE CAMBIOS
interface EstadoCambios {
  nombreModificado: boolean;
  descripcionModificada: boolean;
  ubicacionModificada: boolean;
  categoriaModificada: boolean;
  camposModificados: string[];
  requiereModeracion: boolean;
}

// ✅ INTERFACE CORREGIDA PARA VALIDACIÓN DE CAMBIOS
interface ValidacionCambios {
  success: boolean;
  esAprobado: boolean;
  mensaje: string;
  motivo?: string;
  cambios: {
    nombre: { modificado: boolean; actual?: string; nuevo?: string };
    descripcion: { modificado: boolean; actual?: string; nuevo?: string };
    ubicacion: { modificado: boolean; actual?: string; nuevo?: string };
    categoria: { modificado: boolean; actual?: string; nuevo?: string };
  };
  moderacion?: {
    aplicada: boolean;
    campos_moderados: string[];
    puntuacion?: number;
    resultado: 'aprobado' | 'rechazado' | 'no_requerido';
  };
  detalles?: {
    problemas?: string[];
    sugerencias?: string[];
    puntuacion?: number;
  };
}

// ✅ INTERFACE CORREGIDA PARA MOTIVOS DE RECHAZO
interface MotivoRechazo {
  motivo: string;
  accion: string;
  tipo_contenido: string;
  creado_en: string;
  resultado_moderacion: string;
}

interface MotivosRechazoResponse {
  success: boolean;
  motivos: MotivoRechazo[];
  total: number;
  tipo_contenido: string;
}

export const useAdminPlaces = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | ModeracionError | null>(null);
  const { toast } = useToast();

// ✅ CORREGIDO: Manejar errores con mejor logging y estructura
const handleError = (err: unknown): string | ModeracionError => {
  console.log('🔍 [ERROR HANDLER] Analizando error:', err);
  
  const error = err as ApiError;
  
  // ✅ MEJORADO: Verificar si hay datos de respuesta con estructura de moderación
  if (error?.response?.data) {
    const errorData = error.response.data;
    console.log('📦 [ERROR HANDLER] Datos de error del servidor:', errorData);
    
    // Si es error de moderación con detalles específicos
    if (errorData.error && 
        (errorData.error === 'CONTENIDO_RECHAZADO' || 
         errorData.error === 'IMAGEN_RECHAZADA' ||
         errorData.error === 'DESCRIPCION_RECHAZADA' ||
         errorData.error === 'TEXTO_RECHAZADO' ||
         errorData.error === 'VALIDACION_RECHAZADA' ||
         errorData.error === 'PDF_RECHAZADO' || // ✅ AGREGADO
         errorData.error === 'PDF_INVALIDO')) { // ✅ AGREGADO
      
      console.log('🎯 [ERROR HANDLER] Es error de moderación estructurado:', errorData);
      
      return {
        message: errorData.message || 'Contenido rechazado por moderación',
        motivo: errorData.motivo,
        tipo: errorData.tipo,
        detalles: errorData.detalles
      };
    }
    
    // ✅ NUEVO: Si no tiene la estructura esperada pero tiene mensaje/motivo
    if (errorData.motivo || errorData.message) {
      console.log('🎯 [ERROR HANDLER] Error con estructura alternativa:', errorData);
      
      return {
        message: errorData.message || errorData.error || 'Error de moderación',
        motivo: errorData.motivo,
        tipo: errorData.tipo || 'general',
        detalles: errorData.detalles || {
          problemas: [errorData.motivo || errorData.message],
          sugerencias: ['Revisa el contenido antes de intentar nuevamente']
        }
      };
    }
    
    // Si es error de axios con response pero sin estructura de moderación
    return errorData.error || errorData.message || 'Error del servidor';
  }
  
  // Si es error nativo
  return error?.message || 'Error desconocido';
};

// ✅ MEJORADO: Mostrar toast de rechazo con manejo de casos edge
const mostrarToastRechazo = useCallback((resultado: ModeracionError | string) => {
  console.log('🎯 [TOAST] Mostrando toast de rechazo:', resultado);
  
  // ✅ NUEVO: Manejar caso donde resultado es un string
  if (typeof resultado === 'string') {
    toast({
      title: '🚫 Error',
      description: resultado,
      variant: 'destructive',
      duration: 8000,
    });
    return;
  }
  
  let title = '🚫 Contenido no aprobado';
  let description = resultado.motivo || resultado.message;
  
  // ✅ ESPECÍFICO PARA PDFs - MEJORADO
  if (resultado.tipo === 'pdf_texto' || resultado.tipo === 'pdf') {
    title = '🚫 PDF rechazado';
    description = resultado.motivo || 'El contenido del PDF no cumple con las políticas';
  }
  
  // ✅ MEJORADO: Construir descripción detallada
  if (resultado.detalles?.problemas && resultado.detalles.problemas.length > 0) {
    description += `\n\nProblemas detectados:\n• ${resultado.detalles.problemas.join('\n• ')}`;
  }
  
  if (resultado.detalles?.sugerencias && resultado.detalles.sugerencias.length > 0) {
    description += `\n\nSugerencias:\n• ${resultado.detalles.sugerencias.join('\n• ')}`;
  }
  
  // Agregar puntuación si está disponible
  if (resultado.detalles?.puntuacion) {
    description += `\n\nNivel de riesgo: ${(resultado.detalles.puntuacion * 100).toFixed(1)}%`;
  }

  // ✅ NUEVO: Si no hay detalles, usar el mensaje básico
  if (!description || description === resultado.message) {
    description = resultado.message || 'El contenido no cumple con las políticas de moderación';
  }

  toast({
    title,
    description,
    variant: 'destructive',
    duration: 10000,
  });
}, [toast]);

  const { 
    validarDescripcionFoto, 
    analizarDescripcionFoto 
  } = useModeracionDescripciones();

  // Función para mapear datos de la API al formato del frontend
  const mapApiPlaceToPlace = (apiPlace: ApiPlace): Place => ({
    id: apiPlace.id,
    name: apiPlace.nombre,
    description: apiPlace.descripcion,
    location: apiPlace.ubicacion,
    category: apiPlace.categoria,
    image_url: apiPlace.foto_principal_url || '',
    pdf_url: apiPlace.pdf_url || '',
    average_rating: apiPlace.puntuacion_promedio ? Number(apiPlace.puntuacion_promedio) : 0,
    total_ratings: apiPlace.total_calificaciones ? Number(apiPlace.total_calificaciones) : 0,
    total_experiences: apiPlace.total_experiencias ? Number(apiPlace.total_experiencias) : 0,
    created_at: apiPlace.creado_en,
    updated_at: apiPlace.actualizado_en,
    gallery_images: []
  });

  // Función para mapear datos del frontend a la API
  const mapPlaceToApiData = (placeData: PlaceFormData | Partial<PlaceFormData>) => ({
    nombre: placeData.name,
    descripcion: placeData.description,
    ubicacion: placeData.location,
    categoria: placeData.category,
    foto_principal_url: placeData.image_url,
    pdf_url: placeData.pdf_url
  });

  // ✅ CORREGIDO: Analizar cambios entre datos actuales y nuevos
  const analizarCambios = useCallback((
    lugarActual: Place, 
    nuevosDatos: Partial<PlaceFormData>
  ): EstadoCambios => {
    const cambios: EstadoCambios = {
      nombreModificado: nuevosDatos.name !== undefined && nuevosDatos.name !== lugarActual.name,
      descripcionModificada: nuevosDatos.description !== undefined && nuevosDatos.description !== lugarActual.description,
      ubicacionModificada: nuevosDatos.location !== undefined && nuevosDatos.location !== lugarActual.location,
      categoriaModificada: nuevosDatos.category !== undefined && nuevosDatos.category !== lugarActual.category,
      camposModificados: [],
      requiereModeracion: false
    };

    // Identificar campos modificados
    if (cambios.nombreModificado) cambios.camposModificados.push('nombre');
    if (cambios.descripcionModificada) cambios.camposModificados.push('descripcion');
    if (cambios.ubicacionModificada) cambios.camposModificados.push('ubicacion');
    if (cambios.categoriaModificada) cambios.camposModificados.push('categoria');

    // Determinar si requiere moderación
    cambios.requiereModeracion = cambios.nombreModificado || cambios.descripcionModificada;

    return cambios;
  }, []);

  // ✅ CORREGIDO: Validar cambios previos antes de actualizar
  const validarCambiosLugar = useCallback(async (
    placeId: string, 
    nuevosDatos: Partial<PlaceFormData>
  ): Promise<ValidacionCambios> => {
    try {
      console.log('🔍 Validando cambios previos para lugar:', placeId);

      // Mapear datos al formato de la API
      const apiData = mapPlaceToApiData(nuevosDatos);

      const response = await api.post<ValidacionCambios>(
        `/api/lugares/${placeId}/validar-cambios`,
        apiData
      );

      console.log('✅ Validación de cambios:', response.data);

      return response.data;

    } catch (err: unknown) {
      const errorResult = handleError(err);
      console.error('❌ Error validando cambios:', errorResult);
      
      // Si es error de moderación, devolver estructura específica
      if (typeof errorResult === 'object' && 'detalles' in errorResult) {
        return {
          success: false,
          esAprobado: false,
          mensaje: errorResult.message,
          motivo: errorResult.motivo || 'Error de validación',
          cambios: {
            nombre: { modificado: false },
            descripcion: { modificado: false },
            ubicacion: { modificado: false },
            categoria: { modificado: false }
          },
          moderacion: {
            aplicada: true,
            campos_moderados: ['nombre', 'descripcion'],
            resultado: 'rechazado'
          },
          detalles: {
            problemas: errorResult.detalles?.problemas || ['Contenido no aprobado'],
            sugerencias: errorResult.detalles?.sugerencias || [
              'Revisa el contenido antes de publicarlo',
              'Asegúrate de que cumpla con las políticas de la comunidad'
            ]
          }
        };
      }

      const errorMessage = typeof errorResult === 'string' ? errorResult : errorResult.message;
      throw new Error(errorMessage);
    }
  }, []);

  // ✅ CORREGIDO: Obtener motivos de rechazo específicos
  const obtenerMotivosRechazo = useCallback(async (hashNavegador?: string): Promise<MotivoRechazo[]> => {
    try {
      const params: Record<string, string> = {};
      if (hashNavegador) {
        params.hash_navegador = hashNavegador;
      }

      const response = await api.get<MotivosRechazoResponse>(
        '/api/lugares/moderacion/motivos-rechazo', 
        { params }
      );
      
      return response.data.motivos || [];
    } catch (error) {
      console.error('Error obteniendo motivos de rechazo:', error);
      return [];
    }
  }, []);

  /**
   * Obtener todos los lugares
   */
  const fetchPlaces = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<{ lugares: ApiPlace[] }>('/api/lugares');
      const placesData = response.data.lugares || [];
      
      const parsedPlaces = placesData.map(mapApiPlaceToPlace);
      setPlaces(parsedPlaces);
      
      return parsedPlaces;
    } catch (err: unknown) {
      const errorMessage = handleError(err);
      setError(typeof errorMessage === 'string' ? errorMessage : errorMessage.message);
      throw new Error(typeof errorMessage === 'string' ? errorMessage : errorMessage.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crear un nuevo lugar - ACTUALIZADA CON MANEJO MEJORADO DE ERRORES
   */
  const createPlace = useCallback(async (placeData: PlaceFormData, imageFile?: File) => {
    try {
      setLoading(true);
      setError(null);

      // Validar datos requeridos
      if (!placeData.name?.trim()) {
        throw new Error('El nombre del lugar es requerido');
      }
      
      if (!placeData.description?.trim()) {
        throw new Error('La descripción del lugar es requerida');
      }

      if (!placeData.location?.trim()) {
        throw new Error('La ubicación del lugar es requerida');
      }

      if (!placeData.category?.trim()) {
        throw new Error('La categoría del lugar es requerida');
      }

      // Preparar FormData si hay imagen
      let apiData;
      if (imageFile) {
        apiData = new FormData();
        apiData.append('nombre', placeData.name);
        apiData.append('descripcion', placeData.description);
        apiData.append('ubicacion', placeData.location);
        apiData.append('categoria', placeData.category);
        apiData.append('imagen', imageFile);
        
        if (placeData.image_url) {
          apiData.append('foto_principal_url', placeData.image_url);
        }
        if (placeData.pdf_url) {
          apiData.append('pdf_url', placeData.pdf_url);
        }
      } else {
        // Solo datos básicos
        apiData = mapPlaceToApiData(placeData);
      }

      const config = imageFile ? {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
      } : {};
      
      const response = await api.post<{ 
        mensaje: string; 
        lugar: ApiPlace;
        moderacion?: {
          texto: { esAprobado: boolean; puntuacion?: number };
          imagen?: { esAprobado: boolean; puntuacion?: number };
        };
      }>('/api/lugares', apiData, config);
      
      if (!response.data.lugar) {
        throw new Error('No se recibió el lugar creado del servidor');
      }
      
      const newPlace = mapApiPlaceToPlace(response.data.lugar);
      
      // Actualizar la lista de lugares
      setPlaces(prevPlaces => [...prevPlaces, newPlace]);
      
      toast({
        title: '✅ Lugar creado',
        description: 'El lugar se ha creado exitosamente',
      });
      
      return newPlace;
    } catch (err: unknown) {
      const errorResult = handleError(err);
      
      console.log('❌ [CREATE PLACE] Error capturado:', errorResult);
      
      // ✅ CORREGIDO: Manejar correctamente el objeto de error
      if (typeof errorResult === 'object' && 'detalles' in errorResult) {
        setError(errorResult);
        mostrarToastRechazo(errorResult); // ← Usar la función mejorada
      } else {
        const errorMessage = typeof errorResult === 'string' ? errorResult : errorResult.message;
        setError(errorMessage);
        
        toast({
          title: '❌ Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      
      throw errorResult;
    } finally {
      setLoading(false);
    }
  }, [toast, mostrarToastRechazo]);

  /**
   * ✅ CORREGIDO: Actualizar lugar con manejo de errores mejorado
   */
  const updatePlace = useCallback(async (
    placeId: string, 
    placeData: Partial<PlaceFormData>,
    opciones: { 
      validarPreviamente?: boolean;
      skipValidacion?: boolean;
    } = {}
  ) => {
    try {
      console.log('🎯 [UPDATE PLACE] Iniciando actualización:', {
        placeId,
        placeData,
        opciones
      });

      setLoading(true);
      setError(null);

      const { validarPreviamente = true, skipValidacion = false } = opciones;

      // ✅ 1. BUSCAR LUGAR ACTUAL PARA ANÁLISIS
      const lugarActual = places.find(p => p.id === placeId);
      if (!lugarActual) {
        throw new Error('Lugar no encontrado en el estado local');
      }

      // ✅ 2. ANALIZAR CAMBIOS
      const analisisCambios = analizarCambios(lugarActual, placeData);

      // ✅ 3. VALIDACIÓN PREVIA OPCIONAL
      if (validarPreviamente && !skipValidacion && analisisCambios.requiereModeracion) {
        console.log('🔍 Ejecutando validación previa...');
        
        const validacion = await validarCambiosLugar(placeId, placeData);
        
        if (!validacion.esAprobado) {
          // Crear error de moderación
          const errorModeracion: ModeracionError = {
            message: validacion.mensaje,
            motivo: validacion.motivo || 'El contenido no cumple con las políticas de moderación',
            detalles: {
              problemas: validacion.detalles?.problemas || ['Contenido no aprobado'],
              sugerencias: validacion.detalles?.sugerencias || [
                'Revisa el contenido antes de publicarlo',
                'Asegúrate de que cumpla con las políticas de la comunidad'
              ],
              campoEspecifico: analisisCambios.nombreModificado && analisisCambios.descripcionModificada 
                ? 'ambos' 
                : analisisCambios.nombreModificado 
                  ? 'nombre' 
                  : 'descripcion'
            }
          };
          
          // ✅ USAR EL NUEVO MÉTODO PARA MOSTRAR TOAST
          mostrarToastRechazo(errorModeracion);
          
          throw errorModeracion;
        }
        
        console.log('✅ Validación previa aprobada');
      }

      // ✅ 4. EJECUTAR ACTUALIZACIÓN
      const apiData = mapPlaceToApiData(placeData);

      const response = await api.put<{ 
        mensaje: string; 
        lugar: ApiPlace;
        cambios: {
          total: number;
          campos: string[];
          detalles: {
            nombre: boolean;
            descripcion: boolean;
            ubicacion: boolean;
            categoria: boolean;
            imagen: boolean;
            pdf: boolean;
          };
        };
      }>(`/api/lugares/${placeId}`, apiData);
      
      if (!response.data.lugar) {
        throw new Error('No se recibió el lugar actualizado del servidor');
      }
      
      const updatedPlace = mapApiPlaceToPlace(response.data.lugar);
      
      // ✅ 5. ACTUALIZAR ESTADO LOCAL
      setPlaces(prevPlaces => 
        prevPlaces.map(place => 
          place.id === placeId ? updatedPlace : place
        )
      );

      // ✅ 6. MOSTRAR MENSAJE CONTEXTUAL
      const mensajeExito = analisisCambios.camposModificados.length === 0 
        ? 'Lugar actualizado (sin cambios detectados)' 
        : `Lugar actualizado (${analisisCambios.camposModificados.join(', ')})`;

      toast({
        title: '✅ Lugar actualizado',
        description: mensajeExito,
      });

      return {
        lugar: updatedPlace,
        cambios: analisisCambios,
        respuesta: response.data
      };

    } catch (err: unknown) {
      console.error('❌ [UPDATE PLACE] Error completo:', err);
      const errorResult = handleError(err);
      console.log('🔍 [UPDATE PLACE] Error procesado:', errorResult);
      
      // ✅ CORREGIDO: Manejar diferentes tipos de error como experiencias
      if (typeof errorResult === 'object' && 'detalles' in errorResult) {
        // Ya se mostró el toast en validación previa, no mostrar otro
        if (!opciones.validarPreviamente) {
          mostrarToastRechazo(errorResult);
        }
      } else {
        const errorMessage = typeof errorResult === 'string' ? errorResult : errorResult.message;
        toast({
          title: '❌ Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      
      throw errorResult;
    } finally {
      setLoading(false);
    }
  }, [places, analizarCambios, validarCambiosLugar, toast, mostrarToastRechazo]);

  /**
   * ✅ NUEVO: Actualización rápida sin validación (para campos no críticos)
   */
  const updatePlaceFast = useCallback(async (
    placeId: string, 
    placeData: Partial<PlaceFormData>
  ) => {
    return updatePlace(placeId, placeData, { 
      validarPreviamente: false,
      skipValidacion: true 
    });
  }, [updatePlace]);

  /**
   * ✅ NUEVO: Actualizar solo ubicación y categoría (sin moderación)
   */
  const updatePlaceMetadata = useCallback(async (
    placeId: string,
    updates: { location?: string; category?: string }
  ) => {
    // Filtrar solo ubicación y categoría
    const datosFiltrados: Partial<PlaceFormData> = {};
    if (updates.location !== undefined) datosFiltrados.location = updates.location;
    if (updates.category !== undefined) datosFiltrados.category = updates.category;

    return updatePlace(placeId, datosFiltrados, {
      validarPreviamente: false,
      skipValidacion: true
    });
  }, [updatePlace]);

  /**
   * ✅ NUEVO: Actualizar solo texto (con validación completa)
   */
  const updatePlaceText = useCallback(async (
    placeId: string,
    updates: { name?: string; description?: string }
  ) => {
    const datosFiltrados: Partial<PlaceFormData> = {};
    if (updates.name !== undefined) datosFiltrados.name = updates.name;
    if (updates.description !== undefined) datosFiltrados.description = updates.description;

    return updatePlace(placeId, datosFiltrados, {
      validarPreviamente: true,
      skipValidacion: false
    });
  }, [updatePlace]);

  /**
   * Eliminar un lugar
   */
  const deletePlace = useCallback(async (placeId: string) => {
    try {
      setLoading(true);
      setError(null);

      await api.delete<{ mensaje: string }>(`/api/lugares/${placeId}`);
      
      // Actualizar la lista de lugares
      setPlaces(prevPlaces => prevPlaces.filter(place => place.id !== placeId));
      
      toast({
        title: '✅ Lugar eliminado',
        description: 'El lugar se ha eliminado exitosamente',
      });
      
      return true;
    } catch (err: unknown) {
      const errorMessage = handleError(err);
      setError(typeof errorMessage === 'string' ? errorMessage : errorMessage.message);
      
      toast({
        title: '❌ Error',
        description: typeof errorMessage === 'string' ? errorMessage : errorMessage.message,
        variant: 'destructive',
      });
      
      throw new Error(typeof errorMessage === 'string' ? errorMessage : errorMessage.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Subir imagen de un lugar - MEJORADO CON MANEJO DE ERRORES
   */

const uploadPlaceImage = useCallback(async (placeId: string, imageFile: File) => {
  try {
    console.log('🖼️ [UPLOAD] Subiendo imagen para lugar:', placeId);
    
    const formData = new FormData();
    formData.append('imagen', imageFile);

    const response = await api.post<{ 
      mensaje: string;
      url_imagen: string;
      es_principal: boolean;
      imagen_id: string;
      moderacion?: {
        esAprobado: boolean;
        puntuacionRiesgo?: number;
        timestamp: string;
      };
      archivo: {
        nombre: string;
        tamaño: number;
        tipo: string;
      };
    }>(`/api/lugares/${placeId}/imagen`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
    });

    console.log('✅ [UPLOAD] Imagen subida y aprobada correctamente');

    // Actualizar el estado local
    setPlaces(prevPlaces => 
      prevPlaces.map(place => 
        place.id === placeId 
          ? { 
              ...place, 
              image_url: response.data.url_imagen,
              gallery_images: [
                ...(place.gallery_images || []),
                {
                  id: response.data.imagen_id,
                  url_foto: response.data.url_imagen,
                  descripcion: 'Imagen principal del lugar',
                  es_principal: true,
                  orden: 1,
                  creado_en: new Date().toISOString()
                }
              ]
            }
          : place
      )
    );

    // ✅ MOVER el toast de éxito aquí dentro del try
    toast({
      title: '✅ Imagen aprobada',
      description: 'La imagen ha sido subida y aprobada por moderación',
    });

    return response.data;

  } catch (err: unknown) {
    const errorResult = handleError(err);
    console.error('❌ [UPLOAD] Error subiendo imagen:', errorResult);
    
    // ✅ MEJORADO: Usar función centralizada para errores de moderación
    if (typeof errorResult === 'object' && 'detalles' in errorResult) {
      mostrarToastRechazo(errorResult);
    } else {
      const errorMessage = typeof errorResult === 'string' ? errorResult : errorResult.message;
      toast({
        title: '❌ Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
    
    // ✅ IMPORTANTE: Rechazar la promesa para que el componente sepa que falló
    throw errorResult;
  }
}, [toast, mostrarToastRechazo]);


// En tu hook useAdminPlaces - mejorar la función uploadPlacePDFConModeracion

const uploadPlacePDFConModeracion = useCallback(async (placeId: string, pdfFile: File) => {
  try {
    console.log('📄 [UPLOAD] Subiendo PDF con moderación para lugar:', placeId);
    
    const formData = new FormData();
    formData.append('pdf', pdfFile);

    const response = await api.post<{ 
      success: boolean;
      mensaje: string;
      url_pdf: string;
      moderacion?: {
        esAprobado: boolean;
        puntuacion?: number;
        metadata?: Record<string, unknown>;
      };
      archivo: {
        nombre: string;
        tamaño: number;
        tipo: string;
      };
    }>(`/api/lugares/${placeId}/pdf-con-moderacion`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 45000,
    });

    console.log('✅ [UPLOAD] PDF procesado con moderación:', response.data);

    // ✅ VERIFICAR SI FUE RECHAZADO
    if (response.data.moderacion && !response.data.moderacion.esAprobado) {
      const errorModeracion: ModeracionError = {
        message: 'El contenido del PDF no cumple con las políticas de moderación',
        motivo: 'Contenido inapropiado detectado en el PDF',
        tipo: 'pdf_texto',
        detalles: {
          puntuacion: response.data.moderacion.puntuacion,
          problemas: ['El PDF contiene texto que no cumple con las políticas'],
          sugerencias: [
            'Revisa que el PDF no contenga lenguaje ofensivo o inapropiado',
            'Asegúrate de que el contenido sea apropiado para todos los públicos',
            'Evita contenido promocional, spam o enlaces no permitidos'
          ],
          campoEspecifico: 'descripcion' as const
        }
      };
      
      mostrarToastRechazo(errorModeracion);
      throw errorModeracion;
    }

    // ✅ SI ES APROBADO: Actualizar estado local
    setPlaces(prevPlaces => 
      prevPlaces.map(place => 
        place.id === placeId 
          ? { ...place, pdf_url: response.data.url_pdf }
          : place
      )
    );

    // ✅ MOSTRAR TOAST DE ÉXITO
    toast({
      title: '✅ PDF aprobado',
      description: 'El PDF ha sido subido y aprobado por moderación',
    });

    return response.data;

  } catch (err: any) {
    console.error('❌ [UPLOAD] Error subiendo PDF con moderación:', err);
    
    // ✅ MEJORADO: Capturar errores de respuesta del servidor
    if (err.response?.data) {
      const errorData = err.response.data;
      console.log('📦 [PDF UPLOAD ERROR] Datos del error:', errorData);
      
      // ✅ CONSTRUIR ERROR DE MODERACIÓN CON DETALLES
      const errorModeracion: ModeracionError = {
        message: errorData.message || 'El contenido del PDF no cumple con las políticas',
        motivo: errorData.motivo || errorData.error,
        tipo: errorData.tipo || 'pdf_texto',
        detalles: errorData.detalles || {
          problemas: [errorData.motivo || 'Contenido inapropiado detectado'],
          sugerencias: [
            'Revisa que el PDF no contenga lenguaje ofensivo o inapropiado',
            'Asegúrate de que el contenido sea apropiado para todos los públicos',
            'Evita contenido promocional, spam o enlaces no permitidos'
          ],
          puntuacion: errorData.detalles?.puntuacion
        }
      };
      
      console.log('🎯 [PDF REJECTED] Mostrando toast específico para PDF con detalles');
      mostrarToastRechazo(errorModeracion);
      throw errorModeracion;
    }
    
    // ✅ PARA ERRORES GENÉRICOS
    const errorResult = handleError(err);
    
    if (typeof errorResult === 'object' && 'detalles' in errorResult) {
      console.log('🎯 [PDF REJECTED] Error de moderación capturado');
      mostrarToastRechazo(errorResult);
    } else {
      // Para errores genéricos
      const errorMessage = typeof errorResult === 'string' ? errorResult : errorResult.message;
      console.log('⚠️ [UPLOAD] Error genérico:', errorMessage);
      toast({
        title: '❌ Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
    
    throw errorResult;
  }
}, [toast, mostrarToastRechazo]);

  /**
   * Subir múltiples imágenes a la galería de un lugar - CORREGIDA
   */
  const uploadMultipleImages = useCallback(async (placeId: string, imageFiles: File[]) => {
    try {
      console.log('🔄 [uploadMultipleImages] Subiendo imágenes a galería:', {
        placeId,
        cantidad: imageFiles.length
      });

      const formData = new FormData();
      imageFiles.forEach((file: File) => {
        formData.append('imagenes', file);
      });

      const response = await api.post<{ 
        mensaje: string;
        imagenes: Array<{ 
          id: string; 
          url: string; 
          es_principal: boolean;
          orden: number;
          nombre: string;
        }>;
        estadisticas?: {
          total_enviadas: number;
          total_aprobadas: number;
          total_rechazadas: number;
        };
        nota?: string;
      }>(`/api/lugares/${placeId}/imagenes`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      console.log('✅ [uploadMultipleImages] Imágenes procesadas:', response.data);

      // Mostrar estadísticas si están disponibles
      const mensaje = response.data.estadisticas 
        ? `${response.data.estadisticas.total_aprobadas} de ${response.data.estadisticas.total_enviadas} imágenes aprobadas`
        : `${imageFiles.length} imágenes procesadas`;

      toast({
        title: response.data.estadisticas?.total_rechazadas ? '⚠️ Algunas imágenes rechazadas' : '✅ Galería actualizada',
        description: mensaje,
        variant: response.data.estadisticas?.total_rechazadas ? 'destructive' : 'default',
      });

      return response.data;
    } catch (err: unknown) {
      const errorResult = handleError(err);
      console.error('❌ [uploadMultipleImages] Error:', errorResult);
      
      if (typeof errorResult === 'object' && 'detalles' in errorResult) {
        mostrarToastRechazo(errorResult);
      } else {
        const errorMessage = typeof errorResult === 'string' ? errorResult : errorResult.message;
        toast({
          title: '❌ Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      
      throw errorResult;
    }
  }, [toast, mostrarToastRechazo]);

  /**
   * Reemplazar imagen principal
   */
  const replaceMainImage = useCallback(async (placeId: string, imageFile: File) => {
    try {
      console.log('🔄 [replaceMainImage] Reemplazando imagen principal:', {
        placeId,
        fileName: imageFile.name
      });

      const formData = new FormData();
      formData.append('imagen', imageFile);

      const response = await api.put<{ 
        mensaje: string;
        url_imagen: string;
        imagen_id: string;
        es_principal: boolean;
        archivo: { nombre: string; tamaño: number; tipo: string };
      }>(`/api/lugares/${placeId}/imagen-principal`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ [replaceMainImage] Imagen principal reemplazada:', response.data);

      // Actualizar el estado local
      setPlaces(prevPlaces => 
        prevPlaces.map(place => 
          place.id === placeId 
            ? {
                ...place,
                image_url: response.data.url_imagen,
                gallery_images: place.gallery_images?.map(img => 
                  img.es_principal 
                    ? { ...img, url_foto: response.data.url_imagen }
                    : img
                ) || []
              }
            : place
        )
      );

      toast({
        title: '✅ Imagen principal actualizada',
        description: 'La imagen principal se ha reemplazado correctamente',
      });

      return response.data;
    } catch (err: unknown) {
      const errorMessage = handleError(err);
      console.error('❌ [replaceMainImage] Error:', errorMessage);
      
      toast({
        title: '❌ Error',
        description: 'Error al reemplazar imagen principal',
        variant: 'destructive',
      });
      
      throw new Error(typeof errorMessage === 'string' ? errorMessage : errorMessage.message);
    }
  }, [toast]);

  /**
   * Obtener galería de imágenes de un lugar - CORREGIDA
   */
  const getGallery = useCallback(async (placeId: string) => {
    try {
      console.log('🔄 Obteniendo galería para placeId:', placeId);
      
      const response = await api.get<{ 
        lugar_id: string;
        imagenes: GalleryImage[];
        total: number;
      }>(`/api/lugares/${placeId}/galeria`);

      console.log('✅ Respuesta de galería:', response.data);
      
      if (!response.data.imagenes) {
        console.warn('⚠️ No se encontraron imágenes en la respuesta');
        return [];
      }

      return response.data.imagenes;
    } catch (err: unknown) {
      console.error('❌ Error obteniendo galería:', {
        error: err,
        message: (err as Error)?.message,
      });
      
      const errorMessage = handleError(err);
      throw new Error(typeof errorMessage === 'string' ? errorMessage : errorMessage.message);
    }
  }, []);

  /**
   * Eliminar imagen de la galería - CORREGIDA
   */
  const deleteGalleryImage = useCallback(async (placeId: string, imageId: string) => {
    try {
      console.log('🗑️ Eliminando imagen:', { placeId, imageId });
      
      await api.delete(`/api/lugares/${placeId}/galeria/${imageId}`);
      
      toast({
        title: '✅ Imagen eliminada',
        description: 'La imagen ha sido eliminada de la galería',
      });
      
      return true;
    } catch (err: unknown) {
      console.error('❌ Error eliminando imagen:', err);
      
      const errorMessage = handleError(err);
      
      toast({
        title: '❌ Error',
        description: typeof errorMessage === 'string' ? errorMessage : errorMessage.message,
        variant: 'destructive',
      });
      
      throw new Error(typeof errorMessage === 'string' ? errorMessage : errorMessage.message);
    }
  }, [toast]);

  /**
   * Establecer imagen como principal - CORREGIDA
   */
  const setMainImage = useCallback(async (placeId: string, imageId: string) => {
    try {
      console.log('⭐ Estableciendo imagen principal:', { placeId, imageId });
      
       await api.put(`/api/lugares/${placeId}/galeria/${imageId}/principal`);      
      // Actualizar la lista de lugares para reflejar el cambio
      await fetchPlaces();
      
      toast({
        title: '✅ Imagen principal actualizada',
        description: 'La imagen se ha establecido como principal',
      });
      
      return true;
    } catch (err: unknown) {
      console.error('❌ Error estableciendo imagen principal:', err);
      
      const errorMessage = handleError(err);
      
      toast({
        title: '❌ Error',
        description: typeof errorMessage === 'string' ? errorMessage : errorMessage.message,
        variant: 'destructive',
      });
      
      throw new Error(typeof errorMessage === 'string' ? errorMessage : errorMessage.message);
    }
  }, [fetchPlaces, toast]);

  /**
   * ✅ CORREGIDO: Actualizar descripción de imagen CON moderación
   */
  const updateImageDescription = useCallback(async (imageId: string, descripcion: string) => {
    try {
      setLoading(true);

      console.log('✏️ Actualizando descripción con moderación:', { 
        imageId, 
        descripcion: descripcion.substring(0, 30) + '...' 
      });

      // ✅ PRIMERO: Validar la descripción con el servicio de moderación
      const resultadoValidacion = await validarDescripcionFoto(descripcion);
      
      if (!resultadoValidacion.esAprobado) {
        // Crear error de moderación con detalles
        const errorModeracion: ModeracionError = {
          message: resultadoValidacion.mensaje,
          detalles: {
            problemas: resultadoValidacion.detalles?.problemas,
            sugerencias: resultadoValidacion.detalles?.sugerencias,
            puntuacion: resultadoValidacion.puntuacion,
            campoEspecifico: 'descripcion_foto'
          }
        };
        
        setError(errorModeracion);
        
        mostrarToastRechazo(errorModeracion);
        
        throw errorModeracion;
      }

      // ✅ SI ES APROBADA: Proceder con la actualización
      // Necesitamos encontrar el placeId al que pertenece la imagen
      let placeIdEncontrado = '';
      
      // Buscar en los lugares actuales para encontrar a qué lugar pertenece la imagen
      for (const place of places) {
        if (place.gallery_images?.some(img => img.id === imageId)) {
          placeIdEncontrado = place.id;
          break;
        }
      }

      if (!placeIdEncontrado) {
        throw new Error('No se pudo encontrar el lugar al que pertenece la imagen');
      }

      const response = await api.put<{ 
        mensaje: string;
        imagen: { id: string; descripcion: string };
        moderacion: {
          esAprobado: boolean;
          puntuacion: number;
          timestamp: string;
        };
      }>(`/api/lugares/${placeIdEncontrado}/galeria/${imageId}/descripcion`, {
        descripcion
      });

      // Actualizar el estado local
      setPlaces(prevPlaces => 
        prevPlaces.map(place => 
          place.id === placeIdEncontrado 
            ? {
                ...place,
                gallery_images: place.gallery_images?.map((img: GalleryImage) =>
                  img.id === imageId ? { ...img, descripcion } : img
                ) || []
              }
            : place
        )
      );

      toast({
        title: '✅ Descripción actualizada',
        description: 'La descripción se ha actualizado correctamente',
      });

      return response.data;

    } catch (err: any) {
      console.error('❌ Error actualizando descripción:', err);
      
      // Si ya es un error de moderación, no mostrar toast adicional
      if (err.detalles) {
        throw err;
      }
      
      const errorMessage = err.response?.data?.error || err.message || 'Error al actualizar descripción';
      
      toast({
        title: '❌ Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [toast, validarDescripcionFoto, places, mostrarToastRechazo]);

  /**
   * ✅ NUEVA: Función para pre-validar descripción antes de guardar
   */
  const prevalidarDescripcion = useCallback(async (descripcion: string): Promise<ResultadoAnalisisDescripcion> => {
    return await analizarDescripcionFoto(descripcion);
  }, [analizarDescripcionFoto]);

  /**
   * Eliminar imagen principal
   */
  const deleteMainImage = useCallback(async (placeId: string) => {
    try {
      const response = await api.delete<{ 
        mensaje: string;
        nueva_imagen_principal: { id: string; url_foto: string } | null;
      }>(`/api/lugares/${placeId}/imagen-principal`);

      // Actualizar el estado local
      setPlaces(prevPlaces => 
        prevPlaces.map(place => {
          if (place.id !== placeId) return place;

          const nuevaImagenPrincipal = response.data.nueva_imagen_principal;
          
          return {
            ...place,
            image_url: nuevaImagenPrincipal?.url_foto || '',
            gallery_images: place.gallery_images?.filter((img: GalleryImage) =>
              !img.es_principal
            ).map((img: GalleryImage, index: number) =>
              index === 0 && nuevaImagenPrincipal 
                ? { ...img, es_principal: true }
                : img
            ) || []
          };
        })
      );

      toast({
        title: '✅ Imagen principal eliminada',
        description: response.data.mensaje,
      });

      return response.data;
    } catch (err: unknown) {
      const errorMessage = handleError(err);
      
      toast({
        title: '❌ Error',
        description: typeof errorMessage === 'string' ? errorMessage : errorMessage.message,
        variant: 'destructive',
      });
      
      throw new Error(typeof errorMessage === 'string' ? errorMessage : errorMessage.message);
    }
  }, [toast]);

  /**
   * Crear lugar SIN archivos - solo datos básicos
   */
  const createPlaceBasic = useCallback(async (placeData: PlaceFormData) => {
    try {
      setLoading(true);
      setError(null);

      // Validar datos requeridos
      if (!placeData.name?.trim()) {
        throw new Error('El nombre del lugar es requerido');
      }
      
      if (!placeData.description?.trim()) {
        throw new Error('La descripción del lugar es requerida');
      }

      if (!placeData.location?.trim()) {
        throw new Error('La ubicación del lugar es requerida');
      }

      if (!placeData.category?.trim()) {
        throw new Error('La categoría del lugar es requerida');
      }

      // Mapear datos al formato de la API
      const apiData = mapPlaceToApiData(placeData);
      
      const response = await api.post<{ 
        mensaje: string; 
        lugar: ApiPlace 
      }>('/api/lugares', apiData);
      
      if (!response.data.lugar) {
        throw new Error('No se recibió el lugar creado del servidor');
      }
      
      const newPlace = mapApiPlaceToPlace(response.data.lugar);
      
      // Actualizar la lista de lugares
      setPlaces(prevPlaces => [...prevPlaces, newPlace]);
      
      console.log('✅ [CREATE] Lugar creado básico:', newPlace.id);
      
      return newPlace;
    } catch (err: unknown) {
      const errorResult = handleError(err);
      
      if (typeof errorResult === 'object' && errorResult.detalles) {
        setError(JSON.stringify(errorResult));
        mostrarToastRechazo(errorResult);
      } else {
        const errorMessage = typeof errorResult === 'string' ? errorResult : errorResult.message;
        setError(errorMessage);
        toast({
          title: '❌ Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      throw new Error(typeof errorResult === 'string' ? errorResult : errorResult.message);
    } finally {
      setLoading(false);
    }
  }, [toast, mostrarToastRechazo]);

  /**
   * Subir imagen para un lugar existente
   */
  const uploadImageForPlace = useCallback(async (placeId: string, imageFile: File) => {
    try {
      console.log('🖼️ [UPLOAD] Subiendo imagen para lugar:', placeId);
      
      const formData = new FormData();
      formData.append('imagen', imageFile);

      const response = await api.post<{ 
        mensaje: string;
        url_imagen: string;
      }>(`/api/lugares/${placeId}/imagen`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      console.log('✅ [UPLOAD] Imagen subida correctamente');

      // Actualizar el estado local
      setPlaces(prevPlaces => 
        prevPlaces.map(place => 
          place.id === placeId 
            ? { ...place, image_url: response.data.url_imagen }
            : place
        )
      );

      return response.data;
    } catch (err: unknown) {
      const errorMessage = handleError(err);
      throw new Error(typeof errorMessage === 'string' ? errorMessage : errorMessage.message);
    }
  }, []);

  /**
   * Subir PDF para un lugar existente
   */
  const uploadPDFForPlace = useCallback(async (placeId: string, pdfFile: File) => {
    try {
      console.log('📄 [UPLOAD] Subiendo PDF para lugar:', placeId);
      
      const formData = new FormData();
      formData.append('pdf', pdfFile);

      const response = await api.post<{ 
        mensaje: string;
        url_pdf: string;
      }>(`/api/lugares/${placeId}/pdf`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      console.log('✅ [UPLOAD] PDF subido correctamente');

      // Actualizar el estado local
      setPlaces(prevPlaces => 
        prevPlaces.map(place => 
          place.id === placeId 
            ? { ...place, pdf_url: response.data.url_pdf }
            : place
        )
      );

      return response.data;
    } catch (err: unknown) {
      const errorMessage = handleError(err);
      throw new Error(typeof errorMessage === 'string' ? errorMessage : errorMessage.message);
    }
  }, []);

  /**
   * Eliminar imagen de un lugar
   */
  const deletePlaceImage = useCallback(async (placeId: string) => {
    try {
      console.log('🗑️ [DELETE] Eliminando imagen del lugar:', placeId);
      
      const response = await api.delete<{ 
        mensaje: string;
        nueva_imagen_principal: { id: string; url_foto: string } | null;
      }>(`/api/lugares/${placeId}/imagen-principal`);

      console.log('✅ [DELETE] Imagen eliminada correctamente');

      // Actualizar el estado local
      setPlaces(prevPlaces => 
        prevPlaces.map(place => 
          place.id === placeId 
            ? { 
                ...place, 
                image_url: response.data.nueva_imagen_principal?.url_foto || '',
                gallery_images: place.gallery_images?.filter(img => !img.es_principal) || []
              }
            : place
        )
      );

      return response.data;
    } catch (err: unknown) {
      const errorMessage = handleError(err);
      console.error('❌ [DELETE] Error eliminando imagen:', errorMessage);
      throw new Error(typeof errorMessage === 'string' ? errorMessage : errorMessage.message);
    }
  }, []);

  /**
   * Eliminar PDF de un lugar
   */
  const deletePlacePDF = useCallback(async (placeId: string) => {
    try {
      console.log('🗑️ [DELETE] Eliminando PDF del lugar:', placeId);
      
      const response = await api.delete<{ 
        mensaje: string;
      }>(`/api/lugares/${placeId}/pdf`);

      console.log('✅ [DELETE] PDF eliminado correctamente');

      // Actualizar el estado local
      setPlaces(prevPlaces => 
        prevPlaces.map(place => 
          place.id === placeId 
            ? { ...place, pdf_url: '' }
            : place
      )
    );

      return response.data;
    } catch (err: unknown) {
      const errorMessage = handleError(err);
      console.error('❌ [DELETE] Error eliminando PDF:', errorMessage);
      throw new Error(typeof errorMessage === 'string' ? errorMessage : errorMessage.message);
    }
  }, []);

  // Función para limpiar errores
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    places,
    loading,
    error,
    createPlace,
    updatePlace,           // ← Actualización completa con validación
    updatePlaceFast,       // ← Nueva: Actualización rápida sin validación
    updatePlaceMetadata,   // ← Nueva: Solo ubicación/categoría
    updatePlaceText,       // ← Nueva: Solo nombre/descripción (con validación)
    deletePlace,
    uploadPlaceImage,
    uploadMultipleImages,
    getGallery,
    deleteGalleryImage,
    setMainImage,
    fetchPlaces,
    uploadPlacePDFConModeracion,
    refetch: fetchPlaces,
    updateImageDescription,
    deleteMainImage,
    obtenerMotivosRechazo,
    createPlaceBasic,
    uploadImageForPlace,
    uploadPDFForPlace,
    replaceMainImage,
    deletePlaceImage,
    deletePlacePDF,
    clearError,
    prevalidarDescripcion,
    validarCambiosLugar,   // ← Nueva: Validación independiente
    analizarCambios,       // ← Nueva: Análisis de cambios
  };
};