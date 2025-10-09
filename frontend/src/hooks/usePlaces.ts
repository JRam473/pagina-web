// hooks/usePlaces.ts - VERSIÓN COMPLETAMENTE CORREGIDA
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

// Interfaces principales
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

export interface Place {
  id: string;
  nombre: string;
  descripcion: string;
  foto_principal_url: string;
  pdf_url: string;
  categoria: string;
  ubicacion: string;
  puntuacion_promedio: number;
  total_calificaciones: number;
  total_experiencias: number;
  creado_en: string;
  actualizado_en: string;
  gallery_images?: GalleryImage[];
}

export interface PlacePhoto {
  id: string;
  lugar_id: string;
  url_foto: string;
  ruta_almacenamiento: string;
  es_principal: boolean;
  descripcion: string;
  orden: number;
  ancho_imagen: number;
  alto_imagen: number;
  tamaño_archivo: number;
  tipo_archivo: string;
  creado_en: string;
}

export interface UserRatingData {
  id: string;
  calificacion: number;
  comentario?: string;
  creado_en?: string;
  actualizado_en?: string;
}

export interface RatingStats {
  promedio: number;
  total: number;
  distribucion: Array<{
    calificacion: number;
    cantidad: number;
    porcentaje: number;
  }>;
}

export interface PlaceDetails {
  lugar: Place;
  fotos: PlacePhoto[];
  galeria?: GalleryImage[];
}

// Interfaces para respuestas de API
interface PlacesResponse {
  lugares: Place[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

interface PlaceDetailsResponse {
  lugar: Place;
  fotos: PlacePhoto[];
}

interface UserRatingResponse {
  calificacion: UserRatingData | null;
}

interface CategoriesResponse {
  categorias: string[];
}

interface RatingRequest {
  lugarId: string;
  calificacion: number;
  comentario?: string;
}

interface GalleryResponse {
  lugar_id: string;
  imagenes: GalleryImage[];
  total: number;
}

// ✅ INTERFACE CORREGIDA PARA ESTADÍSTICAS
interface RatingStatsResponse {
  calificaciones: Array<{
    calificacion: number;
    id?: string;
    lugar_id?: string;
    comentario?: string;
    creado_en?: string;
  }>;
  promedio?: number;
  total?: number;
  distribucion?: Array<{
    calificacion: number;
    cantidad: number;
    porcentaje: number;
  }>;
}

// Interface para errores de API
interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

// ✅ INTERFACE PARA RESPUESTA DE CALIFICACIÓN
interface RatingPostResponse {
  calificacion?: {
    id: string;
    calificacion: number;
    comentario?: string;
    creado_en: string;
    actualizado_en: string;
  };
  mensaje?: string;
}

export const usePlaces = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [currentPlace, setCurrentPlace] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRatings, setUserRatings] = useState<Record<string, UserRatingData>>({});
  const [isRating, setIsRating] = useState<Record<string, boolean>>({});
  const [categories, setCategories] = useState<string[]>([]);

  const { toast } = useToast();

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

  // Función para procesar datos de lugares
  const parsePlaceData = useCallback((place: Place): Place => ({
    ...place,
    foto_principal_url: place.foto_principal_url ? buildImageUrl(place.foto_principal_url) : '/placeholder.svg',
    pdf_url: place.pdf_url ? buildImageUrl(place.pdf_url) : '',
    puntuacion_promedio: place.puntuacion_promedio ? Number(place.puntuacion_promedio) : 0,
    total_calificaciones: place.total_calificaciones ? Number(place.total_calificaciones) : 0,
    total_experiencias: place.total_experiencias ? Number(place.total_experiencias) : 0
  }), []);

  // Función para procesar fotos
  const parsePhotoData = useCallback((photo: PlacePhoto): PlacePhoto => ({
    ...photo,
    url_foto: photo.url_foto ? buildImageUrl(photo.url_foto) : '/placeholder.svg'
  }), []);

  // Función para manejar errores de forma tipada
  const handleError = (err: unknown): string => {
    const error = err as ApiError;
    return error?.response?.data?.error || error?.message || 'Error desconocido';
  };

  /**
   * Obtener todos los lugares con filtros opcionales
   */
  const fetchPlaces = useCallback(async (filters?: {
    categoria?: string;
    pagina?: number;
    limite?: number;
    orden?: 'puntuacion' | 'nombre' | 'recientes';
  }) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      
      if (filters?.categoria) params.append('categoria', filters.categoria);
      if (filters?.pagina) params.append('pagina', filters.pagina.toString());
      if (filters?.limite) params.append('limite', filters.limite.toString());
      if (filters?.orden) params.append('orden', filters.orden);

      const queryString = params.toString();
      const url = queryString ? `/api/lugares?${queryString}` : '/api/lugares';

      const response = await api.get<PlacesResponse>(url);
      const placesData = response.data.lugares || [];
      
      const parsedPlaces = placesData.map(parsePlaceData);
      
      console.log('📸 Lugares cargados:', parsedPlaces.length);
      setPlaces(parsedPlaces);
      
      return {
        lugares: parsedPlaces,
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
  }, [toast, parsePlaceData]);


/**
 * Obtener galería de un lugar específico - VERSIÓN CORREGIDA
 */
const fetchPlaceGallery = useCallback(async (placeId: string): Promise<GalleryImage[]> => {
  try {
    console.log('🔄 [usePlaces] Obteniendo galería completa para placeId:', placeId);
    
    const response = await api.get<GalleryResponse>(`/api/lugares/${placeId}/galeria`);
    
    console.log('📸 [usePlaces] Respuesta de galería:', response.data);
    
    if (!response.data.imagenes || !Array.isArray(response.data.imagenes)) {
      console.warn('⚠️ No se encontraron imágenes en la galería o formato incorrecto');
      return [];
    }

    // Procesar URLs de imágenes
    const galleryImages = response.data.imagenes.map((img: GalleryImage) => ({
      ...img,
      url_foto: img.url_foto ? buildImageUrl(img.url_foto) : '/placeholder.svg'
    }));

    console.log('✅ [usePlaces] Galería procesada:', galleryImages.length, 'imágenes');
    return galleryImages;
  } catch (err: unknown) {
    console.error('❌ [usePlaces] Error obteniendo galería:', err);
    const errorMessage = handleError(err);
    
    // Si falla la galería específica, intentar con el endpoint básico
    try {
      console.log('🔄 [usePlaces] Intentando obtener fotos básicas...');
      const fallbackResponse = await api.get<PlaceDetailsResponse>(`/api/lugares/${placeId}`);
      
      if (fallbackResponse.data.fotos && Array.isArray(fallbackResponse.data.fotos)) {
        const fallbackImages = fallbackResponse.data.fotos.map(photo => ({
          id: photo.id,
          url_foto: photo.url_foto ? buildImageUrl(photo.url_foto) : '/placeholder.svg',
          descripcion: photo.descripcion || `Imagen de ${fallbackResponse.data.lugar.nombre}`,
          es_principal: photo.es_principal,
          orden: photo.orden,
          creado_en: photo.creado_en,
          ancho_imagen: photo.ancho_imagen,
          alto_imagen: photo.alto_imagen,
          tamaño_archivo: photo.tamaño_archivo,
          tipo_archivo: photo.tipo_archivo
        }));
        console.log('✅ [usePlaces] Usando fotos básicas como fallback:', fallbackImages.length);
        return fallbackImages;
      }
    } catch (fallbackError) {
      console.error('❌ [usePlaces] Fallback también falló:', fallbackError);
    }
    
    throw new Error(errorMessage);
  }
}, []);

/**
 * Obtener un lugar específico por ID con todas sus fotos y galería - VERSIÓN CORREGIDA
 */
const fetchPlaceById = useCallback(async (placeId: string): Promise<PlaceDetails> => {
  try {
    setLoading(true);
    setError(null);
    
    console.log('🔄 [usePlaces] Obteniendo detalles del lugar:', placeId);
    
    const response = await api.get<PlaceDetailsResponse>(`/api/lugares/${placeId}`);
    
    if (!response.data.lugar) {
      throw new Error('Lugar no encontrado');
    }
    
    const parsedPlace = parsePlaceData(response.data.lugar);
    const parsedPhotos = (response.data.fotos || []).map(parsePhotoData);
    
    console.log('📸 [usePlaces] Fotos básicas obtenidas:', parsedPhotos.length);
    
    // Cargar galería completa EN PARALELO para mejor performance
    let galleryImages: GalleryImage[] = [];
    try {
      galleryImages = await fetchPlaceGallery(placeId);
      console.log('✅ [usePlaces] Galería completa cargada:', galleryImages.length, 'imágenes');
    } catch (galleryError) {
      console.warn('⚠️ [usePlaces] No se pudo cargar la galería completa, usando fotos básicas:', galleryError);
      // Usar las fotos básicas como fallback
      galleryImages = parsedPhotos.map(photo => ({
        id: photo.id,
        url_foto: photo.url_foto,
        descripcion: photo.descripcion,
        es_principal: photo.es_principal,
        orden: photo.orden,
        creado_en: photo.creado_en,
        ancho_imagen: photo.ancho_imagen,
        alto_imagen: photo.alto_imagen,
        tamaño_archivo: photo.tamaño_archivo,
        tipo_archivo: photo.tipo_archivo
      }));
    }
    
    const placeDetails: PlaceDetails = {
      lugar: {
        ...parsedPlace,
        gallery_images: galleryImages
      },
      fotos: parsedPhotos,
      galeria: galleryImages
    };
    
    console.log('✅ [usePlaces] Detalles del lugar procesados:', {
      lugar: parsedPlace.nombre,
      fotos: parsedPhotos.length,
      galeria: galleryImages.length
    });
    
    setCurrentPlace(placeDetails);
    return placeDetails;
  } catch (err: unknown) {
    const errorMessage = handleError(err);
    console.error('❌ [usePlaces] Error obteniendo lugar:', errorMessage);
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
}, [toast, parsePlaceData, parsePhotoData, fetchPlaceGallery]);

  /**
   * Obtener calificación del usuario para un lugar
   */
  const getUserRating = useCallback(
    async (placeId: string): Promise<UserRatingData | null> => {
      try {
        const response = await api.get<UserRatingResponse>(
          `/api/calificaciones/lugar/${placeId}/mi-calificacion`
        );
        
        const userRating = response.data.calificacion;
        
        if (userRating && typeof userRating.calificacion === 'number') {
          const ratingData: UserRatingData = { 
            id: userRating.id, 
            calificacion: Number(userRating.calificacion),
            comentario: userRating.comentario,
            creado_en: userRating.creado_en,
            actualizado_en: userRating.actualizado_en
          };
          
          // Actualizar cache
          setUserRatings(prev => ({
            ...prev,
            [placeId]: ratingData
          }));
          
          return ratingData;
        }
        
        return null;
      } catch (err: unknown) {
        console.error('Error fetching user rating:', err);
        return null;
      }
    },
    []
  );

  /**
   * Calificar un lugar con manejo de términos y condiciones
   */
  const ratePlace = useCallback(
    async (
      placeId: string, 
      calificacion: number, 
      comentario?: string
    ): Promise<boolean> => {
      try {
        setIsRating(prev => ({ ...prev, [placeId]: true }));

        // Verificar términos y condiciones
        const termsAccepted = localStorage.getItem('rating_terms_accepted') === 'true';
        
        if (!termsAccepted) {
          throw new Error('TERMS_REQUIRED');
        }

        const ratingData: RatingRequest = {
          lugarId: placeId,
          calificacion,
          comentario
        };

        // ✅ CORREGIDO: Type assertion explícito para la respuesta POST
        const response = await api.post<RatingPostResponse>('/api/calificaciones', ratingData);

        // ✅ CORREGIDO: Type assertion para response.data
        const responseData = response.data as RatingPostResponse;

        // Actualizar cache de calificaciones del usuario
        const newRating: UserRatingData = {
          id: responseData.calificacion?.id || '',
          calificacion,
          comentario,
          creado_en: responseData.calificacion?.creado_en || new Date().toISOString(),
          actualizado_en: responseData.calificacion?.actualizado_en || new Date().toISOString()
        };

        setUserRatings(prev => ({
          ...prev,
          [placeId]: newRating
        }));

        // Actualizar la lista de lugares con los nuevos promedios
        await fetchPlaces();

        return true;
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'TERMS_REQUIRED') {
          throw err;
        }
        
        const errorMessage = handleError(err);
        
        toast({
          title: '❌ Error al calificar',
          description: errorMessage,
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsRating(prev => ({ ...prev, [placeId]: false }));
      }
    },
    [toast, fetchPlaces]
  );

  /**
   * Obtener estadísticas detalladas de calificaciones de un lugar
   */
  const getRatingStats = useCallback(
    async (placeId: string): Promise<RatingStats | null> => {
      try {
        console.log(`📊 Fetching rating stats for place: ${placeId}`);
        
        // ✅ CORREGIDO: Type assertion explícito
        const response = await api.get(`/api/calificaciones/lugar/${placeId}/estadisticas`);
        
        // ✅ CORREGIDO: Type assertion explícito para response.data
        const responseData = response.data as RatingStatsResponse;
        const calificaciones = responseData.calificaciones || [];
        
        console.log(`📊 Raw ratings data for place ${placeId}:`, calificaciones);
        
        if (!Array.isArray(calificaciones)) {
          console.error('Expected array of ratings, got:', calificaciones);
          return null;
        }

        // Extraer solo los valores numéricos de calificación
        const ratingsValues = calificaciones.map((c) => {
          const rating = c.calificacion;
          console.log(`⭐ Rating value:`, rating);
          return Number(rating);
        });

        console.log(`📊 Processed ratings values:`, ratingsValues);

        const total = ratingsValues.length;
        const suma = ratingsValues.reduce((acc: number, curr: number) => acc + curr, 0);
        const promedio = total > 0 ? Number((suma / total).toFixed(1)) : 0;
        
        // Calcular distribución CORRECTAMENTE
        const distribucion = [1, 2, 3, 4, 5].map(calificacion => {
          const cantidad = ratingsValues.filter(rating => rating === calificacion).length;
          const porcentaje = total > 0 ? Number(((cantidad / total) * 100).toFixed(1)) : 0;
          
          console.log(`📊 Distribución ${calificacion} estrellas:`, { cantidad, porcentaje });
          
          return {
            calificacion,
            cantidad,
            porcentaje
          };
        });
        
        const stats: RatingStats = {
          promedio,
          total,
          distribucion
        };
        
        console.log(`📊 Final stats for place ${placeId}:`, stats);
        return stats;
      } catch (err: unknown) {
        console.error('❌ Error fetching rating stats:', err);
        
        // Fallback: crear stats básicas desde los datos del lugar
        const place = places.find(p => p.id === placeId);
        if (place && place.puntuacion_promedio > 0) {
          const fallbackStats: RatingStats = {
            promedio: place.puntuacion_promedio,
            total: place.total_calificaciones,
            distribucion: [1, 2, 3, 4, 5].map(calificacion => ({
              calificacion,
              cantidad: 0,
              porcentaje: 0
            }))
          };
          console.log(`📊 Using fallback stats for ${placeId}:`, fallbackStats);
          return fallbackStats;
        }
        return null;
      }
    },
    [places]
  );

  /**
   * Obtener categorías disponibles
   */
  const fetchCategories = useCallback(async (): Promise<string[]> => {
    try {
      const response = await api.get<CategoriesResponse>('/api/lugares/categorias');
      const categorias = response.data.categorias || [];
      setCategories(categorias);
      return categorias;
    } catch (err: unknown) {
      console.error('Error fetching categories:', err);
      return [];
    }
  }, []);

  /**
   * Obtener solo la galería de un lugar (sin todos los detalles)
   */
  const getPlaceGallery = useCallback(async (placeId: string): Promise<GalleryImage[]> => {
    return await fetchPlaceGallery(placeId);
  }, [fetchPlaceGallery]);

  /**
   * Obtener foto principal de un lugar
   */
  const getMainPhoto = useCallback((place: Place): string => {
    return place.foto_principal_url || '/placeholder.svg';
  }, []);

  /**
   * Obtener PDF del lugar si está disponible
   */
  const getPlacePdf = useCallback((place: Place): string | null => {
    return place.pdf_url || null;
  }, []);

  /**
   * Obtener todas las imágenes de la galería de un lugar
   */
  const getGalleryPhotos = useCallback((place: Place): GalleryImage[] => {
    return place.gallery_images || [];
  }, []);

  /**
   * Obtener imagen principal desde la galería
   */
  const getMainPhotoFromGallery = useCallback((place: Place): GalleryImage | null => {
    const gallery = place.gallery_images || [];
    return gallery.find(img => img.es_principal) || gallery[0] || null;
  }, []);

  /**
   * Verificar si el usuario ya calificó un lugar
   */
  const hasUserRated = useCallback((placeId: string): boolean => {
    return !!userRatings[placeId];
  }, [userRatings]);

  /**
   * Obtener la calificación actual del usuario para un lugar
   */
  const getUserCurrentRating = useCallback((placeId: string): number | null => {
    return userRatings[placeId]?.calificacion || null;
  }, [userRatings]);

  /**
   * Limpiar calificación del usuario para un lugar
   */
  const clearUserRating = useCallback((placeId: string) => {
    setUserRatings(prev => {
      const newRatings = { ...prev };
      delete newRatings[placeId];
      return newRatings;
    });
  }, []);

  // Cargar lugares al inicializar
  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  // Cargar categorías al inicializar
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    // Estado
    places,
    currentPlace,
    loading,
    error,
    categories,
    userRatings,
    isRating,
    
    // Acciones principales
    fetchPlaces,
    fetchPlaceById,
    ratePlace,
    getUserRating,
    getRatingStats,
    fetchCategories,
    getPlaceGallery,
    
    // Utilidades
    getMainPhoto,
    getPlacePdf,
    getGalleryPhotos,
    getMainPhotoFromGallery,
    hasUserRated,
    getUserCurrentRating,
    clearUserRating,
    
    // Re-fetch
    refetch: fetchPlaces,
    
    // Reset
    resetError: () => setError(null),
    clearCurrentPlace: () => setCurrentPlace(null),
  };
};