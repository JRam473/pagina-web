// components/MapRouteViewer/RoutePanel.tsx - VERSIÓN CORREGIDA
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building, Locate, MapPin, Clock, Route, Car, Bike, User, Eye, EyeOff, X } from 'lucide-react';
import type { RoutePanelProps, RouteType, TravelMode } from './types';

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

export const RoutePanel: React.FC<RoutePanelProps> = ({
  routeType,
  travelMode,
  routeInfo,
  routeSegments,
  activeSegment,
  showRoute,
  userLocation,
  hasLocationPermission,
  origin,
  destination,
  transportBase,
  transportBase2, // ✅ CORREGIDO: typo "trasportBase2" → "transportBase2"
  onRouteTypeChange,
  onTravelModeChange,
  onRouteVisibilityChange,
  onSegmentChange,
  onClose
}) => {
  // ✅ OPCIONES DE RUTA ACTUALIZADAS
  const routeOptions = [
  {
    value: 'via_transport_1' as const,
    label: 'Desde Terminal Principal',  // ✅ Cambiado
    description: 'Terminal Principal → Destino',  // ✅ Cambiado
    icon: Building,
    requiresLocation: false,
    badgeVariant: 'default' as const
  },
  {
    value: 'via_transport_2' as const,
    label: 'Desde Terminal Secundaria',  // ✅ Cambiado
    description: 'Terminal Secundaria → Destino',  // ✅ Cambiado
    icon: Building,
    requiresLocation: false,
    badgeVariant: 'outline' as const
  },
    {
      value: 'current_to_direct' as const,
      label: 'Desde mi ubicación',
      description: 'Tu ubicación → Destino',
      icon: Locate,
      requiresLocation: true,
      badgeVariant: 'outline' as const
    },
    {
      value: 'current_to_transport' as const,
      label: 'Mi ubicación → Terminal',
      description: 'Tu ubicación → Terminal → Destino',
      icon: Locate,
      requiresLocation: true,
      badgeVariant: 'outline' as const
    }
  ];

  // Determinar si la ruta tiene múltiples segmentos
  const hasMultipleSegments = routeSegments.length > 1;

  return (
    <div className="space-y-4">
      {/* Header móvil */}
      {onClose && (
        <div className="flex items-center justify-between lg:hidden">
          <h3 className="font-semibold text-green-800">Opciones de Ruta</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Selector de tipo de ruta */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-200/50">
        <Label className="text-sm font-medium text-blue-800 mb-3 block">
          Tipo de Ruta:
        </Label>
        <RadioGroup 
          value={routeType} 
          onValueChange={(value: string) => onRouteTypeChange(value as RouteType)}
          className="space-y-3"
        >
          {routeOptions.map((option) => {
            const isDisabled = option.requiresLocation && !hasLocationPermission && !userLocation;
            const isUsingUserLocation = (option.value === 'current_to_direct' || option.value === 'current_to_transport') && userLocation;
            
            return (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem 
                  value={option.value} 
                  id={option.value}
                  disabled={isDisabled}
                />
                <Label 
                  htmlFor={option.value} 
                  className={`flex items-center gap-2 cursor-pointer flex-1 ${
                    isDisabled ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  <option.icon className="h-4 w-4" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-sm font-medium">{option.label}</span>
                      <Badge 
                        variant={option.badgeVariant} 
                        className={`text-xs w-fit ${
                          option.value === 'via_transport_1' ? "bg-green-100 text-green-800 border-green-200" : ""
                        }`}
                      >
                        {option.description}
                      </Badge>
                    </div>
                    {isDisabled && (
                      <Badge variant="secondary" className="mt-1 text-xs bg-amber-100 text-amber-800">
                        Permisos requeridos
                      </Badge>
                    )}
                    {isUsingUserLocation && (
                      <Badge variant="secondary" className="mt-1 text-xs bg-blue-100 text-blue-800">
                        Usando tu ubicación
                      </Badge>
                    )}
                  </div>
                </Label>
              </div>
            );
          })}
        </RadioGroup>

        {userLocation && (
          <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700 flex items-center gap-1">
              <Locate className="h-3 w-3" />
              📍 Usando tu ubicación actual
            </p>
          </div>
        )}
      </div>

      {/* Selector de segmentos para rutas múltiples */}
      {hasMultipleSegments && routeInfo && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-purple-200/50">
          <Label className="text-sm font-medium text-purple-800 mb-3 block">
            Ver Segmento:
          </Label>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={activeSegment === 'all' ? "default" : "outline"}
              onClick={() => onSegmentChange('all')}
              className={`gap-2 ${
                activeSegment === 'all' 
                  ? "bg-purple-600 text-white" 
                  : "border-purple-200 text-purple-700 hover:bg-purple-50"
              }`}
            >
              <Route className="h-4 w-4" />
              Todas las etapas
            </Button>
            {routeSegments.map((_, index) => (
              <Button
                key={index}
                size="sm"
                variant={activeSegment === index ? "default" : "outline"}
                onClick={() => onSegmentChange(index)}
                className={`gap-2 ${
                  activeSegment === index 
                    ? "bg-purple-600 text-white" 
                    : "border-purple-200 text-purple-700 hover:bg-purple-50"
                }`}
              >
                <span>Etapa {index + 1}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Información de ubicaciones */}
      <div className="space-y-3">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-green-200/50">
          <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4" />
            {((routeType === 'current_to_direct' || routeType === 'current_to_transport') && userLocation) 
              ? 'Tu Ubicación Actual' 
              : 'Origen'
            }
          </h3>
          <p className="text-xs text-green-700 line-clamp-2">
            {((routeType === 'current_to_direct' || routeType === 'current_to_transport') && userLocation) 
              ? (userLocation.address || 'Ubicación detectada') 
              : origin.address
            }
          </p>
        </div>
        
        {/* ✅ MOSTRAR TERMINAL CORRESPONDIENTE SEGÚN LA RUTA SELECCIONADA */}
        {(routeType === 'via_transport_1' || routeType === 'current_to_transport') && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-purple-200/50">
            <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2 text-sm">
              <Building className="h-4 w-4" />
              Terminal Principal
            </h3>
            <p className="text-xs text-purple-700 line-clamp-2">{transportBase.address}</p>
          </div>
        )}
        
        {(routeType === 'via_transport_2') && transportBase2 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-indigo-200/50">
            <h3 className="font-semibold text-indigo-800 mb-2 flex items-center gap-2 text-sm">
              <Building className="h-4 w-4" />
              Terminal Secundaria
            </h3>
            <p className="text-xs text-indigo-700 line-clamp-2">{transportBase2.address}</p>
          </div>
        )}
        
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-red-200/50">
          <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4" />
            Destino
          </h3>
          <p className="text-xs text-red-700 line-clamp-2">{destination.address}</p>
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
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {routeSegments.map((segment, index) => (
                  <div key={index} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <span className="font-medium block">Etapa {index + 1}</span>
                      <div className="text-gray-600 text-xs mt-1 line-clamp-2">
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

          {/* Modo de transporte */}
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
                  onClick={() => onTravelModeChange(mode)}
                  className={`gap-2 flex-1 min-w-[80px] ${
                    travelMode === mode 
                      ? "bg-blue-600 text-white" 
                      : "border-blue-200 text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  {getTravelModeIcon(mode)}
                  <span className="hidden xs:inline">{getTravelModeLabel(mode)}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Mostrar/ocultar ruta */}
          <div className="mt-4 flex items-center justify-between">
            <Label htmlFor="show-route" className="text-sm font-medium text-blue-800 flex items-center gap-2">
              {showRoute ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Mostrar ruta en el mapa:
            </Label>
            <Switch
              id="show-route"
              checked={showRoute}
              onCheckedChange={onRouteVisibilityChange}
            />
          </div>
        </div>
      )}

      {/* ✅ LEYENDA ACTUALIZADA */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50">
        <h3 className="font-semibold text-gray-800 mb-3 text-sm">Leyenda</h3>
        <div className="space-y-2 text-xs">
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
          {(routeType === 'via_transport_1' || routeType === 'current_to_transport') && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-gray-700">Terminal Principal</span>
            </div>
          )}
          {(routeType === 'via_transport_2') && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
              <span className="text-gray-700">Terminal Secundaria</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-700">Ruta</span>
          </div>
        </div>
      </div>
    </div>
  );
};