// components/MapRouteViewer/MapRouteViewer.tsx - VERSIÓN CORREGIDA
import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Route, RotateCw, Locate, Menu, X } from 'lucide-react';

// Componentes modulares
import { MapControls } from './MapControls';
import { RoutePanel } from './RoutePanel';
import { MapContainer } from './MapContainer';
import { RouteActions } from './RouteActions';
import { LocationPermissionDialog } from '@/components/LocationPermissionDialog';

// Hooks y tipos
import { useRouteCalculator, type CalculatedRoute } from '@/hooks/useRouteCalculator';
import { useToast } from '@/hooks/use-toast';
import type { Location, TravelMode, MapType, RouteType, RouteInfo, RouteSegment } from './types';

// Constantes
const TRANSPORT_BASE_1: Location = {
  address: "Terminal de Autobuses Zacapoaxtla, Carretera Federal Teziutlán-Zacapoaxtla, Zacapoaxtla, Puebla",
  lat: 19.8758703351958,
  lng: -97.5889138590976
};

const TRANSPORT_BASE_2: Location = {
  address: "Segunda Terminal de Transporte Zacapoaxtla, Centro, Zacapoaxtla, Puebla",
  lat: 19.87383634377636,
  lng: -97.58769273588325
};

interface MapRouteViewerProps {
  origin: Location;
  destination: Location;
  buttonText?: string;
  className?: string;
}

export const MapRouteViewer: React.FC<MapRouteViewerProps> = ({
  origin,
  destination,
  buttonText = "Ver Ruta",
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [travelMode, setTravelMode] = useState<TravelMode>('DRIVING');
  const [routeType, setRouteType] = useState<RouteType>('current_to_direct');
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]);
  const [activeSegment, setActiveSegment] = useState<number | 'all'>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentMapType, setCurrentMapType] = useState<MapType>('hybrid');
  const [showRoute, setShowRoute] = useState(true);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [pendingRouteAction, setPendingRouteAction] = useState<(() => void) | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  // ✅ REFERENCIAS MEJORADAS - Control preciso de actualizaciones
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const isInitializedRef = useRef(false);
  const isCalculatingRef = useRef(false);
  const lastCalculationRef = useRef<{
    routeType: RouteType; 
    travelMode: TravelMode;
    timestamp: number;
  } | null>(null);
  
  // ✅ NUEVO: Referencia para controlar cambios de modo de transporte
  const travelModeChangeRef = useRef<{
    mode: TravelMode;
    timestamp: number;
    pending: boolean;
  } | null>(null);

  // ✅ NUEVO: Referencia para evitar efectos duplicados

  const calculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const {
    userLocation,
    isGettingLocation,
    locationError,
    hasLocationPermission,
    getUserCurrentLocation,
    handlePermissionResponse,
    initializeLocationPermissions,
    calculateRoute,
    calculateComplexRoute,
  } = useRouteCalculator();

    // ✅ Calcular ruta óptima - OPTIMIZADA Y SEGURA
  const calculateOptimalRoute = useCallback(async () => {
    if (!window.google || isCalculatingRef.current) {
      console.log('⏸️  Calculación omitida - Google Maps no disponible o ya calculando');
      return;
    }

    isCalculatingRef.current = true;
    setIsLoading(true);
    setMapError(null);
    
    try {
      // Verificar permisos para rutas que requieren ubicación
      const requiresLocation = routeType === 'current_to_direct' || routeType === 'current_to_transport';
      if (requiresLocation && !hasLocationPermission && !userLocation) {
        throw new Error('Se requiere permiso de ubicación para esta ruta.');
      }

      let calculatedRoute: CalculatedRoute;

      console.log('📍 Calculando ruta:', { routeType, travelMode });
// ✅ CORREGIR LOS CASES EN calculateOptimalRoute
switch (routeType) {
  case 'via_transport_1':
    // ORIGINAL INCORRECTO: origin → terminal → destino
    // CORREGIDO: terminal principal → destino
    calculatedRoute = await calculateRoute(TRANSPORT_BASE_1, destination, travelMode);
    break;
  case 'via_transport_2':
    // ORIGINAL INCORRECTO: origin → terminal secundaria → destino  
    // CORREGIDO: terminal secundaria → destino
    calculatedRoute = await calculateRoute(TRANSPORT_BASE_2, destination, travelMode);
    break;
  case 'current_to_direct':
    if (!userLocation) {
      throw new Error('Se requiere ubicación del usuario');
    }
    calculatedRoute = await calculateRoute(userLocation, destination, travelMode);
    break;
  case 'current_to_transport':
    if (!userLocation) {
      throw new Error('Se requiere ubicación del usuario');
    }
    // CORREGIDO: ubicación → terminal principal → destino
    calculatedRoute = await calculateComplexRoute([
      { origin: userLocation, destination: TRANSPORT_BASE_1, mode: travelMode },
      { origin: TRANSPORT_BASE_1, destination: destination, mode: travelMode }
    ]);
    break;
  default:
    throw new Error('Tipo de ruta no válido');
}

      const routeInfoData: RouteInfo = {
        distance: calculatedRoute.totalDistance,
        duration: calculatedRoute.totalDuration,
        startAddress: calculatedRoute.segments[0]?.startLocation?.address ||
          (routeType.includes('current') && userLocation ? userLocation.address : origin.address),
        endAddress: calculatedRoute.segments[calculatedRoute.segments.length - 1]?.endLocation?.address || destination.address,
        steps: calculatedRoute.segments,
        totalDistanceMeters: calculatedRoute.totalDistanceMeters,
        totalDurationSeconds: calculatedRoute.totalDurationSeconds,
        totalDuration: undefined,
        totalDistance: undefined
      };

      setRouteSegments(calculatedRoute.segments);
      setRouteInfo(routeInfoData);
      
      // Guardar referencia del último cálculo exitoso
      lastCalculationRef.current = { 
        routeType, 
        travelMode, 
        timestamp: Date.now() 
      };
      
      // Marcar cambio de modo como procesado
      if (travelModeChangeRef.current) {
        travelModeChangeRef.current.pending = false;
      }
      
      console.log('✅ Ruta calculada exitosamente');
      
    } catch (error) {
      console.error('❌ Error en calculateOptimalRoute:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      // Resetear estado de cálculo pendiente en caso de error
      if (travelModeChangeRef.current) {
        travelModeChangeRef.current.pending = false;
      }
      
      // Solo limpiar datos si es un error de configuración
      if (!errorMessage.includes('ubicación') && !errorMessage.includes('segmento')) {
        setRouteInfo(null);
        setRouteSegments([]);
      }
      
      if (!errorMessage.includes('ubicación')) {
        toast({
          title: 'Error en cálculo de ruta',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
      isCalculatingRef.current = false;
    }
  }, [
    routeType, 
    travelMode, 
    hasLocationPermission, 
    userLocation, 
    origin, 
    destination, 
    calculateRoute, 
    calculateComplexRoute, 
    toast
  ]);

// ✅ EFECTO PARA INICIALIZAR UBICACIÓN AL ABRIR - NUEVO
  useEffect(() => {
    if (isOpen && routeType === 'current_to_direct' && !userLocation && hasLocationPermission) {
      console.log('📍 Inicializando ubicación para ruta por defecto...');
      getUserCurrentLocation().catch(error => {
        console.log('⚠️ No se pudo obtener ubicación automática:', error.message);
        // Si falla la ubicación, cambiar a terminal principal como fallback
        setRouteType('via_transport_1');
      });
    }
  }, [isOpen, routeType, userLocation, hasLocationPermission, getUserCurrentLocation]);

  // ✅ EFECTO PRINCIPAL MEJORADO
  useEffect(() => {
    if (!isOpen || !isInitializedRef.current) return;

    const shouldRecalculate = () => {
      if (isCalculatingRef.current) return false;

      const currentConfig = { routeType, travelMode };
      const lastConfig = lastCalculationRef.current;
      
      if (lastConfig && 
          lastConfig.routeType === currentConfig.routeType && 
          lastConfig.travelMode === currentConfig.travelMode) {
        return false;
      }

      return true;
    };

    if (shouldRecalculate()) {
      console.log('🔄 Efecto principal - Calculando ruta:', { routeType, travelMode });
      
      // ✅ RETRASO PARA PERMITIR QUE SE OBTENGA LA UBICACIÓN
      const delay = routeType.includes('current') && !userLocation ? 1000 : 0;
      
      setTimeout(() => {
        calculateOptimalRoute();
      }, delay);
    }
  }, [calculateOptimalRoute, isOpen, routeType, travelMode, userLocation]);

  // ✅ NUEVO: Efecto específico para cambios de modo de transporte
  useEffect(() => {
    if (!isOpen || !isInitializedRef.current) return;

    // Solo procesar cambios de modo de transporte si hay un cambio pendiente
    if (travelModeChangeRef.current?.pending) {
      console.log('🔄 Procesando cambio de modo de transporte:', travelModeChangeRef.current.mode);
      
      // Limpiar timeout anterior si existe
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }

      // Usar debounce para evitar cálculos múltiples
      calculationTimeoutRef.current = setTimeout(() => {
        if (travelModeChangeRef.current?.pending) {
          calculateOptimalRoute();
          travelModeChangeRef.current.pending = false;
        }
      }, 300);
    }
  }, [travelMode, isOpen, calculateOptimalRoute]);

  // ✅ NUEVO: Cleanup de timeouts
  useEffect(() => {
    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
    };
  }, []);

  // ✅ MANEJADOR SEGURO PARA MODO DE TRANSPORTE - COMPLETAMENTE CORREGIDO
  const changeTravelMode = useCallback((mode: TravelMode) => {
    if (mode === travelMode) return;

    console.log('🚗 Cambiando modo de transporte a:', mode);
    
    // Registrar el cambio como pendiente
    travelModeChangeRef.current = {
      mode,
      timestamp: Date.now(),
      pending: true
    };
    
    // Actualizar estado inmediatamente para UI responsiva
    setTravelMode(mode);
    
    // El efecto específico se encargará del recálculo controlado
  }, [travelMode]);



 // ✅ ACTUALIZAR changeRouteType PARA MANEJAR MEJOR LA UBICACIÓN
  const changeRouteType = useCallback(async (type: RouteType) => {
    const requiresLocation = type === 'current_to_direct' || type === 'current_to_transport';
    
    if (requiresLocation && !hasLocationPermission && !userLocation) {
      setPendingRouteAction(() => async () => {
        setRouteType(type);
        setActiveSegment(0);
        try {
          await getUserCurrentLocation();
        } catch (error) {
          console.error('Error obteniendo ubicación:', error);
          // Fallback a terminal principal si falla la ubicación
          setRouteType('via_transport_1');
        }
      });
      setShowPermissionDialog(true);
    } else {
      setRouteType(type);
      setActiveSegment(0);
      if (requiresLocation && hasLocationPermission && !userLocation) {
        try {
          await getUserCurrentLocation();
        } catch (error) {
          console.error('Error obteniendo ubicación:', error);
          // Fallback a terminal principal si falla la ubicación
          setRouteType('via_transport_1');
        }
      }
    }
  }, [hasLocationPermission, userLocation, getUserCurrentLocation]);

  const changeActiveSegment = useCallback((segmentIndex: number | 'all') => {
    setActiveSegment(segmentIndex);
  }, []);

  const getFilteredSegments = useCallback(() => {
    if (activeSegment === 'all') {
      return routeSegments;
    }
    return routeSegments.filter((_, index) => index === activeSegment);
  }, [routeSegments, activeSegment]);

  const handleGetUserLocation = useCallback(async () => {
    if (isGettingLocation) return;
    
    try {
      if (!hasLocationPermission) {
        setShowPermissionDialog(true);
        return;
      }
      
      await getUserCurrentLocation();
      toast({
        title: 'Ubicación obtenida',
        description: 'Se ha obtenido tu ubicación actual correctamente',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      toast({
        title: 'Error de ubicación',
        description: locationError || 'No se pudo obtener la ubicación',
        variant: 'destructive',
      });
    }
  }, [getUserCurrentLocation, toast, locationError, isGettingLocation, hasLocationPermission]);

  const handlePermissionDialogResponse = useCallback(async (granted: boolean) => {
    setShowPermissionDialog(false);
    
    if (granted) {
      try {
        await handlePermissionResponse(true);
        await getUserCurrentLocation();
        toast({
          title: 'Ubicación obtenida',
          description: 'Se ha obtenido tu ubicación actual correctamente',
          variant: 'default',
        });
      } catch (error) {
        console.error('Error obteniendo ubicación después de permisos:', error);
        toast({
          title: 'Error de ubicación',
          description: 'No se pudo obtener la ubicación después de conceder permisos',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Permisos denegados',
        description: 'Usando rutas desde puntos fijos',
        variant: 'default',
      });
    }
    
    if (pendingRouteAction) {
      setTimeout(() => {
        pendingRouteAction();
        setPendingRouteAction(null);
      }, 300);
    }
  }, [handlePermissionResponse, getUserCurrentLocation, pendingRouteAction, toast]);

  const reloadMap = useCallback(() => {
    isInitializedRef.current = false;
    lastCalculationRef.current = null;
    travelModeChangeRef.current = null;
    setMapError(null);
    setRouteInfo(null);
    setRouteSegments([]);
    
    // Limpiar timeout si existe
    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current);
    }
  }, []);

  const changeMapType = useCallback((mapType: MapType) => {
    setCurrentMapType(mapType);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(mapType);
    }
  }, []);

   // ✅ ACTUALIZAR getGoogleMapsUrl PARA LAS NUEVAS RUTAS
  const getGoogleMapsUrl = useCallback(() => {
    const baseUrl = 'https://www.google.com/maps/dir/';
    
    switch (routeType) {
      case 'via_transport_1':
        return `${baseUrl}${origin.lat},${origin.lng}/${TRANSPORT_BASE_1.lat},${TRANSPORT_BASE_1.lng}/${destination.lat},${destination.lng}`;
      case 'via_transport_2':
        return `${baseUrl}${origin.lat},${origin.lng}/${TRANSPORT_BASE_2.lat},${TRANSPORT_BASE_2.lng}/${destination.lat},${destination.lng}`;
      case 'current_to_direct':
        return userLocation 
          ? `${baseUrl}${userLocation.lat},${userLocation.lng}/${destination.lat},${destination.lng}`
          : `${baseUrl}${origin.lat},${origin.lng}/${destination.lat},${destination.lng}`;
      case 'current_to_transport':
        return userLocation 
          ? `${baseUrl}${userLocation.lat},${userLocation.lng}/${TRANSPORT_BASE_1.lat},${TRANSPORT_BASE_1.lng}/${destination.lat},${destination.lng}`
          : `${baseUrl}${origin.lat},${origin.lng}/${TRANSPORT_BASE_1.lat},${TRANSPORT_BASE_1.lng}/${destination.lat},${destination.lng}`;
      default:
        return `${baseUrl}${origin.lat},${origin.lng}/${destination.lat},${destination.lng}`;
    }
  }, [routeType, origin, destination, userLocation]);

  const handleOpenGoogleMaps = useCallback(() => {
    window.open(getGoogleMapsUrl(), '_blank');
  }, [getGoogleMapsUrl]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setShowSidebar(false);
    // Resetear flags para próxima apertura
    travelModeChangeRef.current = null;
    
    // Limpiar timeout si existe
    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current);
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setShowSidebar(!showSidebar);
  }, [showSidebar]);

  const handleMapInitialized = useCallback((map: google.maps.Map) => {
    mapInstanceRef.current = map;
    isInitializedRef.current = true;
    
    const initialize = async () => {
      try {
        await initializeLocationPermissions();
        
        // Calcular ruta inicial solo si no hay cálculos previos
        if (!lastCalculationRef.current) {
          console.log('🗺️ Mapa inicializado, calculando ruta inicial...');
          calculateOptimalRoute();
        }
      } catch (error) {
        console.error('Error en inicialización:', error);
      }
    };
    
    initialize();
  }, [calculateOptimalRoute, initializeLocationPermissions]);

  // Renderizar contenido (sin cambios)
  const renderContent = () => (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 min-h-0">
      {/* Panel lateral - Desktop siempre visible, móvil en sheet */}
      <div className="hidden lg:block w-96 flex-col gap-4 overflow-y-auto">
        <RoutePanel
          routeType={routeType}
          travelMode={travelMode}
          routeInfo={routeInfo}
          routeSegments={routeSegments}
          activeSegment={activeSegment}
          showRoute={showRoute}
          userLocation={userLocation}
          hasLocationPermission={hasLocationPermission}
          origin={origin}
          destination={destination}
          transportBase={TRANSPORT_BASE_1}
          transportBase2={TRANSPORT_BASE_2}
          onRouteTypeChange={changeRouteType}
          onTravelModeChange={changeTravelMode}
          onRouteVisibilityChange={setShowRoute}
          onSegmentChange={changeActiveSegment}
        />
      </div>

      {/* Mapa y controles - Siempre visible */}
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        <MapControls
          currentMapType={currentMapType}
          onMapTypeChange={changeMapType}
          isLoading={isLoading}
          onCalculateRoute={calculateOptimalRoute}
          routeInfo={routeInfo}
          travelMode={travelMode}
          routeType={routeType}
          userLocation={userLocation}
          onToggleSidebar={toggleSidebar}
          showSidebar={showSidebar}
        />

        <MapContainer
          ref={mapRef}
          origin={origin}
          destination={destination}
          routeType={routeType}
          travelMode={travelMode}
          currentMapType={currentMapType}
          showRoute={showRoute}
          userLocation={userLocation}
          routeSegments={getFilteredSegments()}
          activeSegment={activeSegment}
          isLoading={isLoading}
          mapError={mapError}
          onMapInitialized={handleMapInitialized}
          onMapError={setMapError}
          onReload={reloadMap}
        />
      </div>
    </div>
  );

  return (
    <>
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
        
        <DialogContent className="max-w-7xl h-[95vh] flex flex-col bg-gradient-to-br from-green-50/80 to-blue-100/80 backdrop-blur-sm border border-green-200/50 shadow-2xl rounded-2xl p-2 sm:p-4 md:p-6">
          <DialogHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-green-200/30 gap-2 sm:gap-3">
            <DialogTitle className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent text-center sm:text-left w-full sm:w-auto">
              🗺️ Cómo Llegar
            </DialogTitle>
            <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-start">
              {/* Botón menú para móvil */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSidebar}
                className="lg:hidden gap-2 border-green-200 text-green-700 hover:bg-green-50"
              >
                {showSidebar ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                <span className="hidden xs:inline">Menú</span>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGetUserLocation}
                disabled={isGettingLocation}
                className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-100 flex-1 sm:flex-none"
              >
                <Locate className={`h-4 w-4 ${isGettingLocation ? 'animate-pulse' : ''}`} />
                <span className="hidden xs:inline">
                  {isGettingLocation ? 'Obteniendo...' : 'Mi Ubicación'}
                </span>
              </Button>
              
              <Button
                onClick={reloadMap}
                disabled={isLoading}
                variant="outline" 
                size="sm"
                className="gap-2 border-green-200 text-green-700 hover:bg-green-100 flex-1 sm:flex-none"
              >
                <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden xs:inline">Recargar</span>
              </Button>
            </div>
          </DialogHeader>
          
          {/* Sheet para sidebar en móvil */}
          <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
            <SheetContent 
              side="left" 
              className="w-[85vw] sm:w-96 p-4 overflow-y-auto bg-gradient-to-b from-green-50/95 to-blue-100/95 backdrop-blur-sm"
            >
              <RoutePanel
                routeType={routeType}
                travelMode={travelMode}
                routeInfo={routeInfo}
                routeSegments={routeSegments}
                activeSegment={activeSegment}
                showRoute={showRoute}
                userLocation={userLocation}
                hasLocationPermission={hasLocationPermission}
                origin={origin}
                destination={destination}
                transportBase={TRANSPORT_BASE_1}
                transportBase2={TRANSPORT_BASE_2}
                onRouteTypeChange={changeRouteType}
                onTravelModeChange={changeTravelMode}
                onRouteVisibilityChange={setShowRoute}
                onSegmentChange={changeActiveSegment}
                onClose={() => setShowSidebar(false)}
              />
            </SheetContent>
          </Sheet>

          {renderContent()}

          <RouteActions
            routeInfo={routeInfo}
            routeType={routeType}
            travelMode={travelMode}
            userLocation={userLocation}
            isLoading={isLoading}
            onClose={handleClose}
            onOpenGoogleMaps={handleOpenGoogleMaps}
          />
        </DialogContent>
      </Dialog>

      {/* Diálogo de permisos */}
      <LocationPermissionDialog
        isOpen={showPermissionDialog}
        onAccept={() => handlePermissionDialogResponse(true)}
        onReject={() => handlePermissionDialogResponse(false)}
        onClose={() => {
          setShowPermissionDialog(false);
          setPendingRouteAction(null);
        }}
      />
    </>
  );
};