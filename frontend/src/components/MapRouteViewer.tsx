// components/MapRouteViewer.tsx - VERSIÓN COMPLETAMENTE MEJORADA
import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { MapPin, Navigation, Car, Bike, RotateCw, Layers, Clock, Route, User, Building, Satellite, Locate } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRouteCalculator } from '@/hooks/useRouteCalculator';

interface Location {
  address: string;
  lat: number;
  lng: number;
}

interface MapRouteViewerProps {
  origin: Location;
  destination: Location;
  buttonText?: string;
  className?: string;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

type TravelMode = 'DRIVING' | 'WALKING' | 'BICYCLING';
type MapType = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
type RouteType = 'direct' | 'via_transport' | 'current_to_direct' | 'current_to_transport';

interface RouteInfo {
  distance: string;
  duration: string;
  startAddress: string;
  endAddress: string;
  steps: any[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
}

interface RouteSegment {
  distance: string;
  duration: string;
  mode: TravelMode;
  instructions: string;
  distanceMeters: number;
  durationSeconds: number;
  startLocation?: Location;
  endLocation?: Location;
}

export const MapRouteViewer: React.FC<MapRouteViewerProps> = ({
  origin,
  destination,
  buttonText = "Ver Ruta",
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [travelMode, setTravelMode] = useState<TravelMode>('DRIVING');
  const [routeType, setRouteType] = useState<RouteType>('direct');
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentMapType, setCurrentMapType] = useState<MapType>('hybrid');
  const [showRoute, setShowRoute] = useState(true);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout>();
  const markersRef = useRef<any[]>([]);

  const { toast } = useToast();
  const {
    userLocation,
    isGettingLocation,
    locationError,
    getUserCurrentLocation,
    calculateRoute,
    calculateComplexRoute,
    determineOptimalRoute,
    formatDuration,
    formatDistance
  } = useRouteCalculator();

  const TRANSPORT_BASE: Location = {
    address: "Terminal de Autobuses Zacapoaxtla, Carretera Federal Teziutlán-Zacapoaxtla, Zacapoaxtla, Puebla",
    lat: 19.8758703351958,
    lng: -97.5889138590976
  };

  // ✅ Determinar automáticamente el mejor tipo de ruta cuando se abre el diálogo
  useEffect(() => {
    if (isOpen) {
      const optimalRoute = determineOptimalRoute(userLocation, origin, destination, TRANSPORT_BASE);
      setRouteType(optimalRoute);
    }
  }, [isOpen, userLocation, origin, destination, determineOptimalRoute]);

  // ✅ Obtener ubicación del usuario
  const handleGetUserLocation = async () => {
    try {
      await getUserCurrentLocation();
      toast({
        title: 'Ubicación obtenida',
        description: 'Se ha obtenido tu ubicación actual correctamente',
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Error de ubicación',
        description: locationError || 'No se pudo obtener la ubicación',
        variant: 'destructive',
      });
    }
  };

  const cleanupMap = useCallback(() => {
    try {
      markersRef.current.forEach(marker => {
        if (marker) marker.setMap(null);
      });
      markersRef.current = [];

      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }

      if (directionsServiceRef.current) {
        directionsServiceRef.current = null;
      }

      if (mapInstanceRef.current) {
        if (window.google?.maps?.event) {
          window.google.maps.event.clearInstanceListeners(mapInstanceRef.current);
        }
        mapInstanceRef.current = null;
      }

      setRouteInfo(null);
      setRouteSegments([]);
    } catch (error) {
      console.warn('Error durante la limpieza del mapa:', error);
    }
  }, []);

  const loadMap = useCallback(() => {
    cleanupMap();
    
    setIsLoading(true);
    setMapError(null);

    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setTimeout(() => initializeMap(), 100);
      };
      script.onerror = () => {
        setMapError('Error al cargar Google Maps. Verifica tu API key.');
        setIsLoading(false);
        toast({
          title: 'Error',
          description: 'No se pudo cargar Google Maps',
          variant: 'destructive',
        });
      };
      document.head.appendChild(script);
    } else {
      setTimeout(() => initializeMap(), 100);
    }
  }, [cleanupMap, toast]);

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google) {
      setMapError('Google Maps no se pudo inicializar correctamente.');
      setIsLoading(false);
      return;
    }

    try {
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }

      // ✅ Puntos a incluir en el mapa basados en el tipo de ruta
      const points = [origin, destination];
      if (routeType === 'via_transport' || routeType === 'current_to_transport') {
        points.push(TRANSPORT_BASE);
      }
      if ((routeType === 'current_to_direct' || routeType === 'current_to_transport') && userLocation) {
        points.push(userLocation);
      }

      const bounds = new window.google.maps.LatLngBounds();
      points.forEach(point => {
        bounds.extend(new window.google.maps.LatLng(point.lat, point.lng));
      });

      const newMap = new window.google.maps.Map(mapRef.current, {
        center: bounds.getCenter(),
        zoom: 12,
        mapTypeId: currentMapType,
        streetViewControl: true,
        streetViewControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_TOP
        },
        fullscreenControl: true,
        fullscreenControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_TOP
        },
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_CENTER
        },
        mapTypeControl: true,
        mapTypeControlOptions: {
          position: window.google.maps.ControlPosition.TOP_LEFT,
          style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU
        },
        styles: currentMapType === 'satellite' || currentMapType === 'hybrid' ? [
          {
            "elementType": "labels",
            "stylers": [{ "visibility": "on" }]
          },
          {
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#ffffff" }, { "weight": 1 }]
          },
          {
            "elementType": "labels.text.stroke",
            "stylers": [{ "color": "#000000" }, { "weight": 2 }]
          }
        ] : [
          {
            featureType: 'all',
            elementType: 'geometry',
            stylers: [{ color: '#f8fafc' }]
          },
          {
            featureType: 'all',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#64748b' }]
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#e0f2fe' }]
          },
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#f1f5f9' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#cbd5e1' }]
          }
        ]
      });

      mapInstanceRef.current = newMap;
      newMap.fitBounds(bounds);

      const newDirectionsService = new window.google.maps.DirectionsService();
      const newDirectionsRenderer = new window.google.maps.DirectionsRenderer({
        map: showRoute ? newMap : null,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#3b82f6',
          strokeOpacity: 0.8,
          strokeWeight: 6
        },
        preserveViewport: false
      });

      directionsServiceRef.current = newDirectionsService;
      directionsRendererRef.current = newDirectionsRenderer;

      addCustomMarkers(newMap);
      calculateOptimalRoute();

      newMap.addListener('maptypeid_changed', () => {
        const newMapType = newMap.getMapTypeId();
        setCurrentMapType(newMapType);
        
        if (newMapType === 'satellite' || newMapType === 'hybrid') {
          newMap.setOptions({
            styles: [
              {
                "elementType": "labels",
                "stylers": [{ "visibility": "on" }]
              },
              {
                "elementType": "labels.text.fill",
                "stylers": [{ "color": "#ffffff" }]
              },
              {
                "elementType": "labels.text.stroke",
                "stylers": [{ "color": "#000000" }, { "weight": 2 }]
              }
            ]
          });
        }
      });

      setIsLoading(false);

    } catch (error) {
      const errorMessage = 'Error al inicializar el mapa: ' + error;
      setMapError(errorMessage);
      setIsLoading(false);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [origin, destination, routeType, showRoute, toast, currentMapType, userLocation]);

  // ✅ Efecto mejorado para recalcular rutas
  useEffect(() => {
    if (isOpen) {
      loadMap();
    } else {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
      cleanupTimeoutRef.current = setTimeout(() => {
        cleanupMap();
      }, 100);
    }

    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
      cleanupMap();
    };
  }, [isOpen, loadMap, cleanupMap]);

  // ✅ Recalcular ruta cuando cambian parámetros importantes
  useEffect(() => {
    if (isOpen && directionsServiceRef.current && mapInstanceRef.current) {
      console.log('🔄 Recalculando ruta por cambio de:', { travelMode, routeType });
      calculateOptimalRoute();
    }
  }, [travelMode, routeType, isOpen]);

  useEffect(() => {
    if (directionsRendererRef.current && mapInstanceRef.current) {
      directionsRendererRef.current.setMap(showRoute ? mapInstanceRef.current : null);
    }
  }, [showRoute]);

  const reloadMap = () => {
    loadMap();
  };

  const changeMapType = (mapType: MapType) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(mapType);
      setCurrentMapType(mapType);
    }
  };

  // ✅ Función mejorada para cambiar modo de transporte
  const changeTravelMode = (mode: TravelMode) => {
    console.log('🚗 Cambiando modo de transporte a:', mode);
    setTravelMode(mode);
  };

  // ✅ Función mejorada para cambiar tipo de ruta
  const changeRouteType = (type: RouteType) => {
    console.log('🛣️ Cambiando tipo de ruta a:', type);
    setRouteType(type);
  };

  const toggleRouteVisibility = (visible: boolean) => {
    setShowRoute(visible);
  };

  const addCustomMarkers = (mapInstance: any) => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // ✅ Marcador de origen (diferente si es ubicación actual)
    const originMarker = new window.google.maps.Marker({
      position: { 
        lat: (routeType === 'current_to_direct' || routeType === 'current_to_transport') && userLocation 
          ? userLocation.lat 
          : origin.lat, 
        lng: (routeType === 'current_to_direct' || routeType === 'current_to_transport') && userLocation 
          ? userLocation.lng 
          : origin.lng 
      },
      map: mapInstance,
      title: (routeType === 'current_to_direct' || routeType === 'current_to_transport') && userLocation 
        ? 'Tu ubicación actual' 
        : 'Origen: ' + origin.address,
      icon: {
        url: 'data:image/svg+xml;base64,' + btoa(`
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C10.48 0 6 4.48 6 10C6 17.08 16 40 16 40C16 40 26 17.08 26 10C26 4.48 21.52 0 16 0Z" fill="${(routeType === 'current_to_direct' || routeType === 'current_to_transport') && userLocation ? '#3b82f6' : '#10b981'}"/>
            <circle cx="16" cy="10" r="5" fill="white"/>
            <circle cx="16" cy="10" r="3" fill="${(routeType === 'current_to_direct' || routeType === 'current_to_transport') && userLocation ? '#3b82f6' : '#10b981'}"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(32, 40),
        anchor: new window.google.maps.Point(16, 40)
      }
    });
    markersRef.current.push(originMarker);

    // ✅ Marcador de destino
    const destinationMarker = new window.google.maps.Marker({
      position: { lat: destination.lat, lng: destination.lng },
      map: mapInstance,
      title: 'Destino: ' + destination.address,
      icon: {
        url: 'data:image/svg+xml;base64,' + btoa(`
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C10.48 0 6 4.48 6 10C6 17.08 16 40 16 40C16 40 26 17.08 26 10C26 4.48 21.52 0 16 0Z" fill="#ef4444"/>
            <circle cx="16" cy="10" r="5" fill="white"/>
            <circle cx="16" cy="10" r="3" fill="#ef4444"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(32, 40),
        anchor: new window.google.maps.Point(16, 40)
      }
    });
    markersRef.current.push(destinationMarker);

    // ✅ Marcador de terminal de transporte si aplica
    if (routeType === 'via_transport' || routeType === 'current_to_transport') {
      const transportMarker = new window.google.maps.Marker({
        position: { lat: TRANSPORT_BASE.lat, lng: TRANSPORT_BASE.lng },
        map: mapInstance,
        title: 'Terminal de Transporte Zacapoaxtla',
        icon: {
          url: 'data:image/svg+xml;base64,' + btoa(`
            <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="8" width="20" height="20" rx="2" fill="#8b5cf6"/>
              <circle cx="10" cy="22" r="2" fill="white"/>
              <circle cx="18" cy="22" r="2" fill="white"/>
              <path d="M4 18L4 12L20 12L20 18" fill="#a78bfa"/>
              <rect x="2" y="28" width="24" height="4" rx="1" fill="#8b5cf6"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(28, 36),
          anchor: new window.google.maps.Point(14, 36)
        }
      });
      markersRef.current.push(transportMarker);
    }
  };

  // ✅ FUNCIÓN PRINCIPAL MEJORADA: Calcular ruta óptima
  const calculateOptimalRoute = async () => {
    if (!window.google) {
      setMapError('Google Maps no está disponible');
      return;
    }

    setIsLoading(true);
    setRouteInfo(null);
    setRouteSegments([]);

    try {
      let calculatedRoute;

      switch (routeType) {
        case 'direct':
          // Ruta directa desde el origen al destino
          calculatedRoute = await calculateRoute(origin, destination, travelMode);
          break;

        case 'via_transport':
          // Ruta: Origen → Terminal → Destino
          calculatedRoute = await calculateComplexRoute([
            { origin, destination: TRANSPORT_BASE, mode: travelMode },
            { origin: TRANSPORT_BASE, destination: destination, mode: travelMode }
          ]);
          break;

        case 'current_to_direct':
          // Ruta: Ubicación actual → Destino
          if (!userLocation) {
            await handleGetUserLocation();
            if (!userLocation) throw new Error('Se requiere ubicación del usuario');
          }
          calculatedRoute = await calculateRoute(userLocation!, destination, travelMode);
          break;

        case 'current_to_transport':
          // Ruta: Ubicación actual → Terminal → Destino
          if (!userLocation) {
            await handleGetUserLocation();
            if (!userLocation) throw new Error('Se requiere ubicación del usuario');
          }
          calculatedRoute = await calculateComplexRoute([
            { origin: userLocation!, destination: TRANSPORT_BASE, mode: travelMode },
            { origin: TRANSPORT_BASE, destination: destination, mode: travelMode }
          ]);
          break;

        default:
          throw new Error('Tipo de ruta no válido');
      }

      processRouteResult(calculatedRoute);
      
    } catch (error) {
      console.error('Error calculando ruta:', error);
      handleRouteError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Procesar resultados de la ruta
  const processRouteResult = (calculatedRoute: any) => {
    const routeInfoData: RouteInfo = {
      distance: calculatedRoute.totalDistance,
      duration: calculatedRoute.totalDuration,
      startAddress: calculatedRoute.segments[0]?.startLocation?.address || origin.address,
      endAddress: calculatedRoute.segments[calculatedRoute.segments.length - 1]?.endLocation?.address || destination.address,
      steps: calculatedRoute.segments,
      totalDistanceMeters: calculatedRoute.totalDistanceMeters,
      totalDurationSeconds: calculatedRoute.totalDurationSeconds
    };

    setRouteSegments(calculatedRoute.segments);
    setRouteInfo(routeInfoData);

    // Renderizar la ruta en el mapa
    renderRouteOnMap(calculatedRoute.segments);
  };

  // ✅ Renderizar ruta en el mapa
  const renderRouteOnMap = (segments: RouteSegment[]) => {
    if (!mapInstanceRef.current || !window.google || !directionsRendererRef.current) return;

    // Para múltiples segmentos, renderizar cada uno
    segments.forEach((segment, index) => {
      if (segment.startLocation && segment.endLocation) {
        const directionsService = new window.google.maps.DirectionsService();
        
        directionsService.route({
          origin: segment.startLocation,
          destination: segment.endLocation,
          travelMode: window.google.maps.TravelMode[segment.mode]
        }, (result, status) => {
          if (status === 'OK' && directionsRendererRef.current) {
            directionsRendererRef.current.setDirections(result);
          }
        });
      }
    });

    // Ajustar vista del mapa
    const bounds = new window.google.maps.LatLngBounds();
    segments.forEach(segment => {
      if (segment.startLocation) {
        bounds.extend(new window.google.maps.LatLng(segment.startLocation.lat, segment.startLocation.lng));
      }
      if (segment.endLocation) {
        bounds.extend(new window.google.maps.LatLng(segment.endLocation.lat, segment.endLocation.lng));
      }
    });
    
    if (bounds.isEmpty()) {
      // Fallback: usar puntos conocidos
      bounds.extend(new window.google.maps.LatLng(origin.lat, origin.lng));
      bounds.extend(new window.google.maps.LatLng(destination.lat, destination.lng));
      if (routeType === 'via_transport' || routeType === 'current_to_transport') {
        bounds.extend(new window.google.maps.LatLng(TRANSPORT_BASE.lat, TRANSPORT_BASE.lng));
      }
      if (userLocation && (routeType === 'current_to_direct' || routeType === 'current_to_transport')) {
        bounds.extend(new window.google.maps.LatLng(userLocation.lat, userLocation.lng));
      }
    }
    
    mapInstanceRef.current.fitBounds(bounds);
  };

  // ✅ Manejar errores de ruta
  const handleRouteError = (error: string) => {
    console.error('Error calculando la ruta:', error);
    setIsLoading(false);
    setRouteInfo(null);
    setRouteSegments([]);
    
    let errorMessage = 'No se pudo calcular la ruta. ';
    
    if (error.includes('ubicación') || error.includes('permisos')) {
      errorMessage += 'Se requiere acceso a tu ubicación. Por favor, habilita los permisos de ubicación.';
    } else if (error.includes('ZERO_RESULTS')) {
      errorMessage += 'No se encontró una ruta para los puntos y modo de transporte seleccionados.';
    } else {
      errorMessage += error;
    }
    
    toast({
      title: 'Error en cálculo de ruta',
      description: errorMessage,
      variant: 'destructive',
    });
  };

  // ✅ Obtener URL para Google Maps externo
  const getGoogleMapsUrl = () => {
    const baseUrl = 'https://www.google.com/maps/dir/';
    
    switch (routeType) {
      case 'direct':
        return `${baseUrl}${origin.lat},${origin.lng}/${destination.lat},${destination.lng}`;
      
      case 'via_transport':
        return `${baseUrl}${origin.lat},${origin.lng}/${TRANSPORT_BASE.lat},${TRANSPORT_BASE.lng}/${destination.lat},${destination.lng}`;
      
      case 'current_to_direct':
        if (userLocation) {
          return `${baseUrl}${userLocation.lat},${userLocation.lng}/${destination.lat},${destination.lng}`;
        }
        return `${baseUrl}${origin.lat},${origin.lng}/${destination.lat},${destination.lng}`;
      
      case 'current_to_transport':
        if (userLocation) {
          return `${baseUrl}${userLocation.lat},${userLocation.lng}/${TRANSPORT_BASE.lat},${TRANSPORT_BASE.lng}/${destination.lat},${destination.lng}`;
        }
        return `${baseUrl}${origin.lat},${origin.lng}/${TRANSPORT_BASE.lat},${TRANSPORT_BASE.lng}/${destination.lat},${destination.lng}`;
      
      default:
        return `${baseUrl}${origin.lat},${origin.lng}/${destination.lat},${destination.lng}`;
    }
  };

  // ✅ Obtener descripción del tipo de ruta
  const getRouteTypeDescription = () => {
    switch (routeType) {
      case 'direct': return 'directa';
      case 'via_transport': return 'vía terminal';
      case 'current_to_direct': return 'desde tu ubicación';
      case 'current_to_transport': return 'desde tu ubicación vía terminal';
      default: return 'directa';
    }
  };

  // ✅ Obtener ubicación de origen actual
  const getCurrentOrigin = () => {
    if ((routeType === 'current_to_direct' || routeType === 'current_to_transport') && userLocation) {
      return userLocation;
    }
    return origin;
  };

  const getMapTypeButtonVariant = (mapType: MapType) => {
    return currentMapType === mapType ? "default" : "outline";
  };

  const getMapTypeIcon = (mapType: MapType) => {
    switch (mapType) {
      case 'satellite': return <Satellite className="h-4 w-4" />;
      case 'hybrid': return <Layers className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const getMapTypeLabel = (mapType: MapType) => {
    switch (mapType) {
      case 'roadmap': return 'Mapa';
      case 'satellite': return 'Satélite';
      case 'hybrid': return 'Híbrido';
      case 'terrain': return 'Terreno';
      default: return 'Mapa';
    }
  };

  const getTravelModeIcon = (mode: TravelMode) => {
    switch (mode) {
      case 'DRIVING': return <Car className="h-4 w-4" />;
      case 'WALKING': return <User className="h-4 w-4" />;
      case 'BICYCLING': return <Bike className="h-4 w-4" />;
      default: return <Car className="h-4 w-4" />;
    }
  };

  const getTravelModeLabel = (mode: TravelMode) => {
    switch (mode) {
      case 'DRIVING': return 'Auto';
      case 'WALKING': return 'Caminando';
      case 'BICYCLING': return 'Bicicleta';
      default: return 'Auto';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          type="button" 
          variant="outline"
          className={cn("gap-2 border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800", className)}
        >
          <Route className="h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-7xl h-[95vh] flex flex-col bg-gradient-to-br from-green-50/80 to-blue-100/80 backdrop-blur-sm border border-green-200/50 shadow-2xl rounded-2xl">
        <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-green-200/30">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            🗺️ Cómo Llegar - Indicaciones de Ruta
          </DialogTitle>
          <div className="flex gap-2">
            {/* Botón para obtener ubicación actual */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGetUserLocation}
              disabled={isGettingLocation}
              className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              <Locate className={`h-4 w-4 ${isGettingLocation ? 'animate-pulse' : ''}`} />
              {isGettingLocation ? 'Obteniendo...' : 'Mi Ubicación'}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={reloadMap}
              className="gap-2 border-green-200 text-green-700 hover:bg-green-100"
              disabled={isLoading}
            >
              <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Recargar
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Panel lateral de información MEJORADO */}
          <div className="w-96 flex flex-col gap-4 overflow-y-auto">
            {/* Selector de tipo de ruta MEJORADO */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-200/50">
              <Label className="text-sm font-medium text-blue-800 mb-3 block">
                Tipo de Ruta:
              </Label>
              <RadioGroup 
                value={routeType} 
                onValueChange={(value: RouteType) => changeRouteType(value)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="direct" id="direct" />
                  <Label htmlFor="direct" className="flex items-center gap-2 cursor-pointer">
                    <Navigation className="h-4 w-4" />
                    Ruta Directa
                    <Badge variant="outline" className="ml-2 text-xs">
                      Desde origen
                    </Badge>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="via_transport" id="via_transport" />
                  <Label htmlFor="via_transport" className="flex items-center gap-2 cursor-pointer">
                    <Building className="h-4 w-4" />
                    Vía Terminal de Transporte
                    <Badge variant="outline" className="ml-2 text-xs">
                      Recomendado
                    </Badge>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value="current_to_direct" 
                    id="current_to_direct" 
                  />
                  <Label htmlFor="current_to_direct" className="flex items-center gap-2 cursor-pointer">
                    <Locate className="h-4 w-4" />
                    Desde mi ubicación
                    {!userLocation && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Requiere permisos
                      </Badge>
                    )}
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value="current_to_transport" 
                    id="current_to_transport" 
                  />
                  <Label htmlFor="current_to_transport" className="flex items-center gap-2 cursor-pointer">
                    <Locate className="h-4 w-4" />
                    Mi ubicación → Terminal
                    {!userLocation && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Requiere permisos
                      </Badge>
                    )}
                  </Label>
                </div>
              </RadioGroup>

              {/* Información de ubicación del usuario */}
              {userLocation && (
                <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700 flex items-center gap-1">
                    <Locate className="h-3 w-3" />
                    📍 Usando tu ubicación actual
                  </p>
                </div>
              )}
            </div>

            {/* Información de ubicaciones MEJORADO */}
            <div className="space-y-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-green-200/50">
                <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {((routeType === 'current_to_direct' || routeType === 'current_to_transport') && userLocation) 
                    ? 'Tu Ubicación Actual' 
                    : 'Origen'
                  }
                </h3>
                <p className="text-sm text-green-700">
                  {((routeType === 'current_to_direct' || routeType === 'current_to_transport') && userLocation) 
                    ? (userLocation.address || 'Ubicación detectada') 
                    : origin.address
                  }
                </p>
                {((routeType === 'current_to_direct' || routeType === 'current_to_transport') && userLocation) && (
                  <p className="text-xs text-green-600 mt-1">
                    Ubicación obtenida mediante GPS
                  </p>
                )}
              </div>
              
              {(routeType === 'via_transport' || routeType === 'current_to_transport') && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-purple-200/50">
                  <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Terminal de Transporte
                  </h3>
                  <p className="text-sm text-purple-700">{TRANSPORT_BASE.address}</p>
                  <p className="text-xs text-purple-600 mt-1">
                    Punto de partida recomendado desde Zacapoaxtla
                  </p>
                </div>
              )}
              
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-red-200/50">
                <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Destino
                </h3>
                <p className="text-sm text-red-700">{destination.address}</p>
              </div>
            </div>

            {/* Información de ruta */}
            {routeInfo && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-200/50">
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <Route className="h-4 w-4" />
                  Información de Ruta
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700">Distancia total:</span>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      {routeInfo.distance}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700">Duración total:</span>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      <Clock className="h-3 w-3 mr-1" />
                      {routeInfo.duration}
                    </Badge>
                  </div>
                </div>

                {/* Segmentos de ruta */}
                {routeSegments.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium text-blue-800 mb-2 block">
                      Segmentos de la ruta:
                    </Label>
                    <div className="space-y-2">
                      {routeSegments.map((segment, index) => (
                        <div key={index} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                          <div className="flex-1">
                            <span className="font-medium block">Etapa {index + 1}</span>
                            <div className="text-gray-600 text-xs mt-1">
                              {segment.instructions}
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                              {segment.distance} • {segment.duration}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs ml-2">
                            {getTravelModeLabel(segment.mode)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modos de transporte */}
                <div className="mt-4">
                  <Label className="text-sm font-medium text-blue-800 mb-2 block">
                    Modo de transporte:
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {(['DRIVING', 'WALKING', 'BICYCLING'] as TravelMode[]).map((mode) => (
                      <Button
                        key={mode}
                        size="sm"
                        variant={travelMode === mode ? "default" : "outline"}
                        onClick={() => changeTravelMode(mode)}
                        className={cn(
                          "gap-2 flex-1 min-w-[80px]",
                          travelMode === mode 
                            ? "bg-blue-600 text-white" 
                            : "border-blue-200 text-blue-700 hover:bg-blue-50"
                        )}
                      >
                        {getTravelModeIcon(mode)}
                        {getTravelModeLabel(mode)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <Label htmlFor="show-route" className="text-sm font-medium text-blue-800">
                    Mostrar ruta en el mapa:
                  </Label>
                  <Switch
                    id="show-route"
                    checked={showRoute}
                    onCheckedChange={toggleRouteVisibility}
                  />
                </div>
              </div>
            )}

            {/* Leyenda MEJORADA */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50">
              <h3 className="font-semibold text-gray-800 mb-3">Leyenda</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    (routeType === 'current_to_direct' || routeType === 'current_to_transport') && userLocation 
                      ? 'bg-blue-500' 
                      : 'bg-green-500'
                  }`}></div>
                  <span className="text-gray-700">
                    {(routeType === 'current_to_direct' || routeType === 'current_to_transport') && userLocation 
                      ? 'Tu ubicación' 
                      : 'Origen'
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-700">Destino</span>
                </div>
                {(routeType === 'via_transport' || routeType === 'current_to_transport') && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-700">Terminal Transporte</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700">Ruta</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mapa y controles */}
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="flex gap-2 flex-wrap items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {(['roadmap', 'satellite', 'hybrid', 'terrain'] as MapType[]).map((mapType) => (
                  <Button
                    key={mapType}
                    variant={getMapTypeButtonVariant(mapType)}
                    size="sm"
                    onClick={() => changeMapType(mapType)}
                    className="gap-2 border-green-200 text-green-700 hover:bg-green-100"
                  >
                    {getMapTypeIcon(mapType)}
                    {getMapTypeLabel(mapType)}
                  </Button>
                ))}
              </div>
              
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                {getMapTypeLabel(currentMapType)}
              </Badge>
            </div>

            <div className="flex-1 relative rounded-xl overflow-hidden border-2 border-green-200/50 bg-white min-h-0">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-50/50 z-10">
                  <div className="flex flex-col items-center gap-3">
                    <RotateCw className="h-8 w-8 text-green-600 animate-spin" />
                    <p className="text-green-700 font-medium">
                      {routeType.includes('current') ? 'Calculando ruta desde tu ubicación...' : 'Calculando ruta...'}
                    </p>
                  </div>
                </div>
              )}
              
              {mapError && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50/80 z-10">
                  <div className="text-center p-6">
                    <p className="text-red-600 font-medium mb-2">Error al cargar el mapa</p>
                    <p className="text-red-500 text-sm mb-4">{mapError}</p>
                    <Button 
                      onClick={reloadMap}
                      className="gap-2 bg-red-600 hover:bg-red-700"
                    >
                      <RotateCw className="h-4 w-4" />
                      Reintentar
                    </Button>
                  </div>
                </div>
              )}
              
              <div 
                ref={mapRef} 
                className="w-full h-full" 
                style={{ minHeight: '400px' }}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-green-200/30">
          <div className="text-sm text-green-600">
            {routeInfo ? (
              <span className="flex items-center gap-2">
                <Route className="h-4 w-4 text-green-600" />
                Ruta {getRouteTypeDescription()} • 
                {routeInfo.distance} • {routeInfo.duration} • {getTravelModeLabel(travelMode)}
                {userLocation && (routeType === 'current_to_direct' || routeType === 'current_to_transport') && (
                  <Badge variant="outline" className="ml-2 text-xs bg-blue-100 text-blue-800">
                    Desde tu ubicación
                  </Badge>
                )}
              </span>
            ) : isLoading ? (
              <span>🔄 Calculando ruta{routeType.includes('current') ? ' desde tu ubicación' : ''}...</span>
            ) : (
              <span>👆 Selecciona opciones y calcula la ruta...</span>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="border-green-200 text-green-700 hover:bg-green-50"
            >
              Cerrar
            </Button>
            <Button 
              onClick={() => {
                window.open(getGoogleMapsUrl(), '_blank');
              }}
              className="gap-2 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white shadow-lg"
              disabled={!routeInfo}
            >
              <Navigation className="h-4 w-4" />
              Abrir en Google Maps
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};