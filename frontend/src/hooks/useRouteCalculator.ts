// hooks/useRouteCalculator.ts - VERSIÓN COMPLETAMENTE CORREGIDA
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface Location {
  address: string;
  lat: number;
  lng: number;
}

export type TravelMode = 'DRIVING' | 'WALKING' | 'BICYCLING';
export type RouteType = 'via_transport_1' | 'via_transport_2' | 'current_to_direct' | 'current_to_transport';

export interface RouteSegment {
  distance: string;
  duration: string;
  mode: TravelMode;
  instructions: string;
  distanceMeters: number;
  durationSeconds: number;
  startLocation: Location;
  endLocation: Location;
}

export interface CalculatedRoute {
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
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);
  
  // ✅ CORREGIDO: toast se usa en las funciones que se exportan
  const { toast } = useToast();

  // ✅ Reverse geocoding para obtener dirección desde coordenadas
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    if (!window.google) {
      return 'Ubicación actual';
    }

    try {
      const geocoder = new window.google.maps.Geocoder();
      
      return new Promise((resolve) => {
        geocoder.geocode(
          { location: { lat, lng } }, 
          (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
            if (status === 'OK' && results && results[0]) {
              resolve(results[0].formatted_address);
            } else {
              resolve('Ubicación actual');
            }
          }
        );
      });
    } catch {
      return 'Ubicación actual';
    }
  }, []);

  // ✅ Verificar si ya tenemos permisos de ubicación
  const checkLocationPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.permissions) {
      return false;
    }
    
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return permissionStatus.state === 'granted';
    } catch {
      return false;
    }
  }, []);

  // ✅ Inicializar con permisos existentes
  const initializeLocationPermissions = useCallback(async () => {
    const hasPermission = await checkLocationPermission();
    setHasLocationPermission(hasPermission);
    return hasPermission;
  }, [checkLocationPermission]);

  // ✅ Obtener ubicación con manejo mejorado de permisos
  const getUserCurrentLocation = useCallback(async (): Promise<Location> => {
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
            setHasLocationPermission(true);
            setIsGettingLocation(false);
            resolve(location);
          } catch {
            // Si falla el reverse geocoding, usar coordenadas con dirección genérica
            const { latitude, longitude } = position.coords;
            const location: Location = {
              address: 'Ubicación actual',
              lat: latitude,
              lng: longitude
            };

            setUserLocation(location);
            setHasLocationPermission(true);
            setIsGettingLocation(false);
            resolve(location);
          }
        },
        (error: GeolocationPositionError) => {
          setIsGettingLocation(false);
          setHasLocationPermission(false);
          
          let errorMessage = 'No se pudo obtener la ubicación actual. ';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Permiso de ubicación denegado.';
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
  }, [reverseGeocode]);

  // ✅ Formatear duración
  const formatDuration = useCallback((seconds: number): string => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.round((seconds % 3600) / 60);
      return `${hours} h ${minutes} min`;
    } else {
      return `${Math.round(seconds / 60)} min`;
    }
  }, []);

  // ✅ Formatear distancia
  const formatDistance = useCallback((meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    } else {
      return `${Math.round(meters)} m`;
    }
  }, []);

  // ✅ Calcular distancia entre dos puntos (fórmula Haversine)
  const calculateDistance = useCallback((point1: Location, point2: Location): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Retornar en metros
  }, []);

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

      directionsService.route(
        request, 
        (result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
          if (status === 'OK' && result?.routes[0]?.legs) {
            const legs = result.routes[0].legs;
            
            const segments: RouteSegment[] = legs.map((leg: google.maps.DirectionsLeg) => ({
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
        }
      );
    });
  }, [formatDistance, formatDuration]);

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
  }, [calculateRoute, formatDistance, formatDuration]);

  // ✅ CORREGIDO: Manejar respuesta del diálogo de permisos CON toast
  const handlePermissionResponse = useCallback(async (granted: boolean) => {
    if (granted) {
      try {
        const location = await getUserCurrentLocation();
        setHasLocationPermission(true);
        
        // ✅ USAR toast aquí
        toast({
          title: 'Ubicación obtenida',
          description: 'Se ha obtenido tu ubicación actual correctamente',
          variant: 'default',
        });
        
        return location;
      } catch (error) {
        setHasLocationPermission(false);
        
        // ✅ USAR toast aquí también
        toast({
          title: 'Error de ubicación',
          description: 'No se pudo obtener la ubicación después de conceder permisos',
          variant: 'destructive',
        });
        
        throw error;
      }
    } else {
      setHasLocationPermission(false);
      
      // ✅ USAR toast aquí también
      toast({
        title: 'Permisos denegados',
        description: 'Usando rutas desde puntos fijos',
        variant: 'default',
      });
      
      throw new Error('Permiso de ubicación denegado por el usuario');
    }
  }, [getUserCurrentLocation, toast]);

  // ✅ CORREGIDO: Determinar ruta óptima mejorada - SIN ERRORES DE TIPO
// ✅ ACTUALIZAR determineOptimalRoute para usar las nuevas rutas
const determineOptimalRoute = useCallback((
  userLoc: Location | null,
  origin: Location,
  destination: Location,
  transportBase: Location,
  hasPermission: boolean
): RouteType => {
  // Si no tenemos permisos o no hay ubicación del usuario, usar ruta por defecto
  if (!hasPermission || !userLoc) {
    return 'via_transport_1'; // Ruta por defecto sin ubicación del usuario
  }

  // Calcular distancias aproximadas
  const distanceToOrigin = calculateDistance(userLoc, origin);
  const distanceToTransport = calculateDistance(userLoc, transportBase);
  const distanceToDestination = calculateDistance(userLoc, destination);

  // Lógica mejorada para determinar la mejor ruta
  if (distanceToTransport < 2000) { // Menos de 2km de la terminal
    return 'via_transport_1';
  } else if (distanceToOrigin < 1000) { // Menos de 1km del origen
    return 'via_transport_1'; // ✅ Cambiar a terminal principal
  } else if (distanceToDestination < 5000) { // Menos de 5km del destino
    return 'current_to_direct';
  } else if (distanceToTransport < 10000) { // Menos de 10km de la terminal
    return 'current_to_transport';
  } else {
    // Si está lejos de todo, usar la opción más conveniente
    const distances: Record<RouteType, number> = {
      'via_transport_1': distanceToTransport,
      'via_transport_2': distanceToTransport + 500, // ✅ Dar preferencia a terminal 1
      'current_to_direct': distanceToDestination,
      'current_to_transport': distanceToTransport
    };
    
    const bestRoute = Object.entries(distances).reduce((best, [route, distance]) => {
      return distance < distances[best] ? route as RouteType : best;
    }, 'via_transport_1' as RouteType);
    
    return bestRoute;
  }
}, [calculateDistance]);

  // ✅ CORREGIDO: Función para verificar si se debe recalcular la ruta
  const shouldRecalculateRoute = useCallback((
    currentRouteType: RouteType,
    currentTravelMode: TravelMode,
    currentUserLocation: Location | null,
    lastCalculation: { routeType: RouteType; travelMode: TravelMode } | null,
    lastUserLocation: Location | null
  ): boolean => {
    if (!lastCalculation) return true;
    
    // Recalcular si cambió el tipo de ruta
    if (lastCalculation.routeType !== currentRouteType) return true;
    
    // Recalcular si cambió el modo de transporte
    if (lastCalculation.travelMode !== currentTravelMode) return true;
    
    // Recalcular si la ubicación del usuario cambió significativamente
    if (currentUserLocation && lastUserLocation) {
      const distance = calculateDistance(currentUserLocation, lastUserLocation);
      if (distance > 100) return true; // Más de 100 metros de diferencia
    }
    
    return false;
  }, [calculateDistance]);

  // ✅ CORREGIDO: Función adicional para mostrar errores con toast
  const showLocationError = useCallback((error: string) => {
    toast({
      title: 'Error de ubicación',
      description: error,
      variant: 'destructive',
    });
  }, [toast]);

  return {
    userLocation,
    isGettingLocation,
    locationError,
    hasLocationPermission,
    handlePermissionResponse,
    getUserCurrentLocation,
    calculateRoute,
    calculateComplexRoute,
    determineOptimalRoute,
    initializeLocationPermissions,
    formatDuration,
    shouldRecalculateRoute,
    formatDistance,
    showLocationError // ✅ NUEVA función que usa toast
  };
};