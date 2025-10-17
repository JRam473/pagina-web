// components/MapRouteViewer/RouteActions.tsx
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Route, ExternalLink, Car, Bike, User, MapPin } from 'lucide-react';
import type { RouteActionsProps, TravelMode } from './types';

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

const getRouteTypeDescription = (routeType: string) => {
  switch (routeType) {
    case 'direct': return 'directa';
    case 'via_transport': return 'vía terminal';
    case 'current_to_direct': return 'desde tu ubicación';
    case 'current_to_transport': return 'desde tu ubicación vía terminal';
    default: return 'directa';
  }
};

export const RouteActions: React.FC<RouteActionsProps> = ({
  routeInfo,
  routeType,
  travelMode,
  userLocation,
  isLoading,
  onClose,
  onOpenGoogleMaps
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-green-200/30">
      <div className="text-sm text-green-600 flex-1">
        {routeInfo ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="flex items-center gap-2">
              <Route className="h-4 w-4 text-green-600" />
              Ruta {getRouteTypeDescription(routeType)} • 
              {routeInfo.distance} • {routeInfo.duration}
            </span>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {getTravelModeIcon(travelMode)}
                {getTravelModeLabel(travelMode)}
              </Badge>
              {userLocation && (routeType === 'current_to_direct' || routeType === 'current_to_transport') && (
                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                  <MapPin className="h-3 w-3 mr-1" />
                  Desde tu ubicación
                </Badge>
              )}
            </div>
          </div>
        ) : isLoading ? (
          <span>🔄 Calculando ruta{routeType.includes('current') ? ' desde tu ubicación' : ''}...</span>
        ) : (
          <span>👆 Selecciona opciones y calcula la ruta...</span>
        )}
      </div>
      
      <div className="flex gap-3 w-full sm:w-auto">
        <Button 
          variant="outline" 
          onClick={onClose}
          className="border-green-200 text-green-700 hover:bg-green-50 flex-1 sm:flex-none"
        >
          Cerrar
        </Button>
        <Button 
          onClick={onOpenGoogleMaps}
          className="gap-2 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white shadow-lg flex-1 sm:flex-none"
          disabled={!routeInfo}
        >
          <ExternalLink className="h-4 w-4" />
          <span className="hidden xs:inline">Abrir en </span>Google Maps
        </Button>
      </div>
    </div>
  );
};