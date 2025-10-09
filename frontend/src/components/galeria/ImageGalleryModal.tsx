// components/ImageGalleryModal.tsx - VERSIÓN CON CARGA INTEGRADA
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, RotateCw, Download, Grid3X3, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlaces } from '@/hooks/usePlaces';

interface GalleryImage {
  id: string;
  url_foto: string;
  descripcion: string;
  es_principal?: boolean;
  orden?: number;
}

interface ImageGalleryModalProps {
  placeId: string; // ✅ CAMBIO: Ahora recibe placeId en lugar de images
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export const ImageGalleryModal = ({
  placeId, // ✅ CAMBIO: Nuevo prop
  initialIndex = 0,
  isOpen,
  onClose,
  title = 'Galería de imágenes'
}: ImageGalleryModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showGalleryInfo, setShowGalleryInfo] = useState(true);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

   // ✅ CAMBIO: Usar getPlaceGallery en lugar de getGallery
  const { getPlaceGallery } = usePlaces();

  const currentImage = galleryImages[currentIndex];
  const hasMultipleImages = galleryImages.length > 1;

  // ✅ CORREGIDO: Cargar galería con getPlaceGallery que SÍ procesa URLs
  useEffect(() => {
    const loadGallery = async () => {
      if (!isOpen || !placeId) return;
      
      try {
        setLoading(true);
        setError(null);
        console.log('🔄 [ImageGalleryModal] Cargando galería para placeId:', placeId);
        
        // ✅ CAMBIO: Usar getPlaceGallery que procesa URLs correctamente
        const images = await getPlaceGallery(placeId);
        console.log('✅ [ImageGalleryModal] Galería cargada:', images?.length, 'imágenes');
        
        setGalleryImages(images || []);
        
        // Resetear índice si es necesario
        if (initialIndex >= (images?.length || 0)) {
          setCurrentIndex(0);
        } else {
          setCurrentIndex(initialIndex);
        }
      } catch (err) {
        console.error('❌ [ImageGalleryModal] Error cargando galería:', err);
        setError('Error al cargar la galería de imágenes');
        setGalleryImages([]);
      } finally {
        setLoading(false);
      }
    };

    loadGallery();
  }, [isOpen, placeId, getPlaceGallery, initialIndex]);

  // Resetear estado cuando cambia la imagen o se abre/cierra el modal
  useEffect(() => {
    if (isOpen && galleryImages.length > 0) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setShowGalleryInfo(true);
      
      // Ocultar información después de 3 segundos
      const timer = setTimeout(() => {
        setShowGalleryInfo(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentIndex, galleryImages.length]);

  // Mostrar información temporalmente cuando cambia la imagen
  useEffect(() => {
    if (galleryImages.length > 0) {
      setShowGalleryInfo(true);
      const timer = setTimeout(() => {
        setShowGalleryInfo(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [currentIndex, galleryImages.length]);

  // Navegación con teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || galleryImages.length === 0) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case 'r':
        case 'R':
          handleRotate();
          break;
        case '0':
          resetTransform();
          break;
        case ' ':
          setShowGalleryInfo(prev => !prev);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, galleryImages.length]);

  const goToPrevious = useCallback(() => {
    if (!hasMultipleImages) return;
    setCurrentIndex(prev => (prev === 0 ? galleryImages.length - 1 : prev - 1));
    resetTransform();
  }, [hasMultipleImages, galleryImages.length]);

  const goToNext = useCallback(() => {
    if (!hasMultipleImages) return;
    setCurrentIndex(prev => (prev === galleryImages.length - 1 ? 0 : prev + 1));
    resetTransform();
  }, [hasMultipleImages, galleryImages.length]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 1));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const resetTransform = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleDownload = () => {
    if (!currentImage) return;
    
    const link = document.createElement('a');
    link.href = currentImage.url_foto;
    link.download = `imagen-${currentIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    const limit = (zoom - 1) * 100;
    setPosition({
      x: Math.max(Math.min(newX, limit), -limit),
      y: Math.max(Math.min(newY, limit), -limit)
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const toggleGalleryInfo = () => {
    setShowGalleryInfo(prev => !prev);
  };

  // ✅ NUEVO: Estados de carga y error
  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full bg-black/95 backdrop-blur-sm border-0 p-0 overflow-hidden flex items-center justify-center">
          <div className="text-white text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-300">Cargando galería...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full bg-black/95 backdrop-blur-sm border-0 p-0 overflow-hidden flex items-center justify-center">
          <div className="text-white text-center">
            <p className="text-lg mb-4">❌ Error</p>
            <p className="text-sm text-gray-300 mb-4">{error}</p>
            <Button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!currentImage || galleryImages.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full bg-black/95 backdrop-blur-sm border-0 p-0 overflow-hidden flex items-center justify-center">
          <div className="text-white text-center">
            <p className="text-lg mb-4">📷</p>
            <p className="text-sm text-gray-300">No hay imágenes en la galería</p>
            <Button
              onClick={onClose}
              className="mt-4 bg-gray-600 hover:bg-gray-700"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full bg-black/95 backdrop-blur-sm border-0 p-0 overflow-hidden">
        {/* Header - Solo visible cuando showGalleryInfo es true */}
        {showGalleryInfo && (
          <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent animate-in fade-in duration-300">
            <div className="flex items-center gap-4 text-white">
              <h2 className="text-lg font-semibold">{title}</h2>
              <span className="text-sm text-gray-300">
                {currentIndex + 1} / {galleryImages.length}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="text-white hover:bg-white/20"
                title="Descargar imagen"
              >
                <Download className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRotate}
                className="text-white hover:bg-white/20"
                title="Rotar imagen (R)"
              >
                <RotateCw className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                className="text-white hover:bg-white/20 disabled:opacity-50"
                title="Zoom out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="text-white hover:bg-white/20 disabled:opacity-50"
                title="Zoom in (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={resetTransform}
                disabled={zoom === 1 && rotation === 0}
                className="text-white hover:bg-white/20 disabled:opacity-50"
                title="Reset transformación (0)"
              >
                <span className="text-sm">⟲</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
                title="Cerrar (ESC)"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Botón para alternar visibilidad de información */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleGalleryInfo}
          className={cn(
            "absolute top-4 left-1/2 transform -translate-x-1/2 z-50 text-white hover:bg-white/20 bg-black/50 backdrop-blur-sm transition-all duration-300",
            showGalleryInfo ? "opacity-100" : "opacity-70 hover:opacity-100"
          )}
          title="Alternar información (Espacio)"
        >
          <Grid3X3 className="w-4 h-4" />
        </Button>

        {/* Navegación entre imágenes */}
        {hasMultipleImages && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevious}
              className={cn(
                "absolute left-4 top-1/2 transform -translate-y-1/2 z-40 text-white hover:bg-white/20 bg-black/50 backdrop-blur-sm transition-all duration-300",
                showGalleryInfo ? "opacity-100" : "opacity-50 hover:opacity-100"
              )}
              title="Imagen anterior (←)"
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              className={cn(
                "absolute right-4 top-1/2 transform -translate-y-1/2 z-40 text-white hover:bg-white/20 bg-black/50 backdrop-blur-sm transition-all duration-300",
                showGalleryInfo ? "opacity-100" : "opacity-50 hover:opacity-100"
              )}
              title="Siguiente imagen (→)"
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          </>
        )}

        {/* Imagen principal */}
        <div 
          className="w-full h-full flex items-center justify-center overflow-hidden cursor-default"
          onDoubleClick={toggleGalleryInfo}
        >
          <div
            className={cn(
              "relative transition-transform duration-200 max-w-full max-h-full",
              isDragging ? "cursor-grabbing" : zoom > 1 ? "cursor-grab" : "cursor-default"
            )}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
              transformOrigin: 'center center'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              src={currentImage.url_foto}
              alt={currentImage.descripcion}
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
            />
          </div>
        </div>

        {/* Descripción de la imagen */}
        {showGalleryInfo && currentImage.descripcion && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40 max-w-2xl w-full px-4 animate-in fade-in duration-300">
            <div className="bg-black/70 backdrop-blur-sm text-white p-4 rounded-lg text-center">
              <p className="text-sm leading-relaxed">{currentImage.descripcion}</p>
            </div>
          </div>
        )}

        {/* Indicador de posición */}
        {showGalleryInfo && hasMultipleImages && (
          <div className="absolute bottom-4 right-4 z-40 bg-black/70 text-white px-3 py-2 rounded-lg text-sm backdrop-blur-sm animate-in fade-in duration-300">
            <span>{currentIndex + 1} / {galleryImages.length}</span>
          </div>
        )}

        {/* Indicadores de zoom y rotación */}
        {showGalleryInfo && (zoom !== 1 || rotation !== 0) && (
          <div className="absolute top-16 right-4 z-40 bg-black/70 text-white px-3 py-2 rounded-lg text-sm backdrop-blur-sm animate-in fade-in duration-300">
            {zoom > 1 && <span>Zoom: {zoom.toFixed(1)}x</span>}
            {rotation !== 0 && (
              <span className={zoom > 1 ? "ml-3 border-l border-gray-600 pl-3" : ""}>
                Rotación: {rotation}°
              </span>
            )}
          </div>
        )}

        {/* Overlay para cerrar */}
        <div
          className="absolute inset-0 z-30"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        />

        {/* Indicador de navegación táctil */}
        {hasMultipleImages && (
          <div className="absolute inset-0 z-20 flex justify-between items-center pointer-events-none">
            <div className="h-full w-1/4 flex items-center justify-start opacity-0 hover:opacity-100 transition-opacity">
              <div className="bg-black/30 text-white p-2 rounded-full ml-4 pointer-events-auto">
                <ChevronLeft className="w-6 h-6" />
              </div>
            </div>
            <div className="h-full w-1/4 flex items-center justify-end opacity-0 hover:opacity-100 transition-opacity">
              <div className="bg-black/30 text-white p-2 rounded-full mr-4 pointer-events-auto">
                <ChevronRight className="w-6 h-6" />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};