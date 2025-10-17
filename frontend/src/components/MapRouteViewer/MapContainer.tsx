// components/MapRouteViewer/MapContainer.tsx
import { forwardRef, useEffect, useRef, useCallback, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCw } from 'lucide-react';
import type { MapContainerProps } from './types';

const getMapStyles = (mapType: string): google.maps.MapTypeStyle[] => {
  if (mapType === 'satellite' || mapType === 'hybrid') {
    return [
      { "elementType": "labels", "stylers": [{ "visibility": "on" }] },
      { "elementType": "labels.text.fill", "stylers": [{ "color": "#ffffff" }, { "weight": 1 }] },
      { "elementType": "labels.text.stroke", "stylers": [{ "color": "#000000" }, { "weight": 2 }] }
    ];
  }
  
  return [
    { featureType: 'all', elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
    { featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e0f2fe' }] },
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'on' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#f1f5f9' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#cbd5e1' }] }
  ];
};

export const MapContainer = forwardRef<HTMLDivElement, MapContainerProps>(({
  origin,
  destination,
  routeType,
  currentMapType,
  showRoute,
  userLocation,
  routeSegments,
  isLoading,
  mapError,
  onMapInitialized,
  onMapError,
  onReload
}, ref) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const isInitializedRef = useRef(false);

  useImperativeHandle(ref, () => mapRef.current!);

  // Función para limpiar marcadores
  const cleanupMarkers = useCallback(() => {
    markersRef.current.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    markersRef.current = [];
  }, []);

  // Función para agregar marcadores personalizados
  // ✅ ACTUALIZAR addCustomMarkers PARA MOSTRAR LA TERMINAL CORRECTA
  const addCustomMarkers = useCallback((mapInstance: google.maps.Map) => {
    if (!mapInstance || !window.google) return;

    try {
      cleanupMarkers();

      // Determinar posición de origen
      const useUserLocation = (routeType === 'current_to_direct' || routeType === 'current_to_transport') && userLocation;
      const originPosition = useUserLocation 
        ? { lat: userLocation.lat, lng: userLocation.lng }
        : { lat: origin.lat, lng: origin.lng };

      const originTitle = useUserLocation 
        ? 'Tu ubicación actual' 
        : `Origen: ${origin.address}`;

      const originColor = useUserLocation ? '#3b82f6' : '#10b981';

      // Marcador de origen
      const originMarker = new window.google.maps.Marker({
        position: originPosition,
        map: mapInstance,
        title: originTitle,
        icon: {
          url: `data:image/svg+xml;base64,${btoa(`
            <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C10.48 0 6 4.48 6 10C6 17.08 16 40 16 40C16 40 26 17.08 26 10C26 4.48 21.52 0 16 0Z" fill="${originColor}"/>
              <circle cx="16" cy="10" r="5" fill="white"/>
              <circle cx="16" cy="10" r="3" fill="${originColor}"/>
            </svg>
          `)}`,
          scaledSize: new window.google.maps.Size(32, 40),
          anchor: new window.google.maps.Point(16, 40)
        }
      });
      markersRef.current.push(originMarker);

      // Marcador de destino
      const destinationMarker = new window.google.maps.Marker({
        position: { lat: destination.lat, lng: destination.lng },
        map: mapInstance,
        title: `Destino: ${destination.address}`,
        icon: {
          url: `data:image/svg+xml;base64,${btoa(`
            <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C10.48 0 6 4.48 6 10C6 17.08 16 40 16 40C16 40 26 17.08 26 10C26 4.48 21.52 0 16 0Z" fill="#ef4444"/>
              <circle cx="16" cy="10" r="5" fill="white"/>
              <circle cx="16" cy="10" r="3" fill="#ef4444"/>
            </svg>
          `)}`,
          scaledSize: new window.google.maps.Size(32, 40),
          anchor: new window.google.maps.Point(16, 40)
        }
      });
      markersRef.current.push(destinationMarker);

      // ✅ MOSTRAR TERMINAL CORRESPONDIENTE SEGÚN LA RUTA
      if (routeType === 'via_transport_1' || routeType === 'current_to_transport') {
        const transportMarker = new window.google.maps.Marker({
          position: { lat: 19.8758703351958, lng: -97.5889138590976 },
          map: mapInstance,
          title: 'Terminal Principal de Transporte Zacapoaxtla',
          icon: {
            url: `data:image/svg+xml;base64,${btoa(`
              <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="8" width="20" height="20" rx="2" fill="#8b5cf6"/>
                <circle cx="10" cy="22" r="2" fill="white"/>
                <circle cx="18" cy="22" r="2" fill="white"/>
                <path d="M4 18L4 12L20 12L20 18" fill="#a78bfa"/>
                <rect x="2" y="28" width="24" height="4" rx="1" fill="#8b5cf6"/>
              </svg>
            `)}`,
            scaledSize: new window.google.maps.Size(28, 36),
            anchor: new window.google.maps.Point(14, 36)
          }
        });
        markersRef.current.push(transportMarker);
      }

      if (routeType === 'via_transport_2') {
        const transportMarker2 = new window.google.maps.Marker({
          position: { lat: 19.87383634377636, lng: -97.58769273588325 },
          map: mapInstance,
          title: 'Terminal Secundaria de Transporte Zacapoaxtla',
          icon: {
            url: `data:image/svg+xml;base64,${btoa(`
              <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="8" width="20" height="20" rx="2" fill="#6366f1"/>
                <circle cx="10" cy="22" r="2" fill="white"/>
                <circle cx="18" cy="22" r="2" fill="white"/>
                <path d="M4 18L4 12L20 12L20 18" fill="#818cf8"/>
                <rect x="2" y="28" width="24" height="4" rx="1" fill="#6366f1"/>
              </svg>
            `)}`,
            scaledSize: new window.google.maps.Size(28, 36),
            anchor: new window.google.maps.Point(14, 36)
          }
        });
        markersRef.current.push(transportMarker2);
      }
    } catch (error) {
      console.error('❌ Error agregando marcadores:', error);
    }
  }, [routeType, userLocation, origin, destination, cleanupMarkers]);

  // Renderizar ruta en el mapa
  const renderRouteOnMap = useCallback((segments: typeof routeSegments) => {
    if (!mapInstanceRef.current || !window.google || !directionsRendererRef.current) {
      return;
    }

    try {
      // Limpiar ruta anterior
      directionsRendererRef.current.setDirections({
          routes: [],
          request: undefined
      });

      // Para múltiples segmentos, renderizar cada uno
      segments.forEach((segment) => {
        if (segment.startLocation && segment.endLocation) {
          const directionsService = new window.google.maps.DirectionsService();
          
          directionsService.route({
            origin: segment.startLocation,
            destination: segment.endLocation,
            travelMode: window.google.maps.TravelMode[segment.mode]
          }, (result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
            if (status === 'OK' && directionsRendererRef.current && result) {
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
      
      // Fallback si no hay segmentos
      if (bounds.isEmpty()) {
        bounds.extend(new window.google.maps.LatLng(origin.lat, origin.lng));
        bounds.extend(new window.google.maps.LatLng(destination.lat, destination.lng));
        
        if (routeType === 'via_transport_1' || routeType === 'current_to_transport') {
          bounds.extend(new window.google.maps.LatLng(19.8758703351958, -97.5889138590976));
        }
        if (userLocation && (routeType === 'current_to_direct' || routeType === 'current_to_transport')) {
          bounds.extend(new window.google.maps.LatLng(userLocation.lat, userLocation.lng));
        }
      }
      
      if (mapInstanceRef.current) {
        mapInstanceRef.current.fitBounds(bounds);
      }
    } catch (error) {
      console.error('❌ Error renderizando ruta:', error);
    }
  }, [routeType, userLocation, origin, destination]);

  // Inicializar mapa
  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google || isInitializedRef.current) {
      return;
    }

    try {
      // Limpiar contenido previo
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }

      const points = [origin, destination];
      if (routeType === 'via_transport_1' || routeType === 'current_to_transport') {
        points.push({
            lat: 19.8758703351958, lng: -97.5889138590976,
            address: ''
        });
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
        fullscreenControl: true,
        zoomControl: true,
        mapTypeControl: true,
        styles: getMapStyles(currentMapType)
      });

      mapInstanceRef.current = newMap;
      newMap.fitBounds(bounds);

      // Inicializar servicios de direcciones
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

      directionsRendererRef.current = newDirectionsRenderer;

      // Agregar marcadores
      addCustomMarkers(newMap);

      isInitializedRef.current = true;
      onMapInitialized(newMap);

    } catch (error) {
      const errorMessage = 'Error al inicializar el mapa: ' + (error instanceof Error ? error.message : 'Error desconocido');
      onMapError(errorMessage);
    }
  }, [
    origin, destination, routeType, currentMapType, showRoute, userLocation, 
    addCustomMarkers, onMapInitialized, onMapError
  ]);

  // Cargar mapa
  const loadMap = useCallback(() => {
    if (isInitializedRef.current) return;
    
    if (!window.google) {
      const script = document.createElement('script');
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        setTimeout(() => initializeMap(), 100);
      };
      
      script.onerror = () => {
        onMapError('Error al cargar Google Maps. Verifica tu API key.');
      };
      
      document.head.appendChild(script);
    } else {
      setTimeout(() => initializeMap(), 100);
    }
  }, [initializeMap, onMapError]);

  // Efecto para cargar mapa
  useEffect(() => {
    loadMap();
  }, [loadMap]);

  // Efecto para renderizar ruta cuando cambian los segmentos
  useEffect(() => {
    if (routeSegments.length > 0 && isInitializedRef.current) {
      renderRouteOnMap(routeSegments);
    }
  }, [routeSegments, renderRouteOnMap]);

  // Efecto para actualizar visibilidad de ruta
  useEffect(() => {
    if (directionsRendererRef.current && mapInstanceRef.current) {
      directionsRendererRef.current.setMap(showRoute ? mapInstanceRef.current : null);
    }
  }, [showRoute]);

  // Efecto para actualizar marcadores cuando cambia el tipo de ruta
  useEffect(() => {
    if (isInitializedRef.current && mapInstanceRef.current) {
      addCustomMarkers(mapInstanceRef.current);
    }
  }, [routeType, userLocation, addCustomMarkers]);

  return (
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
              onClick={onReload}
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
  );
});

MapContainer.displayName = 'MapContainer';