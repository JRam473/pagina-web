// hooks/useRouteCalculator.ts
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Location {
  address: string;
  lat: number;
  lng: number;
}

type TravelMode = 'DRIVING' | 'WALKING' | 'BICYCLING';
type RouteType = 'direct' | 'via_transport' | 'current_to_transport' | 'current_to_direct';

interface RouteSegment {
  distance: string;
  duration: string;
  mode: TravelMode;
  instructions: string;
  distanceMeters: number;
  durationSeconds: number;
  startLocation: Location;
  endLocation: Location;
}

interface CalculatedRoute {
  segments: RouteSegment[];
  totalDistance: string;
  totalDuration: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
}

export const useRouteCalculator = () => {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { toast } = useToast();

  // ✅ Obtener ubicación actual del usuario con permisos
  const getUserCurrentLocation = useCallback((): Promise<Location> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('La geolocalización no es soportada por este navegador'));
        return;
      }

      setIsGettingLocation(true);
      setLocationError(null);

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            
            // Reverse geocoding para obtener la dirección
            const address = await reverseGeocode(latitude, longitude);
            
            const location: Location = {
              address,
              lat: latitude,
              lng: longitude
            };

            setUserLocation(location);
            setIsGettingLocation(false);
            resolve(location);
          } catch (error) {
            // Si falla el reverse geocoding, usar coordenadas con dirección genérica
            const location: Location = {
              address: 'Ubicación actual',
              lat: latitude,
              lng: longitude
            };

            setUserLocation(location);
            setIsGettingLocation(false);
            resolve(location);
          }
        },
        (error) => {
          setIsGettingLocation(false);
          let errorMessage = 'No se pudo obtener la ubicación actual. ';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Permiso de ubicación denegado. Por favor, habilita los permisos de ubicación en tu navegador.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Información de ubicación no disponible.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Tiempo de espera agotado para obtener la ubicación.';
              break;
            default:
              errorMessage += 'Error desconocido al obtener la ubicación.';
          }
          
          setLocationError(errorMessage);
          reject(new Error(errorMessage));
        },
        options
      );
    });
  }, []);

  // ✅ Reverse geocoding para obtener dirección desde coordenadas
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    if (!window.google) {
      return 'Ubicación actual';
    }

    try {
      const geocoder = new window.google.maps.Geocoder();
      
      return new Promise((resolve) => {
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            resolve(results[0].formatted_address);
          } else {
            resolve('Ubicación actual');
          }
        });
      });
    } catch (error) {
      return 'Ubicación actual';
    }
  };

  // ✅ Calcular ruta entre dos puntos
  const calculateRoute = useCallback(async (
    origin: Location,
    destination: Location,
    travelMode: TravelMode
  ): Promise<CalculatedRoute> => {
    if (!window.google?.maps?.DirectionsService) {
      throw new Error('Google Maps no está disponible');
    }

    const directionsService = new window.google.maps.DirectionsService();

    return new Promise((resolve, reject) => {
      const request = {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: window.google.maps.TravelMode[travelMode],
        provideRouteAlternatives: false
      };

      directionsService.route(request, (result, status) => {
        if (status === 'OK' && result?.routes[0]?.legs) {
          const legs = result.routes[0].legs;
          
          const segments: RouteSegment[] = legs.map((leg: any) => ({
            distance: leg.distance?.text || '0 km',
            duration: leg.duration?.text || '0 min',
            mode: travelMode,
            instructions: `De ${leg.start_address} a ${leg.end_address}`,
            distanceMeters: leg.distance?.value || 0,
            durationSeconds: leg.duration?.value || 0,
            startLocation: {
              address: leg.start_address,
              lat: leg.start_location.lat(),
              lng: leg.start_location.lng()
            },
            endLocation: {
              address: leg.end_address,
              lat: leg.end_location.lat(),
              lng: leg.end_location.lng()
            }
          }));

          const totalDistanceMeters = segments.reduce((sum, seg) => sum + seg.distanceMeters, 0);
          const totalDurationSeconds = segments.reduce((sum, seg) => sum + seg.durationSeconds, 0);

          resolve({
            segments,
            totalDistance: formatDistance(totalDistanceMeters),
            totalDuration: formatDuration(totalDurationSeconds),
            totalDistanceMeters,
            totalDurationSeconds
          });
        } else {
          reject(new Error(`Error calculando ruta: ${status}`));
        }
      });
    });
  }, []);

  // ✅ Calcular ruta compleja con múltiples segmentos
  const calculateComplexRoute = useCallback(async (
    segments: Array<{ origin: Location; destination: Location; mode: TravelMode }>
  ): Promise<CalculatedRoute> => {
    const allSegments: RouteSegment[] = [];
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;

    for (const segment of segments) {
      try {
        const route = await calculateRoute(segment.origin, segment.destination, segment.mode);
        allSegments.push(...route.segments);
        totalDistanceMeters += route.totalDistanceMeters;
        totalDurationSeconds += route.totalDurationSeconds;
      } catch (error) {
        console.error('Error en segmento:', error);
        throw error;
      }
    }

    return {
      segments: allSegments,
      totalDistance: formatDistance(totalDistanceMeters),
      totalDuration: formatDuration(totalDurationSeconds),
      totalDistanceMeters,
      totalDurationSeconds
    };
  }, [calculateRoute]);

  // ✅ Determinar el mejor tipo de ruta basado en la ubicación del usuario
  const determineOptimalRoute = useCallback((
    userLoc: Location | null,
    origin: Location,
    destination: Location,
    transportBase: Location
  ): RouteType => {
    if (!userLoc) {
      return 'via_transport'; // Ruta por defecto sin ubicación del usuario
    }

    // Calcular distancias aproximadas
    const distanceToOrigin = calculateDistance(userLoc, origin);
    const distanceToTransport = calculateDistance(userLoc, transportBase);
    const distanceToDestination = calculateDistance(userLoc, destination);

    // Lógica para determinar la mejor ruta
    if (distanceToOrigin < 5) { // Menos de 5km del origen
      return 'direct';
    } else if (distanceToTransport < 10) { // Menos de 10km de la terminal
      return 'via_transport';
    } else if (distanceToDestination < 15) { // Cerca del destino
      return 'current_to_direct';
    } else {
      return 'current_to_transport'; // Ruta desde ubicación actual
    }
  }, []);

  // ✅ Calcular distancia entre dos puntos (fórmula Haversine)
  const calculateDistance = (point1: Location, point2: Location): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // ✅ Formatear duración
  const formatDuration = (seconds: number): string => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.round((seconds % 3600) / 60);
      return `${hours} h ${minutes} min`;
    } else {
      return `${Math.round(seconds / 60)} min`;
    }
  };

  // ✅ Formatear distancia
  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    } else {
      return `${meters} m`;
    }
  };

  return {
    userLocation,
    isGettingLocation,
    locationError,
    getUserCurrentLocation,
    calculateRoute,
    calculateComplexRoute,
    determineOptimalRoute,
    formatDuration,
    formatDistance
  };
};