// components/MapRouteViewer/MapControls.tsx - VERSIÓN MEJORADA
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Satellite, Layers, MapPin, Car, Bike, User, Route, Calculator, Menu, Mountain } from 'lucide-react';
import type { MapControlsProps, MapType, RouteType, TravelMode } from './types';

const getMapTypeIcon = (mapType: MapType) => {
  switch (mapType) {
    case 'satellite': return <Satellite className="h-4 w-4" />;
    case 'hybrid': return <Layers className="h-4 w-4" />;
    case 'terrain': return <Mountain className="h-4 w-4" />;
    default: return <MapPin className="h-4 w-4" />;
  }
};

const getMapTypeLabel = (mapType: MapType) => {
  switch (mapType) {
    case 'roadmap': return 'Mapa';
    case 'satellite': return 'Satélite';
    case 'hybrid': return 'Híbrido';
    case 'terrain': return 'Relieve';
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

const getRouteTypeDescription = (routeType: RouteType) => {
  switch (routeType) {
    case 'via_transport_1': return 'vía terminal principal';
    case 'via_transport_2': return 'vía terminal secundaria';
    case 'current_to_direct': return 'desde tu ubicación';
    case 'current_to_transport': return 'desde tu ubicación vía terminal';
    default: return 'vía terminal';
  }
};

export const MapControls: React.FC<MapControlsProps> = ({
  currentMapType,
  onMapTypeChange,
  isLoading,
  onCalculateRoute,
  routeInfo,
  travelMode,
  routeType,
  onToggleSidebar
}) => {
  const getMapTypeButtonVariant = (mapType: MapType) => {
    return currentMapType === mapType ? "default" : "outline";
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
      {/* Controles izquierda - Tipo de mapa */}
      <div className="flex gap-2 flex-wrap items-center">
        {/* Botón menú para móvil */}
        {onToggleSidebar && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleSidebar}
            className="lg:hidden gap-2 border-green-200 text-green-700 hover:bg-green-100"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}

        {/* Controles de tipo de mapa - AHORA CON RELIEVE */}
        <div className="flex gap-2 flex-wrap">
          {(['roadmap', 'satellite', 'hybrid', 'terrain'] as MapType[]).map((mapType) => (
            <Button
              key={mapType}
              variant={getMapTypeButtonVariant(mapType)}
              size="sm"
              onClick={() => onMapTypeChange(mapType)}
              className="gap-2 border-green-200 text-green-700 hover:bg-green-100"
            >
              {getMapTypeIcon(mapType)}
              <span className="hidden sm:inline">{getMapTypeLabel(mapType)}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Información y acciones derecha */}
      <div className="flex gap-2 items-center flex-wrap">
        {/* Badge de vista actual */}
        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 hidden sm:flex">
          {getMapTypeLabel(currentMapType)}
        </Badge>

        {/* Información de ruta actual - Solo desktop */}
        {routeInfo && (
          <div className="hidden md:flex items-center gap-2 text-sm text-green-700">
            <Route className="h-4 w-4" />
            <span className="hidden lg:inline">
              {getRouteTypeDescription(routeType)} • {routeInfo.distance} • {routeInfo.duration}
            </span>
            <Badge variant="outline" className="text-xs">
              {getTravelModeIcon(travelMode)}
              <span className="hidden xs:inline">{getTravelModeLabel(travelMode)}</span>
            </Badge>
          </div>
        )}

        {/* Botón calcular ruta */}
        <Button
          onClick={onCalculateRoute}
          disabled={isLoading}
          size="sm"
          className="gap-2 bg-green-600 hover:bg-green-700 text-white"
        >
          <Calculator className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">
            {isLoading ? 'Calculando...' : 'Calcular'}
          </span>
        </Button>
      </div>
    </div>
  );
};