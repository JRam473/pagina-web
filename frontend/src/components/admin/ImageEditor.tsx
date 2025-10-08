// components/admin/ImageEditor.tsx - VERSIÓN CORREGIDA SIN ERRORES
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Edit, 
  Trash2, 
  Star, 
  Upload,
  Image as ImageIcon
} from 'lucide-react'; // ← QUITÉ 'X' que no se usa
import { useToast } from '@/hooks/use-toast';

interface ImageEditorProps {
  image: {
    id: string;
    url_foto: string;
    descripcion: string;
    es_principal: boolean;
    orden: number;
  };
  placeId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onSetMain: (imageId: string) => void;
  onDelete: (imageId: string) => void;
  onReplaceMain: (placeId: string, file: File) => void;
  onUpdateDescription: (imageId: string, descripcion: string) => void;
  onDeleteMain: () => void;
}

// Función para construir URLs de imágenes
const buildImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return '/placeholder.svg';
  
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  
  return `${backendUrl}${normalizedPath}`;
};

export const ImageEditor = ({ 
  image, 
  placeId, 
  isOpen, 
  onClose, 
  onUpdate, 
  onSetMain, 
  onDelete,
  onReplaceMain,
  onUpdateDescription,
  onDeleteMain 
}: ImageEditorProps) => {
  const [description, setDescription] = useState(image.descripcion);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSaveDescription = async (): Promise<void> => {
    try {
      console.log('💾 Guardando descripción:', { imageId: image.id, descripcion: description });
      
      await onUpdateDescription(image.id, description);
      
      setIsEditing(false);
      onUpdate();
      
      toast({
        title: '✅ Descripción actualizada',
        description: 'La descripción se ha guardado correctamente',
      });
    } catch (error: unknown) {
      console.error('❌ Error guardando descripción:', error);
      const errorMessage = error instanceof Error ? error.message : 'No se pudo actualizar la descripción';
      toast({
        title: '❌ Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
  const file = event.target.files?.[0];
  if (!file) return;

  console.log('🔄 [ImageEditor] Reemplazando IMAGEN PRINCIPAL:', file.name);

  try {
    setIsUploading(true);
    await onReplaceMain(placeId, file);
    onUpdate();
    onClose();
  } catch (error: unknown) {
    console.error('❌ [ImageEditor] Error reemplazando imagen principal:', error);
  } finally {
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
};

  const handleDeleteMainImage = async (): Promise<void> => {
    if (window.confirm('¿Estás seguro de que quieres eliminar la imagen principal? Se seleccionará automáticamente otra imagen como principal si está disponible.')) {
      try {
        console.log('🗑️ Eliminando imagen principal:', image.id);
        
        await onDeleteMain();
        onUpdate();
        onClose();
        
      } catch (error: unknown) {
        console.error('❌ Error eliminando imagen principal:', error);
        // El toast se maneja en la función padre
      }
    }
  };

  const handleSetAsMain = async (): Promise<void> => {
    try {
      console.log('⭐ Estableciendo como principal:', image.id);
      await onSetMain(image.id);
      onUpdate();
      onClose();
    } catch (error: unknown) {
      console.error('❌ Error estableciendo como principal:', error);
      // El toast se maneja en la función padre
    }
  };

  const handleDeleteImage = async (): Promise<void> => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta imagen?')) {
      try {
        console.log('🗑️ Eliminando imagen:', image.id);
        await onDelete(image.id);
        onUpdate();
        onClose();
      } catch (error: unknown) {
        console.error('❌ Error eliminando imagen:', error);
        // El toast se maneja en la función padre
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-br from-emerald-100 to-cyan-800 text-black">

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {image.es_principal ? 'Imagen Principal' : 'Editar Imagen'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vista previa de la imagen */}
          <div className="flex justify-center">
            <img 
              src={buildImageUrl(image.url_foto)}
              alt={image.descripcion}
              className="max-h-48 rounded-lg object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
          </div>

          {/* Información de la imagen */}
          <div className="space-y-2">
            <Label>Descripción</Label>
            {isEditing ? (
              <div className="space-y-2 bg-slate-50 p-2 rounded">
                <Textarea
                className='bg-white'
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe esta imagen..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button 
                  variant="outline"
                  className='bg-green-900 text-white hover:bg-green-800'
                    onClick={handleSaveDescription} 
                    size="sm"
                    disabled={!description.trim()}
                  >
                    Guardar
                  </Button>
                  <Button 
                  className='bg-red-700 text-white hover:bg-red-600'
                    variant="outline" 
                    onClick={() => {
                      setIsEditing(false);
                      setDescription(image.descripcion);
                    }} 
                    size="sm"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 border rounded">
                <p className="text-sm flex-1">{image.descripcion || 'Sin descripción'}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Información adicional */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Orden: {image.orden}</p>
            <p>ID: {image.id.substring(0, 8)}...</p>
            {image.es_principal && (
              <p className="text-green-600 font-medium">⭐ Imagen principal</p>
            )}
          </div>

          {/* Acciones para imagen principal */}
          {image.es_principal && (
            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-medium">Acciones de Imagen Principal</Label>
              
              {/* Reemplazar imagen */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-green-900 text-white hover:bg-green-800"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Subiendo...' : 'Reemplazar Imagen'}
                </Button>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground">
                  Reemplaza esta imagen principal por una nueva
                </p>
              </div>

              {/* Eliminar imagen principal */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-red-900 text-white hover:bg-red-800"
                  onClick={handleDeleteMainImage}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Imagen Principal
                </Button>
                <p className="text-xs text-muted-foreground">
                  Se seleccionará automáticamente otra imagen como principal si está disponible
                </p>
              </div>
            </div>
          )}

          {/* Acciones para imágenes no principales */}
          {!image.es_principal && (
            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-medium">Acciones</Label>
              
              {/* Establecer como principal */}
              <div className="space-y-2">
                <Button
                  className="w-full justify-start bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={handleSetAsMain}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Establecer como Principal
                </Button>
                <p className="text-xs text-muted-foreground">
                  Convertir esta imagen en la imagen principal del lugar
                </p>
              </div>

              {/* Eliminar imagen */}
              <div className="space-y-2">
                <Button
                  variant="destructive"
                  className="w-full justify-start bg-red-900 text-white hover:bg-red-800"
                  onClick={handleDeleteImage}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Imagen
                </Button>
                <p className="text-xs text-muted-foreground">
                  Elimina permanentemente esta imagen de la galería
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};