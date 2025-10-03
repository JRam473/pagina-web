// hooks/usePlaces.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

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
  experiencias: any[];
}

interface PlacesResponse {
  lugares: Place[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

interface PlaceDetailsResponse {
  lugar: Place;
  fotos: PlacePhoto[];
  experiencias: any[];
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

export const usePlaces = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [currentPlace, setCurrentPlace] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRatings, setUserRatings] = useState<Record<string, UserRatingData>>({});
  const [isRating, setIsRating] = useState<Record<string, boolean>>({});
  const [categories, setCategories] = useState<string[]>([]);

  const { user } = useAuth();
  const { toast } = useToast();

  // Función para construir URLs de imágenes
  const buildImageUrl = (imagePath: string | null | undefined): string => {
    if (!imagePath) return '/placeholder.svg';
    
    // Si ya es una URL completa, retornar tal cual
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    
    // Si la ruta ya empieza con /, usar tal cual, sino agregar /
    const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    
    // Construir la URL completa
    return `${backendUrl}${normalizedPath}`;
  };

  // Función para procesar datos de lugares
  const parsePlaceData = (place: any): Place => ({
    ...place,
    foto_principal_url: place.foto_principal_url ? buildImageUrl(place.foto_principal_url) : '/placeholder.svg',
    pdf_url: place.pdf_url ? buildImageUrl(place.pdf_url) : '',
    puntuacion_promedio: place.puntuacion_promedio ? Number(place.puntuacion_promedio) : 0,
    total_calificaciones: place.total_calificaciones ? Number(place.total_calificaciones) : 0,
    total_experiencias: place.total_experiencias ? Number(place.total_experiencias) : 0
  });

  // Función para procesar fotos
  const parsePhotoData = (photo: any): PlacePhoto => ({
    ...photo,
    url_foto: photo.url_foto ? buildImageUrl(photo.url_foto) : '/placeholder.svg'
  });

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
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || 'Error al cargar los lugares';
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
   * Obtener un lugar específico por ID con todas sus fotos y experiencias
   */
  const fetchPlaceById = useCallback(async (placeId: string): Promise<PlaceDetails> => {
    try {
      setLoading(true);
      
      const response = await api.get<PlaceDetailsResponse>(`/api/lugares/${placeId}`);
      
      if (!response.data.lugar) {
        throw new Error('Lugar no encontrado');
      }
      
      const parsedPlace = parsePlaceData(response.data.lugar);
      const parsedPhotos = (response.data.fotos || []).map(parsePhotoData);
      
      const placeDetails = {
        lugar: parsedPlace,
        fotos: parsedPhotos,
        experiencias: response.data.experiencias || []
      };
      
      setCurrentPlace(placeDetails);
      return placeDetails;
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.message || 'Error al cargar el lugar';
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
      } catch (err: any) {
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
      comentario?: string, 
      placeName?: string
    ): Promise<boolean> => {
      try {
        setIsRating(prev => ({ ...prev, [placeId]: true }));

        // Verificar términos y condiciones para usuarios no autenticados
        const termsAccepted = localStorage.getItem('rating_terms_accepted') === 'true';
        
        if (!user && !termsAccepted) {
          throw new Error('TERMS_REQUIRED');
        }

        const ratingData: RatingRequest = {
          lugarId: placeId,
          calificacion,
          comentario
        };

        // Siempre usar POST para crear/actualizar calificación
        const response = await api.post('/api/calificaciones', ratingData);

        // Actualizar cache de calificaciones del usuario
        const newRating: UserRatingData = {
          id: response.data.calificacion?.id || '',
          calificacion,
          comentario,
          creado_en: response.data.calificacion?.creado_en || new Date().toISOString(),
          actualizado_en: response.data.calificacion?.actualizado_en || new Date().toISOString()
        };

        setUserRatings(prev => ({
          ...prev,
          [placeId]: newRating
        }));

        // Actualizar la lista de lugares con los nuevos promedios
        await fetchPlaces();

        return true;
      } catch (err: any) {
        if (err.message === 'TERMS_REQUIRED') {
          throw err;
        }
        
        const errorMessage = err?.response?.data?.error || 
                           err?.message || 
                           'Error al calificar el lugar';

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
    [toast, fetchPlaces, user]
  );

  /**
   * Obtener estadísticas detalladas de calificaciones de un lugar
   */
// En hooks/usePlaces.ts - ACTUALIZAR LA FUNCIÓN getRatingStats
const getRatingStats = useCallback(
  async (placeId: string): Promise<RatingStats | null> => {
    try {
      console.log(`📊 Fetching rating stats for place: ${placeId}`);
      
      // Usar la ruta CORRECTA
      const response = await api.get(`/api/calificaciones/lugar/${placeId}/estadisticas`);
      
      const calificaciones = response.data?.calificaciones || [];
      
      console.log(`📊 Raw ratings data for place ${placeId}:`, calificaciones);
      
      if (!Array.isArray(calificaciones)) {
        console.error('Expected array of ratings, got:', calificaciones);
        return null;
      }

      // Extraer solo los valores numéricos de calificación
      const ratingsValues = calificaciones.map((c: any) => {
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
    } catch (err: any) {
      console.error('❌ Error fetching rating stats:', err);
      console.error('❌ Error details:', err.response?.data);
      
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
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      return [];
    }
  }, []);

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
   * Limpiar calificación del usuario para un lugar (útil después de logout)
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

  // Limpiar datos cuando el usuario cierre sesión
  useEffect(() => {
    if (!user) {
      setUserRatings({});
      setIsRating({});
    }
  }, [user]);

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
    
    // Utilidades
    getMainPhoto,
    getPlacePdf,
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