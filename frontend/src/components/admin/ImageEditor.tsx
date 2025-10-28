// components/admin/ImageEditor.tsx - VERSIÓN ACTUALIZADA CON MODERACIÓN REAL
import { useState, useRef, useEffect } from 'react';
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
  Image as ImageIcon,
  Loader2,
  Shield,
  CheckCircle,
  Ban,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useModeracionImagen } from '@/hooks/useModeracionImagen';
import { useAdminPlaces } from '@/hooks/useAdminPlaces';

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
  onUpdateDescription: (imageId: string, descripcion: string) => void; // ← CORREGIDO: sin placeId
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

// Componente para mostrar estado de análisis
const AnalysisStatus = ({ 
  status, 
  message 
}: { 
  status: 'idle' | 'analyzing' | 'approved' | 'rejected';
  message?: string;
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'analyzing':
        return {
          icon: Loader2,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          text: 'Analizando...'
        };
      case 'approved':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          text: 'Aprobado'
        };
      case 'rejected':
        return {
          icon: Ban,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          text: 'Rechazado'
        };
      default:
        return {
          icon: Shield,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
          text: 'Pendiente'
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
      config.bgColor,
      config.color
    )}>
      <IconComponent className={cn(
        "h-4 w-4",
        status === 'analyzing' && 'animate-spin'
      )} />
      <span>{message || config.text}</span>
    </div>
  );
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
  const [isAnalyzingDescription, setIsAnalyzingDescription] = useState(false);
  const [descriptionAnalysis, setDescriptionAnalysis] = useState<{
    status: 'idle' | 'analyzing' | 'approved' | 'rejected';
    message?: string;
    detalles?: any;
  }>({ status: 'idle' });
  
  const [imageAnalysis, setImageAnalysis] = useState<{
    status: 'idle' | 'analyzing' | 'approved' | 'rejected';
    message?: string;
  }>({ status: 'idle' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Hooks de moderación
  const { 
    modelo, 
    cargando: cargandoModelo, 
    errorModelo,
    inicializarModelo,
    analizarImagen 
  } = useModeracionImagen();

  // ✅ NUEVO: Hook de admin places con moderación
  const { prevalidarDescripcion } = useAdminPlaces();

  // Inicializar modelo cuando se abre el diálogo
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 Inicializando modelo para ImageEditor...');
      inicializarModelo();
    }
  }, [isOpen, inicializarModelo]);

  // ✅ ACTUALIZADA: Función para analizar la descripción CON EL SERVICIO REAL
  const analyzeDescription = async (text: string): Promise<boolean> => {
    if (!text.trim()) return true;

    setIsAnalyzingDescription(true);
    setDescriptionAnalysis({ 
      status: 'analyzing', 
      message: 'Analizando descripción con filtro de seguridad...' 
    });

    try {
      // ✅ LLAMADA REAL al servicio de moderación
      const resultado = await prevalidarDescripcion(text);
      
      if (resultado.esAprobado) {
        setDescriptionAnalysis({ 
          status: 'approved', 
          message: '✅ Descripción aprobada',
          detalles: resultado.detalles
        });
        return true;
      } else {
        setDescriptionAnalysis({ 
          status: 'rejected', 
          message: resultado.mensaje || 'La descripción contiene contenido inapropiado',
          detalles: resultado.detalles
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Error analizando descripción:', error);
      setDescriptionAnalysis({ 
        status: 'rejected', 
        message: 'Error al conectar con el servicio de moderación' 
      });
      return false;
    } finally {
      setIsAnalyzingDescription(false);
    }
  };

  // ✅ ACTUALIZADA: Función para analizar una imagen
  const analyzeImage = async (file: File): Promise<boolean> => {
    setImageAnalysis({ status: 'analyzing', message: 'Analizando imagen...' });

    try {
      // Si el modelo no está disponible, permitir continuar con advertencia
      if (!modelo && !cargandoModelo) {
        console.warn('⚠️ Modelo de moderación no disponible en ImageEditor');
        toast({
          title: '⚠️ Advertencia de seguridad',
          description: 'El filtro de moderación no está disponible. La imagen será subida sin verificación.',
          variant: 'default',
          duration: 5000,
        });
        setImageAnalysis({ status: 'approved', message: 'Sin análisis - Modelo no disponible' });
        return true;
      }

      // Esperar si el modelo está cargando
      if (cargandoModelo) {
        console.log('🔄 ImageEditor: Esperando a que cargue el modelo...');
        setImageAnalysis({ status: 'analyzing', message: 'Cargando modelo de seguridad...' });
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Analizar la imagen
      const resultado = await analizarImagen(file);

      if (!resultado.esAprobado) {
        let descripcionDetallada = '';
        
        if (resultado.razon?.includes('Porn')) {
          descripcionDetallada = 'La imagen contiene contenido pornográfico';
        } else if (resultado.razon?.includes('Hentai')) {
          descripcionDetallada = 'La imagen contiene contenido de anime/manga inapropiado';
        } else if (resultado.razon?.includes('Sexy')) {
          descripcionDetallada = 'La imagen contiene contenido sugerente';
        } else {
          descripcionDetallada = resultado.razon || 'La imagen no cumple con nuestras políticas';
        }
        
        setImageAnalysis({ 
          status: 'rejected', 
          message: descripcionDetallada 
        });

        toast({
          title: '🚫 Imagen rechazada',
          description: `${descripcionDetallada} (Puntuación: ${resultado.puntuacion})`,
          variant: 'destructive',
          duration: 6000,
        });
        
        return false;
      }

      // Imagen aprobada
      setImageAnalysis({ 
        status: 'approved', 
        message: `Imagen aprobada (${Math.round(resultado.puntuacion * 100)}% seguro)` 
      });

      toast({
        title: '✅ Imagen aprobada',
        description: 'La imagen ha pasado el filtro de seguridad',
        variant: 'default',
      });

      return true;

    } catch (error) {
      console.error('❌ Error analizando imagen:', error);
      
      // En caso de error, permitir subir con advertencia
      setImageAnalysis({ 
        status: 'approved', 
        message: 'Aprobado con advertencia - Error en análisis' 
      });
      
      toast({
        title: '⚠️ Advertencia',
        description: 'No se pudo analizar la imagen completamente. Se subirá sin verificación completa.',
        variant: 'warning',
        duration: 5000,
      });
      
      return true;
    }
  };

  // ✅ ACTUALIZADA: Guardar descripción con moderación real
// ✅ ACTUALIZADA: Guardar descripción con moderación real - CON MÁS LOGS
const handleSaveDescription = async (): Promise<void> => {
  try {
    console.log('💾 DEBUG ImageEditor: Iniciando guardado de descripción', { 
      imageId: image.id, 
      descripcion: description,
      placeId: placeId // ← Verificar que esto tenga valor
    });
    
    // ✅ PRIMERO analizar la descripción
    const descripcionAprobada = await analyzeDescription(description);
    console.log('💾 DEBUG ImageEditor: Resultado análisis descripción:', descripcionAprobada);
    
    if (!descripcionAprobada) {
      console.log('💾 DEBUG ImageEditor: Descripción rechazada por moderación');
      // Mostrar detalles específicos del rechazo si están disponibles
      const mensajeDetallado = descriptionAnalysis.detalles?.sugerencias 
        ? `${descriptionAnalysis.message}\n\nSugerencias:\n${descriptionAnalysis.detalles.sugerencias.join('\n')}`
        : descriptionAnalysis.message;
        
      toast({
        title: '🚫 Descripción rechazada',
        description: mensajeDetallado,
        variant: 'destructive',
        duration: 8000,
      });
      return;
    }

    console.log('💾 DEBUG ImageEditor: Llamando onUpdateDescription');
    await onUpdateDescription(image.id, description);
    
    console.log('💾 DEBUG ImageEditor: Descripción guardada exitosamente');
    setIsEditing(false);
    setDescriptionAnalysis({ status: 'idle' });
    onUpdate();
    
    toast({
      title: '✅ Descripción actualizada',
      description: 'La descripción ha sido guardada y aprobada',
    });
  } catch (error: unknown) {
    console.error('❌ DEBUG ImageEditor: Error en handleSaveDescription:', error);
    const errorMessage = error instanceof Error ? error.message : 'No se pudo actualizar la descripción';
    
    // No mostrar toast si ya es un error de moderación (ya se mostró)
    if (!(error as any).detalles) {
      toast({
        title: '❌ Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }
};

  // ✅ ACTUALIZADA: Manejar selección de archivo con análisis
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('🔄 [ImageEditor] Reemplazando IMAGEN PRINCIPAL:', file.name);

    try {
      // Primero analizar la imagen
      const imagenAprobada = await analyzeImage(file);
      
      if (!imagenAprobada) {
        // Limpiar el input file
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Si la imagen es aprobada, proceder con la subida
      setIsUploading(true);
      await onReplaceMain(placeId, file);
      onUpdate();
      onClose();
      
      toast({
        title: '✅ Imagen reemplazada',
        description: 'La imagen principal se ha reemplazado correctamente',
      });
    } catch (error: unknown) {
      console.error('❌ [ImageEditor] Error reemplazando imagen principal:', error);
      toast({
        title: '❌ Error',
        description: 'Error al reemplazar la imagen principal',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setImageAnalysis({ status: 'idle' });
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
        
        toast({
          title: '✅ Imagen eliminada',
          description: 'La imagen principal ha sido eliminada',
        });
        
      } catch (error: unknown) {
        console.error('❌ Error eliminando imagen principal:', error);
        toast({
          title: '❌ Error',
          description: 'Error al eliminar la imagen principal',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSetAsMain = async (): Promise<void> => {
    try {
      console.log('⭐ Estableciendo como principal:', image.id);
      await onSetMain(image.id);
      onUpdate();
      onClose();
      
      toast({
        title: '✅ Imagen establecida como principal',
        description: 'La imagen se ha establecido como principal correctamente',
      });
    } catch (error: unknown) {
      console.error('❌ Error estableciendo como principal:', error);
      toast({
        title: '❌ Error',
        description: 'Error al establecer la imagen como principal',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteImage = async (): Promise<void> => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta imagen?')) {
      try {
        console.log('🗑️ Eliminando imagen:', image.id);
        await onDelete(image.id);
        onUpdate();
        onClose();
        
        toast({
          title: '✅ Imagen eliminada',
          description: 'La imagen ha sido eliminada de la galería',
        });
      } catch (error: unknown) {
        console.error('❌ Error eliminando imagen:', error);
        toast({
          title: '❌ Error',
          description: 'Error al eliminar la imagen',
          variant: 'destructive',
        });
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setDescription(image.descripcion);
    setDescriptionAnalysis({ status: 'idle' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-auto bg-gradient-to-br from-indigo-50 to-indigo-100 text-black">

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
              className="max-h-48 rounded-lg object-cover border-2 border-gray-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
          </div>

          {/* Información de la imagen */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Descripción</Label>
            {isEditing ? (
              <div className="space-y-3 bg-white p-3 rounded-lg border border-gray-200">
                <Textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    // Resetear análisis cuando el usuario modifica el texto
                    if (descriptionAnalysis.status !== 'idle') {
                      setDescriptionAnalysis({ status: 'idle' });
                    }
                  }}
                  placeholder="Describe esta imagen de manera apropiada..."
                  rows={3}
                  className="resize-none"
                />
                
                {/* Estado de análisis de descripción */}
                {descriptionAnalysis.status !== 'idle' && (
                  <AnalysisStatus 
                    status={descriptionAnalysis.status}
                    message={descriptionAnalysis.message}
                  />
                )}

                {/* ✅ NUEVO: Mostrar sugerencias si la descripción fue rechazada */}
                {descriptionAnalysis.status === 'rejected' && descriptionAnalysis.detalles?.sugerencias && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <h4 className="text-sm font-medium text-yellow-800">
                        Sugerencias para mejorar:
                      </h4>
                    </div>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      {descriptionAnalysis.detalles.sugerencias.map((sugerencia: string, index: number) => (
                        <li key={index}>• {sugerencia}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white flex-1"
                    onClick={handleSaveDescription} 
                    size="sm"
                    disabled={!description.trim() || isAnalyzingDescription}
                  >
                    {isAnalyzingDescription ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Analizando...
                      </>
                    ) : (
                      'Guardar'
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleCancelEdit} 
                    size="sm"
                    disabled={isAnalyzingDescription}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white">
                <p className="text-sm flex-1">{image.descripcion || 'Sin descripción'}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="ml-2"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Información adicional */}
          <div className="text-xs text-gray-600 space-y-1 bg-white p-3 rounded-lg border border-gray-200">
            <div className="flex justify-between">
              <span>Orden:</span>
              <span className="font-medium">{image.orden}</span>
            </div>
            <div className="flex justify-between">
              <span>ID:</span>
              <span className="font-mono">{image.id.substring(0, 8)}...</span>
            </div>
            {image.es_principal && (
              <div className="flex items-center gap-1 text-green-600 font-medium">
                <Star className="h-3 w-3" />
                <span>Imagen principal</span>
              </div>
            )}
          </div>

          {/* Estado del filtro de seguridad */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <Label className="text-sm font-medium text-blue-900">Filtro de Seguridad</Label>
            </div>
            
            <div className="space-y-2">
              {cargandoModelo && (
                <AnalysisStatus 
                  status="analyzing" 
                  message="Cargando modelo de seguridad..." 
                />
              )}
              
              {modelo && (
                <AnalysisStatus 
                  status="approved" 
                  message="Filtro de imágenes activo y listo" 
                />
              )}
              
              {errorModelo && (
                <AnalysisStatus 
                  status="rejected" 
                  message="Filtro no disponible - Se aceptarán todas las imágenes" 
                />
              )}
            </div>
          </div>

          {/* Acciones para imagen principal */}
          {image.es_principal && (
            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-medium">Acciones de Imagen Principal</Label>
              
              {/* Estado de análisis de imagen */}
              {imageAnalysis.status !== 'idle' && (
                <AnalysisStatus 
                  status={imageAnalysis.status}
                  message={imageAnalysis.message}
                />
              )}

              {/* Reemplazar imagen */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start border-green-600 text-green-700 hover:bg-green-50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || imageAnalysis.status === 'analyzing'}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Subiendo...' : 
                   imageAnalysis.status === 'analyzing' ? 'Analizando...' : 
                   'Reemplazar Imagen'}
                </Button>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-xs text-gray-500">
                  Reemplaza esta imagen principal por una nueva (se analizará automáticamente)
                </p>
              </div>

              {/* Eliminar imagen principal */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start border-red-600 text-red-700 hover:bg-red-50"
                  onClick={handleDeleteMainImage}
                  disabled={isUploading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Imagen Principal
                </Button>
                <p className="text-xs text-gray-500">
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
                  className="w-full justify-start bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={handleSetAsMain}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Establecer como Principal
                </Button>
                <p className="text-xs text-gray-500">
                  Convertir esta imagen en la imagen principal del lugar
                </p>
              </div>

              {/* Eliminar imagen */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start border-red-600 text-red-700 hover:bg-red-50"
                  onClick={handleDeleteImage}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Imagen
                </Button>
                <p className="text-xs text-gray-500">
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