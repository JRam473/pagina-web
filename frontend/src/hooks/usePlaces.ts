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

export interface UserRatingData {
  id: string;
  calificacion: number;
  comentario?: string;
}

export interface RatingStats {
  promedio: number;
  total: number;
  distribucion: Array<{
    calificacion: number;
    cantidad: number;
  }>;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  lugares?: T[];
  calificaciones?: any[];
  lugar?: T;
  fotos?: any[];
  experiencias?: any[];
}

interface RatingItem {
  id: string;
  lugar_id: string;
  calificacion: number;
  comentario: string;
  creado_en: string;
}

export const usePlaces = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRatings, setUserRatings] = useState<Record<string, UserRatingData>>({});
  const [isRating, setIsRating] = useState<Record<string, boolean>>({});

  const { user } = useAuth();
  const { toast } = useToast();

// hooks/usePlaces.ts - Función buildImageUrl corregida
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

  const parsePlaceData = (place: any): Place => ({
    ...place,
    foto_principal_url: place.foto_principal_url ? buildImageUrl(place.foto_principal_url) : '',
    pdf_url: place.pdf_url ? buildImageUrl(place.pdf_url) : '',
    puntuacion_promedio: place.puntuacion_promedio ? Number(place.puntuacion_promedio) : 0,
    total_calificaciones: place.total_calificaciones ? Number(place.total_calificaciones) : 0,
    total_experiencias: place.total_experiencias ? Number(place.total_experiencias) : 0
  });

  /**
   * Obtener todos los lugares
   */
// hooks/usePlaces.ts - En fetchPlaces, después de parsear
const fetchPlaces = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);

    const response = await api.get<{ lugares: Place[] }>('/api/lugares');
    const placesData = response.data.lugares || [];
    
    const parsedPlaces = placesData.map(parsePlaceData);
    
    // ✅ Debugging: verificar URLs de imágenes
    console.log('📸 URLs de imágenes procesadas:');
    parsedPlaces.forEach(place => {
      console.log(`- ${place.nombre}: ${place.foto_principal_url}`);
    });
    
    setPlaces(parsedPlaces);
    
    return parsedPlaces;
  } catch (err: any) {
    // ... manejo de errores
  } finally {
    setLoading(false);
  }
}, [toast]);

  /**
   * Obtener un lugar específico por ID
   */
  const fetchPlaceById = useCallback(async (placeId: string) => {
    try {
      setLoading(true);
      
      const response = await api.get<{ 
        lugar: Place; 
        fotos: any[]; 
        experiencias: any[] 
      }>(`/api/lugares/${placeId}`);
      
      if (!response.data.lugar) {
        throw new Error('Lugar no encontrado');
      }
      
      const parsedPlace = parsePlaceData(response.data.lugar);
      return {
        lugar: parsedPlace,
        fotos: response.data.fotos || [],
        experiencias: response.data.experiencias || []
      };
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.message || 'Error al cargar el lugar';
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
        const response = await api.get<{ calificacion: RatingItem | null }>(
          `/api/calificaciones/lugar/${placeId}/mi-calificacion`
        );
        
        const userRating = response.data.calificacion;
        
        if (userRating && typeof userRating.calificacion === 'number') {
          return { 
            id: userRating.id, 
            calificacion: Number(userRating.calificacion),
            comentario: userRating.comentario
          };
        }
        
        return null;
      } catch (err) {
        console.error('Error fetching user rating:', err);
        return null;
      }
    },
    []
  );

  /**
   * Calificar un lugar
   */
// hooks/usePlaces.ts - Actualizar la función ratePlace
const ratePlace = useCallback(
  async (placeId: string, calificacion: number, comentario?: string, placeName?: string) => {
    try {
      setIsRating(prev => ({ ...prev, [placeId]: true }));

      // Verificar si ya aceptó los términos (para usuarios no logueados)
      const termsAccepted = localStorage.getItem('rating_terms_accepted') === 'true';
      
      if (!user && !termsAccepted) {
        // Esto se manejará en el componente principal
        throw new Error('TERMS_REQUIRED');
      }

      const userRating = await getUserRating(placeId);
      
      let response;
      if (userRating && userRating.id) {
        // Actualizar calificación existente
        response = await api.put(`/api/calificaciones/${userRating.id}`, { 
          calificacion,
          comentario: comentario || userRating.comentario
        });
        
        toast({
          title: '⭐ Calificación actualizada',
          description: `Tu calificación para ${placeName || 'este lugar'} ha sido actualizada a ${calificacion} estrellas`,
        });
      } else {
        // Crear nueva calificación
        response = await api.post('/api/calificaciones', { 
          lugarId: placeId, 
          calificacion,
          comentario
        });
        
        toast({
          title: '🎉 ¡Gracias por tu calificación!',
          description: `Has calificado ${placeName || 'este lugar'} con ${calificacion} estrellas`,
        });
      }

      // Actualizar la lista de lugares con los nuevos promedios
      await fetchPlaces();

      return true;
    } catch (err: any) {
      if (err.message === 'TERMS_REQUIRED') {
        // Este error se manejará en el componente para mostrar el diálogo de términos
        throw err;
      }
      
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
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
  [toast, fetchPlaces, getUserRating, user]
);

  /**
   * Obtener estadísticas de calificaciones de un lugar
   */
  const getRatingStats = useCallback(
    async (placeId: string) => {
      try {
        const response = await api.get<{ calificaciones: RatingItem[] }>(
          `/api/calificaciones/lugar/${placeId}`
        );
        
        const calificaciones = response.data.calificaciones || [];
        
        // Calcular estadísticas manualmente
        const total = calificaciones.length;
        const suma = calificaciones.reduce((acc, curr) => acc + curr.calificacion, 0);
        const promedio = total > 0 ? suma / total : 0;
        
        // Calcular distribución
        const distribucion = [1, 2, 3, 4, 5].map(rating => ({
          calificacion: rating,
          cantidad: calificaciones.filter(c => c.calificacion === rating).length
        }));
        
        const stats: RatingStats = {
          promedio,
          total,
          distribucion
        };
        
        return stats;
      } catch (err) {
        console.error('Error fetching rating stats:', err);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las estadísticas',
          variant: 'warning',
        });
        return null;
      }
    },
    [toast]
  );

  /**
   * Obtener categorías disponibles
   */
  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get<{ categorias: string[] }>('/api/lugares/categorias');
      return response.data.categorias || [];
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      return [];
    }
  }, []);

  // Limpiar datos cuando el usuario cierre sesión
  useEffect(() => {
    if (!user) {
      setUserRatings({});
      setIsRating({});
    }
  }, [user]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  return {
    places,
    loading,
    error,
    ratePlace,
    getUserRating,
    getRatingStats,
    fetchPlaceById,
    fetchCategories,
    isRating,
    refetch: fetchPlaces,
  };
};