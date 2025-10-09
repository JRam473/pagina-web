// components/PlaceGalleryModal.tsx - VERSIÓN CORREGIDA
import { useState, useEffect } from 'react';
import { ImageGalleryModal } from './ImageGalleryModal';
import { usePlaces } from '@/hooks/usePlaces'; // ✅ CAMBIAR: usar usePlaces en lugar de useAdminPlaces
import { Loader2 } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { DialogContent } from '@radix-ui/react-dialog';

interface PlaceGalleryModalProps {
  placeId: string;
  placeName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PlaceGalleryModal = ({
  placeId,
  placeName,
  isOpen,
  onClose
}: PlaceGalleryModalProps) => {
  const [galleryImages, setGalleryImages] = useState<Array<{ 
    id: string; 
    url_foto: string; 
    descripcion: string;
    es_principal?: boolean;
  }>>([]);
  
  const [loading, setLoading] = useState(false);
  const { getPlaceGallery } = usePlaces(); // ✅ CAMBIAR: usar la nueva función

  useEffect(() => {
    const loadGallery = async () => {
      if (!isOpen || !placeId) return;
      
      setLoading(true);
      try {
        console.log('🔄 [PlaceGalleryModal] Cargando galería para:', placeId);
        const images = await getPlaceGallery(placeId);
        console.log('✅ [PlaceGalleryModal] Galería cargada:', images.length, 'imágenes');
        setGalleryImages(images || []);
      } catch (error) {
        console.error('❌ [PlaceGalleryModal] Error loading gallery:', error);
        setGalleryImages([]);
      } finally {
        setLoading(false);
      }
    };

    loadGallery();
  }, [isOpen, placeId, getPlaceGallery]);

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="flex items-center justify-center min-h-[200px]">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Cargando galería...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <ImageGalleryModal
      images={galleryImages}
      initialIndex={0}
      isOpen={isOpen}
      onClose={onClose}
      title={`Galería - ${placeName}`}
    />
  );
};