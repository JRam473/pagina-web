// components/admin/GalleryManager.tsx - VERSIÓN CON MODERACIÓN DE IMÁGENES
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Upload, 
  X, 
  Star, 
  Trash2, 
  Image as ImageIcon,
  Grid3X3,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAdminPlaces, type GalleryImage } from '@/hooks/useAdminPlaces';
import { ImageEditor } from '@/components/admin/ImageEditor';
import { UploadErrorBoundary } from './UploadErrorBoundary';
import { useModeracionImagen } from '@/hooks/useModeracionImagen';

interface GalleryManagerProps {
  placeId: string;
  placeName: string;
  isOpen: boolean;
  onClose: () => void;
  onGalleryUpdate?: () => void;
}

// Función para construir URLs de imágenes
const buildImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return '/placeholder.svg';
  if (imagePath.startsWith('http')) return imagePath;
  
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${backendUrl}${normalizedPath}`;
};

// Componente de botón de subida seguro
const SafeUploadButton = ({ 
  onClick, 
  disabled, 
  uploading, 
  fileCount 
}: { 
  onClick: () => void;
  disabled: boolean;
  uploading: boolean;
  fileCount: number;
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔄 [SafeUploadButton] Click prevenido y manejado');
    onClick();
  };

  return (
    <UploadErrorBoundary 
      operation="subida de imágenes" 
      fallback={
        <Button
          variant="outline"
          disabled
          className="w-full bg-gray-600 text-white"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Error en subida
        </Button>
      }
    >
      <Button
        onClick={handleClick}
        disabled={disabled}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Subiendo...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Subir {fileCount} Imágenes
          </>
        )}
      </Button>
    </UploadErrorBoundary>
  );
};

export const GalleryManager = ({ 
  placeId, 
  placeName, 
  isOpen, 
  onClose,
  onGalleryUpdate 
}: GalleryManagerProps) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [analyzingFiles, setAnalyzingFiles] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Hook de moderación de imágenes
  const { 
    modelo, 
    cargando: cargandoModelo, 
    errorModelo,
    inicializarModelo,
    analizarImagen 
  } = useModeracionImagen();

  // Usar SOLO las funciones que necesitamos del hook
  const { 
    getGallery, 
    uploadMultipleImages,
    deleteGalleryImage, 
    setMainImage,
    updateImageDescription,
    deleteMainImage,
    replaceMainImage
  } = useAdminPlaces();

  // Inicializar modelo cuando se abre el diálogo
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 Inicializando modelo para GalleryManager...');
      inicializarModelo();
    }
  }, [isOpen, inicializarModelo]);

  // Función para cargar la galería
  const loadGallery = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando galería para placeId:', placeId);
      
      const galleryImages = await getGallery(placeId);
      console.log('✅ Galería cargada:', galleryImages);
      
      setImages(galleryImages || []);
    } catch (error: unknown) {
      console.error('❌ Error cargando galería:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'No se pudo cargar la galería de imágenes';
      
      toast({
        title: '❌ Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [placeId, getGallery, toast]);

  // Cargar galería cuando se abre el diálogo
  useEffect(() => {
    if (isOpen && placeId) {
      loadGallery();
    } else {
      // Limpiar estado cuando se cierra
      setImages([]);
      setSelectedFiles([]);
      setSelectedImage(null);
      setImageEditorOpen(false);
      setUploadError(null);
      setAnalyzingFiles(new Set());
    }
  }, [isOpen, placeId, loadGallery]);

  // Función para abrir el editor de imagen
  const openImageEditor = (image: GalleryImage) => {
    setSelectedImage(image);
    setImageEditorOpen(true);
  };

  // Función para cerrar el editor
  const closeImageEditor = () => {
    setSelectedImage(null);
    setImageEditorOpen(false);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = Array.from(event.target.files || []);
      console.log('📁 Archivos seleccionados:', files.length);
      
      // Validar archivos
      const validFiles = files.filter(file => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (!allowedTypes.includes(file.type)) {
          toast({
            title: 'Tipo de archivo no válido',
            description: `${file.name} no es una imagen válida (JPEG, PNG, WebP)`,
            variant: 'destructive',
          });
          return false;
        }
        
        if (file.size > maxSize) {
          toast({
            title: 'Archivo muy grande',
            description: `${file.name} excede el tamaño máximo de 5MB`,
            variant: 'destructive',
          });
          return false;
        }
        
        return true;
      });
      
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setUploadError(null);
      event.target.value = ''; // Reset input
    } catch (error) {
      console.error('❌ Error seleccionando archivos:', error);
      setUploadError('Error al seleccionar archivos');
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Función para analizar una imagen individual
  const analizarImagenIndividual = async (file: File): Promise<boolean> => {
    try {
      setAnalyzingFiles(prev => new Set(prev).add(file.name));

      // Si el modelo no está disponible, permitir continuar con advertencia
      if (!modelo && !cargandoModelo) {
        console.warn('⚠️ Modelo de moderación no disponible en GalleryManager');
        toast({
          title: '⚠️ Advertencia de seguridad',
          description: 'El filtro de moderación no está disponible. La imagen será subida sin verificación.',
          variant: 'default',
          duration: 5000,
        });
        return true;
      }

      // Esperar si el modelo está cargando
      if (cargandoModelo) {
        console.log('🔄 GalleryManager: Esperando a que cargue el modelo...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Analizar la imagen
      const resultado = await analizarImagen(file);

      if (!resultado.esAprobado) {
        let descripcionDetallada = '';
        
        if (resultado.razon?.includes('Porn')) {
          descripcionDetallada = 'La imagen contiene contenido pornográfico. Por favor, selecciona una imagen apropiada.';
        } else if (resultado.razon?.includes('Hentai')) {
          descripcionDetallada = 'La imagen contiene contenido de anime/manga inapropiado.';
        } else if (resultado.razon?.includes('Sexy')) {
          descripcionDetallada = 'La imagen contiene contenido sugerente. Las imágenes deben ser apropiadas para el turismo familiar.';
        } else {
          descripcionDetallada = resultado.razon || 'La imagen no cumple con nuestras políticas de contenido.';
        }
        
        toast({
          title: '🚫 Imagen rechazada',
          description: (
            <div className="space-y-2">
              <p>{descripcionDetallada}</p>
              <div className="text-xs text-muted-foreground">
                <strong>Archivo:</strong> {file.name}
                <br />
                <strong>Puntuación de seguridad:</strong> {resultado.puntuacion}
              </div>
            </div>
          ),
          variant: 'destructive',
          duration: 8000,
        });
        
        return false;
      }

      // Imagen aprobada
      if (resultado.puntuacion > 0.7) {
        console.log(`✅ Imagen aprobada: ${file.name} (puntuación: ${resultado.puntuacion})`);
      } else {
        console.log(`⚠️ Imagen aprobada con baja puntuación: ${file.name} (${resultado.puntuacion})`);
      }

      return true;

    } catch (error) {
      console.error(`❌ Error analizando imagen ${file.name}:`, error);
      
      // En caso de error, permitir subir con advertencia
      toast({
        title: '⚠️ Advertencia',
        description: `No se pudo analizar "${file.name}". Se subirá sin verificación completa.`,
        variant: 'default',
        duration: 5000,
      });
      
      return true;
    } finally {
      setAnalyzingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.name);
        return newSet;
      });
    }
  };

  const uploadImages = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setUploadError(null);
      console.log('📤 [GalleryManager] Subiendo imágenes a GALERÍA:', selectedFiles.length);

      // Analizar todas las imágenes antes de subir
      const archivosAprobados: File[] = [];
      const archivosRechazados: string[] = [];

      for (const file of selectedFiles) {
        const esAprobado = await analizarImagenIndividual(file);
        if (esAprobado) {
          archivosAprobados.push(file);
        } else {
          archivosRechazados.push(file.name);
        }
      }

      // Si todas las imágenes fueron rechazadas
      if (archivosAprobados.length === 0) {
        toast({
          title: '🚫 Subida cancelada',
          description: 'Todas las imágenes fueron rechazadas por el filtro de seguridad.',
          variant: 'destructive',
          duration: 6000,
        });
        setUploading(false);
        return;
      }

      // Si algunas imágenes fueron rechazadas, mostrar advertencia
      if (archivosRechazados.length > 0) {
        toast({
          title: '⚠️ Algunas imágenes rechazadas',
          description: `${archivosAprobados.length} imágenes aprobadas, ${archivosRechazados.length} rechazadas.`,
          variant: 'default',
          duration: 6000,
        });
      }

      // Subir solo las imágenes aprobadas
      await uploadMultipleImages(placeId, archivosAprobados);
      
      const mensajeExito = archivosRechazados.length === 0 
        ? `${archivosAprobados.length} imágenes agregadas a la galería`
        : `${archivosAprobados.length} imágenes aprobadas agregadas a la galería`;

      toast({
        title: '✅ Éxito',
        description: mensajeExito,
      });
      
      setSelectedFiles([]);
      await loadGallery();
      onGalleryUpdate?.();

    } catch (error: unknown) {
      console.error('❌ [GalleryManager] Error subiendo imágenes a galería:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al subir imágenes';
      setUploadError(errorMessage);
      
      toast({
        title: '❌ Error',
        description: 'Error al subir imágenes',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  // Funciones que se pasarán al ImageEditor
  const handleSetAsMainImage = async (imageId: string) => {
    try {
      console.log('⭐ Estableciendo como principal:', imageId);
      await setMainImage(placeId, imageId);
      await loadGallery();
      onGalleryUpdate?.();
    } catch (error: unknown) {
      console.error('❌ Error estableciendo imagen principal:', error);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    // No permitir eliminar la imagen principal si es la única
    const imageToDelete = images.find(img => img.id === imageId);
    const mainImages = images.filter(img => img.es_principal);
    
    if (imageToDelete?.es_principal && mainImages.length === 1) {
      toast({
        title: '❌ Error',
        description: 'No se puede eliminar la única imagen principal',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('🗑️ Eliminando imagen:', imageId);
      await deleteGalleryImage(placeId, imageId);
      await loadGallery();
      onGalleryUpdate?.();
    } catch (error: unknown) {
      console.error('❌ Error eliminando imagen:', error);
    }
  };

  const handleReplaceMainImage = async (placeIdParam: string, file: File) => {
    try {
      console.log('🔄 Reemplazando imagen principal:', file.name);
      await replaceMainImage(placeIdParam, file);
      await loadGallery();
      onGalleryUpdate?.();
    } catch (error: unknown) {
      console.error('❌ Error reemplazando imagen principal:', error);
    }
  };

  const handleUpdateDescription = async (imageId: string, descripcion: string) => {
    try {
      console.log('📝 Actualizando descripción:', { imageId, descripcion });
      await updateImageDescription(placeId, imageId, descripcion);
      await loadGallery();
    } catch (error: unknown) {
      console.error('❌ Error actualizando descripción:', error);
    }
  };

  const handleDeleteMainImage = async () => {
    if (!selectedImage) return;
    
    try {
      console.log('🗑️ Eliminando imagen principal:', selectedImage.id);
      await deleteMainImage(placeId);
      await loadGallery();
      onGalleryUpdate?.();
      closeImageEditor();
    } catch (error: unknown) {
      console.error('❌ Error eliminando imagen principal:', error);
    }
  };

  // Función para verificar si un archivo está siendo analizado
  const isFileAnalyzing = (fileName: string) => analyzingFiles.has(fileName);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-slate-900/95 backdrop-blur-sm border border-slate-700 shadow-xl text-white">
          <DialogHeader className="pb-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Grid3X3 className="h-5 w-5" />
                Galería de Imágenes - {placeName}
              </DialogTitle>
              
              {/* Indicador de estado del filtro */}
              <div className="flex items-center gap-2">
                {cargandoModelo && (
                  <Badge variant="outline" className="text-yellow-400 border-yellow-400 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Cargando filtro...
                  </Badge>
                )}
                {modelo && (
                  <Badge variant="outline" className="text-green-400 border-green-400 text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Filtro activo
                  </Badge>
                )}
                {errorModelo && (
                  <Badge variant="outline" className="text-red-400 border-red-400 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Filtro no disponible
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col h-[calc(90vh-100px)]">
            {/* Sección de Subida */}
            <UploadErrorBoundary operation="gestión de archivos de galería">
              <Card className="mb-6 bg-slate-800/50 border-slate-600">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Agregar Imágenes a la Galería</Label>
                      <p className="text-sm text-slate-400 mt-1">
                        Puedes seleccionar múltiples imágenes (JPEG, PNG, WebP, máximo 5MB cada una)
                      </p>
                      <div className="mt-2 text-xs text-blue-300">
                        <Shield className="h-3 w-3 inline mr-1" />
                        Todas las imágenes pasan por un filtro de seguridad automático
                      </div>
                    </div>

                    {/* Archivos seleccionados */}
                    {selectedFiles.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm">
                          Imágenes a subir ({selectedFiles.length})
                          {analyzingFiles.size > 0 && (
                            <span className="text-yellow-400 ml-2">
                              • Analizando {analyzingFiles.size}...
                            </span>
                          )}
                        </Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                          {selectedFiles.map((file, index) => (
                            <div
                              key={index}
                              className={cn(
                                "relative group rounded-md p-2 transition-all",
                                isFileAnalyzing(file.name) 
                                  ? "bg-yellow-900/50 border border-yellow-600" 
                                  : "bg-slate-700"
                              )}
                            >
                              <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                className="w-full h-16 object-cover rounded"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSelectedFile(index)}
                                  className="h-8 w-8 p-0 text-white hover:bg-red-500"
                                  disabled={isFileAnalyzing(file.name)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              {isFileAnalyzing(file.name) && (
                                <div className="absolute inset-0 bg-black/70 rounded flex items-center justify-center">
                                  <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
                                </div>
                              )}
                              <p className="text-xs text-slate-300 truncate mt-1">
                                {file.name}
                              </p>
                              {isFileAnalyzing(file.name) && (
                                <p className="text-xs text-yellow-400 text-center">
                                  Analizando...
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* BOTÓN DE SUBIDA SEGURO */}
                        <SafeUploadButton
                          onClick={uploadImages}
                          disabled={uploading || analyzingFiles.size > 0}
                          uploading={uploading}
                          fileCount={selectedFiles.length}
                        />

                        {uploadError && (
                          <Alert variant="destructive" className="mt-2">
                            <AlertDescription className="text-sm">
                              {uploadError}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}

                    {/* Área de drop SEGURA */}
                    <UploadErrorBoundary operation="selección de archivos">
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                          selectedFiles.length === 0 
                            ? "border-slate-500 hover:border-slate-400 bg-slate-800/30 hover:bg-slate-800/50" 
                            : "border-slate-600 bg-slate-800/20"
                        )}
                        onClick={() => {
                          console.log('🖱️ Click en área de drop');
                          fileInputRef.current?.click();
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('📂 Archivos arrastrados:', e.dataTransfer.files.length);
                          const files = Array.from(e.dataTransfer.files);
                          setSelectedFiles(prev => [...prev, ...files]);
                        }}
                      >
                        <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                        <p className="text-sm text-slate-300 mb-1">
                          Arrastra imágenes aquí o haz clic para seleccionar
                        </p>
                        <p className="text-xs text-slate-500">
                          Formatos: JPEG, PNG, WebP • Máximo 5MB por imagen
                        </p>
                        <div className="mt-2 text-xs text-blue-400">
                          <Shield className="h-3 w-3 inline mr-1" />
                          Todas las imágenes serán analizadas por seguridad
                        </div>
                      </div>
                    </UploadErrorBoundary>

                    <Input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </CardContent>
              </Card>
            </UploadErrorBoundary>

            {/* Galería de Imágenes */}
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-sm font-medium">
                  Galería Actual ({images.length} imágenes)
                </Label>
                
                {loading && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Cargando...
                  </div>
                )}
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" />
                  <p className="text-sm text-slate-400 mt-2">Cargando galería...</p>
                </div>
              ) : images.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No hay imágenes en la galería</p>
                  <p className="text-xs mt-1">Agrega imágenes usando el formulario de arriba</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto pr-2">
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      className="relative group bg-slate-800 rounded-lg overflow-hidden border border-slate-700 cursor-pointer"
                      onClick={() => openImageEditor(image)}
                    >
                      {/* Imagen */}
                      <img
                        src={buildImageUrl(image.url_foto)}
                        alt={image.descripcion}
                        className="w-full h-32 object-cover"
                      />

                      {/* Overlay con acciones */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        {/* Badge de imagen principal */}
                        {image.es_principal && (
                          <div className="flex justify-start">
                            <Badge className="bg-amber-500 text-white text-xs">
                              <Star className="h-3 w-3 mr-1 fill-current" />
                              Principal
                            </Badge>
                          </div>
                        )}

                        {/* Acciones */}
                        <div className="flex justify-center gap-1">
                          {!image.es_principal && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetAsMainImage(image.id);
                              }}
                              className="h-7 px-2 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              <Star className="h-3 w-3 mr-1" />
                              Principal
                            </Button>
                          )}
                          
                          {/* No permitir eliminar si es la única imagen principal */}
                          {!(image.es_principal && images.filter(img => img.es_principal).length === 1) && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteImage(image.id);
                              }}
                              className="h-7 px-2 text-xs bg-red-600 hover:bg-red-700 text-white"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Info siempre visible */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2">
                        <p className="text-xs text-white truncate">
                          {image.descripcion || `Imagen ${index + 1}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          Orden: {image.orden}
                        </p>
                        {image.es_principal && (
                          <Star className="h-3 w-3 text-amber-400 absolute top-2 right-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ImageEditor */}
      {selectedImage && (
        <ImageEditor
          image={selectedImage}
          placeId={placeId}
          isOpen={imageEditorOpen}
          onClose={closeImageEditor}
          onUpdate={loadGallery}
          onSetMain={handleSetAsMainImage}
          onDelete={handleDeleteImage}
          onReplaceMain={handleReplaceMainImage}
          onUpdateDescription={handleUpdateDescription}
          onDeleteMain={handleDeleteMainImage}
        />
      )}
    </>
  );
};