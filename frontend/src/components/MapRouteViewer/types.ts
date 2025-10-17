import type { ReactNode } from "react";

// components/MapRouteViewer/types.ts
export interface Location {
  address: string;
  lat: number;
  lng: number;
}

export type TravelMode = 'DRIVING' | 'WALKING' | 'BICYCLING';
export type MapType = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
export type RouteType = 'via_transport_1' | 'via_transport_2' | 'current_to_direct' | 'current_to_transport';

export interface RouteInfo {
  totalDuration: ReactNode;
  totalDistance: ReactNode;
  distance: string;
  duration: string;
  startAddress: string;
  endAddress: string;
  steps: RouteSegment[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
}

export interface RouteSegment {
  distance: string;
  duration: string;
  mode: TravelMode;
  instructions: string;
  distanceMeters: number;
  durationSeconds: number;
  startLocation?: Location;
  endLocation?: Location;
}



export interface RoutePanelProps {
  routeType: RouteType;
  travelMode: TravelMode;
  routeInfo: RouteInfo | null;
  routeSegments: RouteSegment[];
  activeSegment: number | 'all';
  showRoute: boolean;
  userLocation: Location | null;
  hasLocationPermission: boolean;
  origin: Location;
  destination: Location;
  transportBase: Location;
  transportBase2: Location; // ✅ CORREGIDO: typo "trasportBase2"
  onRouteTypeChange: (type: RouteType) => void;
  onTravelModeChange: (mode: TravelMode) => void;
  onRouteVisibilityChange: (visible: boolean) => void;
  onSegmentChange: (segment: number | 'all') => void;
  onClose?: () => void;
}

export interface MapControlsProps {
  currentMapType: MapType;
  onMapTypeChange: (mapType: MapType) => void;
  isLoading: boolean;
  onCalculateRoute: () => void;
  routeInfo: RouteInfo | null;
  travelMode: TravelMode;
  routeType: RouteType;
  userLocation: Location | null;
  onToggleSidebar?: () => void; // Nuevo: toggle sidebar móvil
  showSidebar?: boolean; // Nuevo: estado sidebar
}


export interface MapContainerProps {
  origin: Location;
  destination: Location;
  routeType: RouteType;
  travelMode: TravelMode;
  currentMapType: MapType;
  showRoute: boolean;
  userLocation: Location | null;
  routeSegments: RouteSegment[];
  activeSegment: number | 'all'; // Nuevo: segmento activo
  isLoading: boolean;
  mapError: string | null;
  onMapInitialized: (map: google.maps.Map) => void;
  onMapError: (error: string) => void;
  onReload: () => void;
}

export interface RouteActionsProps {
  routeInfo: RouteInfo | null;
  routeType: RouteType;
  travelMode: TravelMode;
  userLocation: Location | null;
  isLoading: boolean;
  onClose: () => void;
  onOpenGoogleMaps: () => void;
}