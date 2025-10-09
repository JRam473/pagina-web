// components/ImageGalleryModal.tsx
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GalleryImage {
  id: string;
  url_foto: string;
  descripcion: string;
  es_principal?: boolean;
  orden?: number;
}

interface ImageGalleryModalProps {
  images: GalleryImage[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export const ImageGalleryModal = ({
  images,
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

  const currentImage = images[currentIndex];
  const hasMultipleImages = images.length > 1;

  // Resetear estado cuando cambia la imagen o se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex]);

  // Navegación con teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

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
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  const goToPrevious = useCallback(() => {
    if (!hasMultipleImages) return;
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
    resetTransform();
  }, [hasMultipleImages, images.length]);

  const goToNext = useCallback(() => {
    if (!hasMultipleImages) return;
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
    resetTransform();
  }, [hasMultipleImages, images.length]);

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

  // Manejo de drag para imágenes zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Limitar el movimiento según el zoom
    const limit = (zoom - 1) * 100;
    setPosition({
      x: Math.max(Math.min(newX, limit), -limit),
      y: Math.max(Math.min(newY, limit), -limit)
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
    resetTransform();
  };

  if (!currentImage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full bg-black/95 backdrop-blur-sm border-0 p-0 overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-4 text-white">
            <h2 className="text-lg font-semibold">{title}</h2>
            <span className="text-sm text-gray-300">
              {currentIndex + 1} / {images.length}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Controles de imagen */}
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

        {/* Navegación entre imágenes */}
        {hasMultipleImages && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-40 text-white hover:bg-white/20 bg-black/50 backdrop-blur-sm"
              title="Imagen anterior (←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-40 text-white hover:bg-white/20 bg-black/50 backdrop-blur-sm"
              title="Siguiente imagen (→)"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </>
        )}

        {/* Imagen principal */}
        <div className="flex-1 flex items-center justify-center p-4 pt-16 pb-24 overflow-hidden">
          <div
            className={cn(
              "relative transition-transform duration-200",
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
        {currentImage.descripcion && (
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-40 max-w-2xl w-full px-4">
            <div className="bg-black/70 backdrop-blur-sm text-white p-4 rounded-lg text-center">
              <p className="text-sm leading-relaxed">{currentImage.descripcion}</p>
            </div>
          </div>
        )}

        {/* Miniaturas */}
        {images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex gap-2 justify-center overflow-x-auto pb-2">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => handleThumbnailClick(index)}
                  className={cn(
                    "flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all duration-200",
                    index === currentIndex
                      ? "border-white ring-2 ring-white"
                      : "border-gray-600 hover:border-gray-400 opacity-70 hover:opacity-100"
                  )}
                >
                  <img
                    src={image.url_foto}
                    alt={`Miniatura ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Overlay para cerrar al hacer click fuera de la imagen */}
        <div
          className="absolute inset-0 z-30"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        />

        {/* Indicadores de zoom y rotación */}
        {(zoom !== 1 || rotation !== 0) && (
          <div className="absolute top-16 right-4 z-40 bg-black/70 text-white px-3 py-2 rounded-lg text-sm backdrop-blur-sm">
            {zoom > 1 && <span>Zoom: {zoom.toFixed(1)}x</span>}
            {rotation !== 0 && (
              <span className={zoom > 1 ? "ml-3 border-l border-gray-600 pl-3" : ""}>
                Rotación: {rotation}°
              </span>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};