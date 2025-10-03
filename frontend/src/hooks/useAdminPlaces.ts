// hooks/useAdminPlaces.ts
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

export interface Place {
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
  nombre: string;
  descripcion: string;
  ubicacion: string;
  categoria: string;
  foto_principal_url?: string;
  pdf_url?: string;
}

export const useAdminPlaces = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const buildImageUrl = (imagePath: string | null | undefined): string => {
    if (!imagePath) return '';
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    
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
  const fetchPlaces = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<{ lugares: Place[] }>('/api/lugares');
      const placesData = response.data.lugares || [];
      
      const parsedPlaces = placesData.map(parsePlaceData);
      setPlaces(parsedPlaces);
      
      return parsedPlaces;
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.message || 'Error al cargar los lugares';
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
      if (!placeData.nombre?.trim()) {
        throw new Error('El nombre del lugar es requerido');
      }
      
      if (!placeData.descripcion?.trim()) {
        throw new Error('La descripción del lugar es requerida');
      }

      if (!placeData.ubicacion?.trim()) {
        throw new Error('La ubicación del lugar es requerida');
      }

      if (!placeData.categoria?.trim()) {
        throw new Error('La categoría del lugar es requerida');
      }
      
      const response = await api.post<{ 
        mensaje: string; 
        lugar: Place 
      }>('/api/lugares', placeData);
      
      if (!response.data.lugar) {
        throw new Error('No se recibió el lugar creado del servidor');
      }
      
      const newPlace = parsePlaceData(response.data.lugar);
      
      // Actualizar la lista de lugares
      setPlaces(prevPlaces => [...prevPlaces, newPlace]);
      
      toast({
        title: '✅ Lugar creado',
        description: 'El lugar se ha creado exitosamente',
      });
      
      return newPlace;
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.message || 'Error al crear el lugar';
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

      // Limpiar datos undefined/null
      const cleanData: any = {};
      Object.keys(placeData).forEach(key => {
        if (placeData[key as keyof PlaceFormData] !== undefined && 
            placeData[key as keyof PlaceFormData] !== null) {
          cleanData[key] = placeData[key as keyof PlaceFormData];
        }
      });

      const response = await api.put<{ 
        mensaje: string; 
        lugar: Place 
      }>(`/api/lugares/${placeId}`, cleanData);
      
      if (!response.data.lugar) {
        throw new Error('No se recibió el lugar actualizado del servidor');
      }
      
      const updatedPlace = parsePlaceData(response.data.lugar);
      
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
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.message || 'Error al actualizar el lugar';
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

      const response = await api.delete<{ 
        mensaje: string; 
      }>(`/api/lugares/${placeId}`);
      
      // Actualizar la lista de lugares
      setPlaces(prevPlaces => prevPlaces.filter(place => place.id !== placeId));
      
      toast({
        title: '✅ Lugar eliminado',
        description: 'El lugar se ha eliminado exitosamente',
      });
      
      return true;
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.message || 'Error al eliminar el lugar';
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
  const uploadPlaceImage = useCallback(async (placeId: string, imageFile: File) => {
    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      // Actualizar el lugar con la nueva imagen
      const response = await api.put<{ 
        mensaje: string; 
        lugar: Place 
      }>(`/api/lugares/${placeId}`, {
        foto_principal_url: URL.createObjectURL(imageFile) // URL temporal
      });

      return response.data;
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.message || 'Error al subir la imagen';
      throw new Error(errorMessage);
    }
  }, []);

  /**
   * Subir PDF de un lugar
   */
  const uploadPlacePDF = useCallback(async (placeId: string, pdfFile: File) => {
    try {
      const formData = new FormData();
      formData.append('file', pdfFile);

      // Actualizar el lugar con el nuevo PDF
      const response = await api.put<{ 
        mensaje: string; 
        lugar: Place 
      }>(`/api/lugares/${placeId}`, {
        pdf_url: URL.createObjectURL(pdfFile) // URL temporal
      });

      return response.data;
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.message || 'Error al subir el PDF';
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
    uploadPlacePDF,
    refetch: fetchPlaces,
    clearError,
  };
};