// hooks/useAdminPlaces.ts - VERSIÓN CON MANEJO MEJORADO DE ERRORES DE MODERACIÓN
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

// ✅ INTERFACE MEJORADA PARA ERRORES DE MODERACIÓN
interface ApiError {
  response?: {
    data?: {
      error?: string;
      message?: string;
      problemas?: string[];
      tipo?: string;
      detalles?: {
        problemas?: string[];
        sugerencias?: string[];
        puntuacionNombre?: number;
        puntuacionDescripcion?: number;
        campoEspecifico?: 'nombre' | 'descripcion' | 'ambos';
      };
    };
  };
  message?: string;
}

// Interface para errores de moderación
export interface ModeracionError {
  message: string;
  detalles?: {
    problemas?: string[];
    sugerencias?: string[];
    puntuacionNombre?: number;
    puntuacionDescripcion?: number;
    campoEspecifico?: 'nombre' | 'descripcion' | 'ambos';
  };
}

export const useAdminPlaces = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | ModeracionError | null>(null);
  const { toast } = useToast();

  // ✅ FUNCIÓN MEJORADA: Manejar errores de forma tipada
const handleError = (err: unknown): string | ModeracionError => {
  const error = err as ApiError;
  
  // Si es error de moderación con detalles específicos
  if (error?.response?.data?.error === 'CONTENIDO_RECHAZADO') {
    return {
      message: error.response.data.message || 'Contenido rechazado por moderación',
      detalles: error.response.data.detalles
    };
  }
  
  return error?.response?.data?.error || error?.message || 'Error desconocido';
};

  const { 
    validarDescripcionFoto, 
    analizarDescripcionFoto,
    cargando: cargandoModeracion 
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
    gallery_images: [] // ✅ Inicializado como array vacío
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
  const createPlace = useCallback(async (placeData: PlaceFormData) => {
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
      
      toast({
        title: '✅ Lugar creado',
        description: 'El lugar se ha creado exitosamente',
      });
      
      return newPlace;
    }catch (err: unknown) {
    const errorResult = handleError(err);
    
    // ✅ CORREGIDO: Guardar el objeto de error directamente, no como string
    if (typeof errorResult === 'object' && errorResult.detalles) {
      setError(errorResult); // ← Ahora guardamos el objeto directamente
    } else {
      setError(typeof errorResult === 'string' ? errorResult : errorResult.message);
    }
    
    toast({
      title: '❌ Error',
      description: typeof errorResult === 'string' ? errorResult : errorResult.message,
      variant: 'destructive',
    });
    
    throw errorResult; // ← Lanzar el objeto completo
  } finally {
    setLoading(false);
  }
}, [toast]);

  /**
   * Actualizar un lugar existente - ACTUALIZADA CON MANEJO MEJORADO DE ERRORES
   */
  const updatePlace = useCallback(async (placeId: string, placeData: Partial<PlaceFormData>) => {
    try {
      setLoading(true);
      setError(null);

      // Mapear datos al formato de la API
      const apiData = mapPlaceToApiData(placeData);

      const response = await api.put<{ 
        mensaje: string; 
        lugar: ApiPlace 
      }>(`/api/lugares/${placeId}`, apiData);
      
      if (!response.data.lugar) {
        throw new Error('No se recibió el lugar actualizado del servidor');
      }
      
      const updatedPlace = mapApiPlaceToPlace(response.data.lugar);
      
      // Actualizar la lista de lugares
      setPlaces(prevPlaces => 
        prevPlaces.map(place => 
          place.id === placeId ? updatedPlace : place
        )
      );
      
      toast({
        title: '✅ Lugar actualizado',
        description: 'El lugar se ha actualizado exitosamente',
      });
      
      return updatedPlace;
    } catch (err: unknown) {
      const errorResult = handleError(err);
      
      // ✅ MEJORADO: Manejar errores de moderación con detalles
      if (typeof errorResult === 'object' && errorResult.detalles) {
        setError(JSON.stringify(errorResult));
      } else {
        setError(typeof errorResult === 'string' ? errorResult : errorResult.message);
      }
      
      toast({
        title: '❌ Error',
        description: typeof errorResult === 'string' ? errorResult : errorResult.message,
        variant: 'destructive',
      });
      
      throw new Error(typeof errorResult === 'string' ? errorResult : errorResult.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
   * Subir imagen de un lugar
   */
  const uploadPlaceImage = useCallback(async (placeId: string, imageFile: File) => {
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
      console.error('❌ [UPLOAD] Error subiendo imagen:', errorMessage);
      throw new Error(typeof errorMessage === 'string' ? errorMessage : errorMessage.message);
    }
  }, []);

  const uploadPlacePDF = useCallback(async (placeId: string, pdfFile: File) => {
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
      console.error('❌ [UPLOAD] Error subiendo PDF:', errorMessage);
      throw new Error(typeof errorMessage === 'string' ? errorMessage : errorMessage.message);
    }
  }, []);

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
        nota?: string;
      }>(`/api/lugares/${placeId}/imagenes`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 segundos timeout
      });

      console.log('✅ [uploadMultipleImages] Imágenes agregadas a galería:', response.data.imagenes);

      toast({
        title: '✅ Galería actualizada',
        description: `${imageFiles.length} imágenes agregadas a la galería`,
      });

      return response.data;
    } catch (err: unknown) {
      const errorMessage = handleError(err);
      console.error('❌ [uploadMultipleImages] Error:', errorMessage);
      
      // Error más específico para el usuario
      let userMessage = 'Error al agregar imágenes a la galería';
      if (typeof errorMessage === 'string') {
        if (errorMessage.includes('timeout')) {
          userMessage = 'La subida tardó demasiado tiempo. Intenta con menos imágenes.';
        } else if (errorMessage.includes('network') || errorMessage.includes('Network')) {
          userMessage = 'Error de conexión. Verifica tu internet.';
        }
      } else {
        userMessage = errorMessage.message;
      }
      
      toast({
        title: '❌ Error',
        description: userMessage,
        variant: 'destructive',
      });
      
      throw new Error(typeof errorMessage === 'string' ? errorMessage : errorMessage.message);
    }
  }, [toast]);

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
 * ✅ CORREGIDO: Actualizar descripción de imagen CON moderación - SIN placeId como primer parámetro
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
      
      toast({
        title: '🚫 Descripción rechazada',
        description: resultadoValidacion.mensaje,
        variant: 'destructive',
        duration: 6000,
      });
      
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
}, [toast, validarDescripcionFoto, places]);
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
      } else {
        setError(typeof errorResult === 'string' ? errorResult : errorResult.message);
      }
      throw new Error(typeof errorResult === 'string' ? errorResult : errorResult.message);
    } finally {
      setLoading(false);
    }
  }, []);

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
     loading: loading || cargandoModeracion,
    error,
    createPlace,
    updatePlace,
    deletePlace,
    uploadPlaceImage,
    uploadMultipleImages,
    getGallery,
    deleteGalleryImage,
    setMainImage,
    fetchPlaces,
    uploadPlacePDF,
    refetch: fetchPlaces,
    updateImageDescription,
    deleteMainImage,
    createPlaceBasic,
    uploadImageForPlace,
    uploadPDFForPlace,
    replaceMainImage,
    deletePlaceImage,
    deletePlacePDF,
    clearError,
    prevalidarDescripcion,
  };
};