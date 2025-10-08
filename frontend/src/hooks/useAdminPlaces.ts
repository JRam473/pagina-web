// hooks/useAdminPlaces.ts - VERSIÓN COMPLETAMENTE CORREGIDA
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

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
  gallery_images?: GalleryImage[]; // ✅ AÑADIDO: Propiedad faltante
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

// ✅ INTERFACE PARA ERRORES - Elimina el uso de 'any'
interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

export const useAdminPlaces = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Función para manejar errores de forma tipada
  const handleError = (err: unknown): string => {
    const error = err as ApiError;
    return error?.response?.data?.error || error?.message || 'Error desconocido';
  };

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
    } catch (err: unknown) { // ✅ CORREGIDO: Eliminado 'any'
      const errorMessage = handleError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crear un nuevo lugar
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
    } catch (err: unknown) { // ✅ CORREGIDO: Eliminado 'any'
      const errorMessage = handleError(err);
      setError(errorMessage);
      
      toast({
        title: '❌ Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Actualizar un lugar existente
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
    } catch (err: unknown) { // ✅ CORREGIDO: Eliminado 'any'
      const errorMessage = handleError(err);
      setError(errorMessage);
      
      toast({
        title: '❌ Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw new Error(errorMessage);
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
    } catch (err: unknown) { // ✅ CORREGIDO: Eliminado 'any'
      const errorMessage = handleError(err);
      setError(errorMessage);
      
      toast({
        title: '❌ Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Subir imagen de un lugar
   */
// En useAdminPlaces.ts - modifica las funciones de upload

const uploadPlaceImage = useCallback(async (placeId: string, imageFile: File) => {
  try {
    console.log('🖼️ [UPLOAD] Iniciando subida de imagen para lugar:', placeId);
    
    const formData = new FormData();
    formData.append('imagen', imageFile);

    // Timeout más largo y manejo de errores mejorado
    const response = await api.post<{ 
      mensaje: string;
      url_imagen: string;
    }>(`/api/lugares/${placeId}/imagen`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 45000, // 45 segundos para subidas lentas
    });

    console.log('✅ [UPLOAD] Imagen subida correctamente:', response.data.url_imagen);

    // Actualización optimista del estado
    setPlaces(prevPlaces => 
      prevPlaces.map(place => 
        place.id === placeId 
          ? { ...place, image_url: response.data.url_imagen }
          : place
      )
    );

    return response.data;
  } catch (err: unknown) {
    console.error('❌ [UPLOAD] Error subiendo imagen:', err);
    const errorMessage = handleError(err);
    
    // NO mostrar toast aquí, dejar que el componente padre lo maneje
    throw new Error(errorMessage);
  }
}, []);

  /**
   * Subir múltiples imágenes a la galería de un lugar - CORREGIDA
   */
// En tu useAdminPlaces.ts - mejorar la función uploadMultipleImages
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
    if (errorMessage.includes('timeout')) {
      userMessage = 'La subida tardó demasiado tiempo. Intenta con menos imágenes.';
    } else if (errorMessage.includes('network') || errorMessage.includes('Network')) {
      userMessage = 'Error de conexión. Verifica tu internet.';
    }
    
    toast({
      title: '❌ Error',
      description: userMessage,
      variant: 'destructive',
    });
    
    throw new Error(errorMessage);
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
    
    throw new Error(errorMessage);
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
    } catch (err: unknown) { // ✅ CORREGIDO: Eliminado 'any'
      console.error('❌ Error obteniendo galería:', {
        error: err,
        message: (err as Error)?.message,
      });
      
      const errorMessage = handleError(err);
      throw new Error(errorMessage);
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
    } catch (err: unknown) { // ✅ CORREGIDO: Eliminado 'any'
      console.error('❌ Error eliminando imagen:', err);
      
      const errorMessage = handleError(err);
      
      toast({
        title: '❌ Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw new Error(errorMessage);
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
    } catch (err: unknown) { // ✅ CORREGIDO: Eliminado 'any'
      console.error('❌ Error estableciendo imagen principal:', err);
      
      const errorMessage = handleError(err);
      
      toast({
        title: '❌ Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw new Error(errorMessage);
    }
  }, [fetchPlaces, toast]);

  /**
   * Subir PDF de un lugar
   */
  const uploadPlacePDF = useCallback(async (placeId: string, pdfFile: File) => {
    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);

      const response = await api.post<{ 
        mensaje: string;
        url_pdf: string;
      }>(`/api/lugares/${placeId}/pdf`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Actualizar el lugar con la nueva URL del PDF
      await updatePlace(placeId, { pdf_url: response.data.url_pdf });

      toast({
        title: '✅ PDF subido',
        description: 'El PDF se ha subido exitosamente',
      });

      return response.data;
    } catch (err: unknown) { // ✅ CORREGIDO: Eliminado 'any'
      const errorMessage = handleError(err);
      
      toast({
        title: '❌ Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw new Error(errorMessage);
    }
  }, [updatePlace, toast]);

  /**
   * Actualizar descripción de una imagen - CORREGIDA
   */
  const updateImageDescription = useCallback(async (placeId: string, imageId: string, descripcion: string) => {
    try {
      const response = await api.put<{ 
        mensaje: string;
        imagen: { id: string; descripcion: string };
      }>(`/api/lugares/${placeId}/galeria/${imageId}/descripcion`, {
        descripcion
      });

      // Actualizar el estado local
      setPlaces(prevPlaces => 
        prevPlaces.map(place => 
          place.id === placeId 
            ? {
                ...place,
                gallery_images: place.gallery_images?.map((img: GalleryImage) => // ✅ CORREGIDO: Tipo explícito
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
    } catch (err: unknown) { // ✅ CORREGIDO: Eliminado 'any'
      const errorMessage = handleError(err);
      
      toast({
        title: '❌ Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw new Error(errorMessage);
    }
  }, [toast]);

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
            gallery_images: place.gallery_images?.filter((img: GalleryImage) => // ✅ CORREGIDO: Tipo explícito
              !img.es_principal
            ).map((img: GalleryImage, index: number) => // ✅ CORREGIDO: Parámetros tipados
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
    } catch (err: unknown) { // ✅ CORREGIDO: Eliminado 'any'
      const errorMessage = handleError(err);
      
      toast({
        title: '❌ Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw new Error(errorMessage);
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
    const errorMessage = handleError(err);
    setError(errorMessage);
    throw new Error(errorMessage);
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
    throw new Error(errorMessage);
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
    throw new Error(errorMessage);
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
    createPlaceBasic, // ✅ AÑADIDO
    uploadImageForPlace, // ✅ AÑADIDO
    uploadPDFForPlace, // ✅ AÑADIDO
    replaceMainImage,
    clearError,
  };
};