// components/admin/AdminPlaces.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { GalleryManager } from '@/components/admin/GalleryManager';
import { Grid3X3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdminPlaces, type Place } from '@/hooks/useAdminPlaces';
import { useCategories } from '@/hooks/useCategories';
import { CategoryDropdown } from '@/components/admin/CategoryDropdown';
import { CategoryFilter } from '@/components/admin/CategoryFilter';
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash2, 
  MoreVertical, 
  MapPin, 
  Search, 
  FileText,
  RefreshCw,
  Star,
  BarChart3,
  Upload,
  X,
  Shield
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { MapLocationSelector } from '@/components/admin/MapLocationSelector';
import { ExpandableText } from '@/components/ui/ExpandableText';
import { FormErrorBoundary } from './FormErrorBoundary';
import { AdminErrorBoundary } from './AdminErrorBoundary';
import { useModeracionImagen } from '@/hooks/useModeracionImagen';
import { useToast } from '@/hooks/use-toast';

// Función para construir la URL completa de la imagen
const buildImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return '/placeholder.svg';
  if (imagePath.startsWith('http')) return imagePath;
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${backendUrl}${normalizedPath}`;
};

// Función helper para manejar números de forma segura
const safeToFixed = (value: unknown, decimals: number): string => {
  if (value === null || value === undefined) return '0.0';
  const num = Number(value);
  return isNaN(num) ? '0.0' : num.toFixed(decimals);
};

// Componente de Rating Estilizado
const AdminRating = ({ rating, totalRatings }: { rating: number | null; totalRatings?: number }) => {
  const numericRating = rating || 0;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className="w-3 h-3"
          fill={star <= numericRating ? "#f59e0b" : "none"}
          color={star <= numericRating ? "#f59e0b" : "#d1d5db"}
        />
      ))}
      <span className="text-sm font-medium ml-1">{safeToFixed(rating, 1)}</span>
      {totalRatings && totalRatings > 0 && (
        <span className="text-xs text-muted-foreground">({totalRatings})</span>
      )}
    </div>
  );
};

// Componente de Card Mejorada usando ExpandableText
const PlaceCard = ({ 
  place, 
  onEdit, 
  onDelete,
  onManageGallery
}: { 
  place: Place;
  onEdit: (place: Place) => void;
  onDelete: (place: Place) => void;
  onManageGallery: (place: Place) => void;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { getCategoryColor } = useCategories();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group h-full flex"
    >
      <Card className="overflow-hidden shadow-card hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50/50 flex flex-col w-full">
        <div className="relative h-48 overflow-hidden flex-shrink-0">
          {place.image_url ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
              )}
              <img
                src={buildImageUrl(place.image_url)}
                alt={place.name || 'Lugar turístico'}
                className={cn(
                  "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                )}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
              <MapPin className="h-12 w-12 text-blue-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
          <div className="absolute top-3 left-3">
            <Badge className={cn(getCategoryColor(place.category), "text-white border-0 shadow-md")}>
              {place.category || 'Turismo'}
            </Badge>
          </div>
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
              <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
              {safeToFixed(place.average_rating, 1)}
            </Badge>
          </div>
        </div>
        <CardContent className="p-4 flex flex-col flex-1 min-h-0">
          <div className="space-y-3 flex flex-col flex-1">
            <div className="flex items-start justify-between flex-shrink-0">
              <h3 className="font-semibold text-lg leading-tight line-clamp-2 text-gray-900 break-words">
                {place.name || 'Sin nombre'}
              </h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button title='Opciones del lugar'
                  variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white/90 backdrop-blur-sm border border-white/20 shadow-lg">
                  <DropdownMenuItem onClick={() => onEdit(place)}
                    title='Editar información del lugar'>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Lugar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onManageGallery(place)}
                    title='Gestionar galería de imágenes del lugar'>
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    Gestionar Galería
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                  title='Eliminar lugar y todos sus datos asociados (imágenes, PDF, etc.)'
                    onClick={() => onDelete(place)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2"/>
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center text-sm text-muted-foreground flex-shrink-0">
              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="line-clamp-1 break-words">
                {place.location || 'Ubicación no especificada'}
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <ExpandableText 
                text={place.description || ''} 
                maxLength={120}
                className="text-gray-600"
              />
            </div>
            <div className="flex items-center justify-between pt-2 flex-shrink-0">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  {place.total_ratings || 0} calificaciones
                </div>
                {place.pdf_url && (
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    PDF
                  </div>
                )}
              </div>
              <AdminRating 
                rating={place.average_rating} 
                totalRatings={place.total_ratings} 
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface PlaceFormData {
  name: string;
  description: string;
  image_url?: string;
  pdf_url?: string;
  location: string;
  category: string;
}

interface FileState {
  image: File | null;
  pdf: File | null;
}

// ✅ FUNCIÓN PARA PARSEAR ERRORES DE MODERACIÓN

export const AdminPlaces = () => {
  const {
    places,
    loading,
    createPlace,
    updatePlace,           // ✅ ACTUALIZADO: Ahora acepta opciones
    updatePlaceFast,       // ✅ NUEVO: Para actualizaciones rápidas
    updatePlaceMetadata,   // ✅ NUEVO: Solo ubicación/categoría
    validarCambiosLugar,   // ✅ NUEVO: Validación previa
    analizarCambios,       // ✅ NUEVO: Análisis de cambios
    deletePlace,
    deletePlaceImage,
    deletePlacePDF,
    uploadPlaceImage,
    uploadPlacePDF,
    refetch,
    clearError
  } = useAdminPlaces();
  const {
    categories,
    selectedCategory,
    setSelectedCategory,
    getCategoryColor
  } = useCategories();

  // Hook de moderación de imágenes
  const { 
    modelo, 
    cargando: cargandoModelo, 
    errorModelo,
    modeloCargado,
    inicializarModelo,
    analizarImagen 
  } = useModeracionImagen();

  // Hook de toast
  const { toast } = useToast();

  const [galleryManagerOpen, setGalleryManagerOpen] = useState(false);
  const [selectedPlaceForGallery, setSelectedPlaceForGallery] = useState<Place | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [formData, setFormData] = useState<PlaceFormData>({
    name: '',
    description: '',
    category: '',
    location: '',
    image_url: '',
    pdf_url: ''
  });
  const [files, setFiles] = useState<FileState>({
    image: null,
    pdf: null
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // ✅ ELIMINADO: Estado para errores de moderación (ya no se muestran en el formulario)
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);



  // ✅ EFECTO PARA MOSTRAR TOASTS DE MODERACIÓN DE IMÁGENES
  useEffect(() => {
    if (errorModelo) {
      toast({
        title: '⚠️ Filtro de seguridad no disponible',
        description: 'Las imágenes se subirán sin análisis de contenido inapropiado',
        variant: 'warning',
        duration: 6000,
      });
    }
  }, [errorModelo, toast]);

  useEffect(() => {
    refetch();
    console.log('🚀 Inicializando modelo...');
    inicializarModelo();
  }, [refetch, inicializarModelo]);

  const filteredPlaces = places.filter(place => {
    const matchesSearch = (place.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         place.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || place.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      location: '',
      image_url: '',
      pdf_url: ''
    });
    setFiles({ image: null, pdf: null });
    setFormErrors({});
    setEditingPlace(null);
  };

  const handleLocationSelect = (location: { address: string; lat: number; lng: number }) => {
    setFormData(prev => ({ ...prev, location: location.address }));
  };

// ✅ CORREGIDO: Validación mejorada para modo edición
const validateForm = (): boolean => {
  const errors: Record<string, string> = {};
  
  if (!editingPlace) {
    // ✅ VALIDACIÓN PARA NUEVO LUGAR (completa)
    if (!formData.name?.trim()) errors.name = 'El nombre es requerido';
    if (!formData.description?.trim()) errors.description = 'La descripción es requerida';
    if (!formData.category) errors.category = 'La categoría es requerida';
    if (!formData.location?.trim()) errors.location = 'La ubicación es requerida';
    if (!files.image) errors.image = 'La imagen es requerida para crear un nuevo lugar';
  } else {
    // ✅ VALIDACIÓN MEJORADA PARA EDICIÓN - solo validar campos modificados
    const cambios = analizarCambios(editingPlace, formData);
    
    console.log('🔍 Validando en modo edición:', {
      cambios: cambios.camposModificados,
      tieneArchivos: !!files.image || !!files.pdf
    });

    // Solo validar nombre si se está modificando y está vacío
    if (cambios.nombreModificado) {
      if (!formData.name?.trim()) {
        errors.name = 'El nombre no puede estar vacío';
      }
    }
    
    // Solo validar descripción si se está modificando y está vacía
    if (cambios.descripcionModificada) {
      if (!formData.description?.trim()) {
        errors.description = 'La descripción no puede estar vacía';
      }
    }
    
    // Solo validar categoría si se está modificando y está vacía
    if (cambios.categoriaModificada) {
      if (!formData.category) {
        errors.category = 'La categoría es requerida';
      }
    }
    
    // Solo validar ubicación si se está modificando y está vacía
    if (cambios.ubicacionModificada) {
      if (!formData.location?.trim()) {
        errors.location = 'La ubicación no puede estar vacía';
      }
    }

    // ✅ NUEVO: Validar imagen solo si se está reemplazando
    if (files.image) {
      // Validaciones de imagen (tipo, tamaño) pero no requerida
      if (!files.image.type.startsWith('image/')) {
        errors.image = 'El archivo debe ser una imagen';
      } else if (files.image.size > 5 * 1024 * 1024) {
        errors.image = 'La imagen no debe superar los 5MB';
      }
    }
  }
  
  setFormErrors(errors);
  
  console.log('📋 Resultado validación:', {
    errores: Object.keys(errors),
    modo: editingPlace ? 'edición' : 'creación'
  });
  
  return Object.keys(errors).length === 0;
};

// ✅ MEJORADO: Función getFieldError actualizada
const getFieldError = (field: 'name' | 'description' | 'category' | 'location' | 'image'): string | undefined => {
  // En modo edición, solo mostrar errores para campos que se están modificando
  if (editingPlace) {
    const cambios = analizarCambios(editingPlace, formData);
    
    switch (field) {
      case 'name':
        if (!cambios.nombreModificado) return undefined;
        break;
      case 'description':
        if (!cambios.descripcionModificada) return undefined;
        break;
      case 'category':
        if (!cambios.categoriaModificada) return undefined;
        break;
      case 'location':
        if (!cambios.ubicacionModificada) return undefined;
        break;
      case 'image':
        // Para imagen, solo validar si se está subiendo una nueva
        if (!files.image) return undefined;
        break;
    }
  }
  
  return formErrors[field];
};


  const handleFileChange = async (type: 'image' | 'pdf', file: File | null) => {
    if (type === 'image' && file) {
      // Verificar tipo de archivo
      if (!file.type.startsWith('image/')) {
        setFormErrors(prev => ({ 
          ...prev, 
          image: 'El archivo debe ser una imagen' 
        }));
        return;
      }

      // Verificar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFormErrors(prev => ({ 
          ...prev, 
          image: 'La imagen no debe superar los 5MB' 
        }));
        return;
      }

      try {
        setIsProcessing(true);
        
        // Si el modelo no está inicializado, permitir subir sin análisis
        if (!modelo && !cargandoModelo) {
          console.warn('⚠️ Modelo de moderación no disponible');
          setFiles(prev => ({ ...prev, [type]: file }));
          setFormErrors(prev => ({ ...prev, [type]: '' }));
          setIsProcessing(false);
          return;
        }

        // Si el modelo está cargando, esperar un momento
        if (cargandoModelo) {
          console.log('🔄 Esperando a que cargue el modelo...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // Analizar imagen con el modelo NSFW
        const resultado = await analizarImagen(file);
        
        if (!resultado.esAprobado) {
          // ✅ MOSTRAR TOAST EN LUGAR DE ERROR EN FORMULARIO
          toast({
            title: '🚫 Imagen rechazada',
            description: `La imagen contiene contenido inapropiado: ${resultado.razon}`,
            variant: 'destructive',
            duration: 6000,
          });
          setFormErrors(prev => ({ ...prev, [type]: '' }));
          setIsProcessing(false);
          return;
        }

        // Si la imagen es apropiada, establecer el archivo
        setFiles(prev => ({ ...prev, [type]: file }));
        setFormErrors(prev => ({ ...prev, [type]: '' }));

        // ✅ MOSTRAR TOAST DE ÉXITO
        toast({
          title: '✅ Imagen aprobada',
          description: 'La imagen ha pasado el filtro de seguridad',
          variant: 'default',
        });

      } catch (error) {
        console.error('Error analizando imagen:', error);
        // En caso de error, permitir subir la imagen con advertencia
        setFiles(prev => ({ ...prev, [type]: file }));
        setFormErrors(prev => ({ ...prev, [type]: '' }));
        
        toast({
          title: '⚠️ Advertencia de seguridad',
          description: 'No se pudo analizar la imagen completamente. Se subirá sin verificación.',
          variant: 'warning',
        });
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Para PDFs o cuando se elimina un archivo
      setFiles(prev => ({ ...prev, [type]: file }));
      if (file) {
        setFormErrors(prev => ({ ...prev, [type]: '' }));
      }
    }
  };

    /**
   * ✅ MEJORADO: Detectar cambios de forma inteligente
   */
const hasFormChanges = useCallback((): boolean => {
  if (!editingPlace) {
    return !!(formData.name?.trim() || 
              formData.description?.trim() || 
              formData.category || 
              formData.location?.trim() ||
              files.image || 
              files.pdf);
  }
  
  // ✅ USAR LA FUNCIÓN DEL HOOK PARA ANÁLISIS PRECISO
  const cambios = analizarCambios(editingPlace, formData);
  return cambios.camposModificados.length > 0 || !!files.image || !!files.pdf;
}, [editingPlace, formData, files, analizarCambios]);


 /**
   * ✅ MEJORADO: Manejar envío con estrategias inteligentes Y manejo de errores de moderación
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSubmitting || isProcessing) {
      toast({
        title: '⏳ Operación en curso',
        description: 'Ya hay una operación en proceso. Por favor espera.',
        variant: 'warning',
      });
      return;
    }

    console.log('🎯 [SUBMIT] Iniciando proceso inteligente...');
    
    setIsSubmitting(true);
    setIsProcessing(true);
    
    try {
      // ✅ CASO 1: CREAR NUEVO LUGAR
      if (!editingPlace) {
        console.log('🆕 [SUBMIT] Creando nuevo lugar...');
        
        if (!validateForm()) {
          console.log('❌ [VALIDATION] Validación fallida para nuevo lugar');
          setIsSubmitting(false);
          setIsProcessing(false);
          return;
        }

        const placeData: PlaceFormData = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          category: formData.category,
          location: formData.location.trim(),
        };

        console.log('📤 [CREATE] Creando lugar con datos básicos...');
        const savedPlace = await createPlace(placeData, files.image || undefined);
        
        if (!savedPlace?.id) {
          throw new Error('No se pudo obtener el ID del lugar creado');
        }

        // ✅ SUBIR PDF SI EXISTE
        if (files.pdf) {
          try {
            console.log('📄 [UPLOAD] Subiendo PDF para nuevo lugar...');
            await uploadPlacePDF(savedPlace.id, files.pdf);
            console.log('✅ [UPLOAD] PDF subido correctamente');
          } catch (err) {
            console.error('❌ [UPLOAD] Error subiendo PDF:', err);
            // El error se maneja automáticamente en el hook
          }
        }

        toast({
          title: '✅ Lugar creado',
          description: 'El lugar se ha creado exitosamente',
        });

      } 
      // ✅ CASO 2: EDITAR LUGAR EXISTENTE
      else {
        console.log('✏️ [SUBMIT] Editando lugar existente...');
        
        // ✅ ANÁLISIS INTELIGENTE DE CAMBIOS
        const analisis = analizarCambios(editingPlace, formData);
        console.log('🔍 Análisis de cambios:', analisis);

        // ✅ ESTRATEGIA 1: SOLO SUBIR ARCHIVOS (sin cambios en datos)
        if (analisis.camposModificados.length === 0 && (files.image || files.pdf)) {
          console.log('📤 [STRATEGY] Solo subiendo archivos...');
          
          const uploadPromises = [];
          
          if (files.image) {
            uploadPromises.push(uploadPlaceImage(editingPlace.id, files.image));
          }
          
          if (files.pdf) {
            uploadPromises.push(uploadPlacePDF(editingPlace.id, files.pdf));
          }
          
          await Promise.allSettled(uploadPromises);
          
          toast({
            title: '✅ Archivos actualizados',
            description: 'Los archivos se han actualizado correctamente',
          });
        }
        // ✅ ESTRATEGIA 2: SOLO METADATOS (ubicación/categoría)
        else if (!analisis.requiereModeracion && analisis.camposModificados.length > 0) {
          console.log('📝 [STRATEGY] Actualizando solo metadatos...');
          
          const datosActualizacion: Partial<PlaceFormData> = {};
          if (analisis.ubicacionModificada) datosActualizacion.location = formData.location;
          if (analisis.categoriaModificada) datosActualizacion.category = formData.category;
          
          await updatePlaceMetadata(editingPlace.id, {
            location: datosActualizacion.location,
            category: datosActualizacion.category
          });

          // ✅ SUBIR ARCHIVOS EN PARALELO SI EXISTEN
          const uploadPromises = [];
          if (files.image) {
            uploadPromises.push(uploadPlaceImage(editingPlace.id, files.image));
          }
          if (files.pdf) {
            uploadPromises.push(uploadPlacePDF(editingPlace.id, files.pdf));
          }
          
          if (uploadPromises.length > 0) {
            await Promise.allSettled(uploadPromises);
          }

          toast({
            title: '✅ Lugar actualizado',
            description: 'La información se ha actualizado correctamente',
          });
        }
        // ✅ ESTRATEGIA 3: CAMBIOS EN TEXTO (requiere moderación)
        else if (analisis.requiereModeracion) {
          console.log('🔍 [STRATEGY] Cambios en texto - aplicando moderación...');
          
          // ✅ VALIDACIÓN PREVIA OPCIONAL
          try {
            const validacion = await validarCambiosLugar(editingPlace.id, formData);
            
            if (!validacion.esAprobado) {
              // ❌ CORREGIDO: Mostrar toast específico para validación fallida
              console.log('❌ [VALIDATION] Validación previa fallida:', validacion.motivo);
              
              toast({
                title: '🚫 Contenido rechazado',
                description: validacion.motivo || 'El contenido no cumple con las políticas de moderación',
                variant: 'destructive',
                duration: 10000,
              });
              
              setIsSubmitting(false);
              setIsProcessing(false);
              return;
            }
          } catch (err: any) {
            // ❌ CORREGIDO: Manejar error de validación previa
            console.log('⚠️ Validación previa fallida, continuando...', err);
            
            // Mostrar toast si es un error de moderación
            if (err?.motivo || err?.detalles) {
              toast({
                title: '🚫 Contenido rechazado',
                description: err.motivo || err.message || 'El contenido no cumple con las políticas',
                variant: 'destructive',
                duration: 10000,
              });
              
              setIsSubmitting(false);
              setIsProcessing(false);
              return;
            }
          }

          // ✅ ACTUALIZACIÓN CON MODERACIÓN
          const datosActualizacion: Partial<PlaceFormData> = {};
          if (analisis.nombreModificado) datosActualizacion.name = formData.name;
          if (analisis.descripcionModificada) datosActualizacion.description = formData.description;
          if (analisis.ubicacionModificada) datosActualizacion.location = formData.location;
          if (analisis.categoriaModificada) datosActualizacion.category = formData.category;

          await updatePlace(editingPlace.id, datosActualizacion, {
            validarPreviamente: false // Ya validamos arriba
          });

          // ✅ SUBIR ARCHIVOS EN PARALELO
          const uploadPromises = [];
          if (files.image) {
            uploadPromises.push(uploadPlaceImage(editingPlace.id, files.image));
          }
          if (files.pdf) {
            uploadPromises.push(uploadPlacePDF(editingPlace.id, files.pdf));
          }
          
          if (uploadPromises.length > 0) {
            await Promise.allSettled(uploadPromises);
          }

          toast({
            title: '✅ Lugar actualizado',
            description: 'El lugar se ha actualizado exitosamente',
          });
        }
        // ✅ ESTRATEGIA 4: ACTUALIZACIÓN RÁPIDA (sin validación)
        else {
          console.log('⚡ [STRATEGY] Actualización rápida...');
          
          const datosActualizacion: Partial<PlaceFormData> = {};
          if (analisis.nombreModificado) datosActualizacion.name = formData.name;
          if (analisis.descripcionModificada) datosActualizacion.description = formData.description;
          if (analisis.ubicacionModificada) datosActualizacion.location = formData.location;
          if (analisis.categoriaModificada) datosActualizacion.category = formData.category;

          await updatePlaceFast(editingPlace.id, datosActualizacion);

          // ✅ SUBIR ARCHIVOS
          const uploadPromises = [];
          if (files.image) {
            uploadPromises.push(uploadPlaceImage(editingPlace.id, files.image));
          }
          if (files.pdf) {
            uploadPromises.push(uploadPlacePDF(editingPlace.id, files.pdf));
          }
          
          if (uploadPromises.length > 0) {
            await Promise.allSettled(uploadPromises);
          }

          toast({
            title: '✅ Lugar actualizado',
            description: 'Los cambios se han guardado correctamente',
          });
        }
      }

      console.log('🏁 [COMPLETED] Proceso terminado exitosamente');
      
      // ✅ LIMPIEZA Y CIERRE
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsDialogOpen(false);
      resetForm();
      await refetch();

    } catch (err: any) {
      console.error('❌ [ERROR DETALLADO] Error en handleSubmit:', {
        error: err,
        message: err?.message,
        motivo: err?.motivo,
        detalles: err?.detalles,
        tipo: err?.tipo,
        stack: err?.stack
      });
      
      // ✅ CORREGIDO: Manejo específico de errores de moderación
      if (err?.motivo || err?.detalles) {
        console.log('🎯 ES ERROR DE MODERACIÓN - Mostrando toast...');
        
        // Construir mensaje detallado
        let descripcion = err.motivo || err.message || 'El contenido no cumple con las políticas de moderación';
        
        // Agregar detalles específicos si existen
        if (err.detalles?.problemas && Array.isArray(err.detalles.problemas)) {
          descripcion += `\n\nProblemas detectados:\n• ${err.detalles.problemas.join('\n• ')}`;
        }
        
        if (err.detalles?.sugerencias && Array.isArray(err.detalles.sugerencias)) {
          descripcion += `\n\nSugerencias:\n• ${err.detalles.sugerencias.join('\n• ')}`;
        }

        toast({
          title: '🚫 Contenido rechazado',
          description: descripcion,
          variant: 'destructive',
          duration: 10000,
        });
      } else {
        console.log('⚠️ ES ERROR GENÉRICO');
        // Error genérico
        const errorMessage = err?.message || 'Error al procesar la solicitud';
        toast({
          title: '❌ Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
      setIsProcessing(false);
    }
  };

  const handleEdit = (place: Place) => {
    setEditingPlace(place);
    setFormData({
      name: place.name || '',
      description: place.description || '',
      category: place.category || '',
      location: place.location || '',
      image_url: place.image_url || '',
      pdf_url: place.pdf_url || ''
    });
    setFiles({ image: null, pdf: null });
    setIsDialogOpen(true);
  };

  /**
   * ✅ MEJORADO: Manejar eliminación de imagen
   */
  const handleDeleteImage = async () => {
    if (!editingPlace || !editingPlace.image_url) {
      toast({
        title: 'ℹ️ Información',
        description: 'No hay imagen para eliminar',
        variant: 'default',
      });
      return;
    }

    try {
      console.log('🗑️ Eliminando imagen del lugar:', editingPlace.id);
      await deletePlaceImage(editingPlace.id);
      
      // Actualizar el estado local
      setFormData(prev => ({ ...prev, image_url: '' }));
      await refetch();
      
    } catch (err) {
      console.error('❌ Error eliminando imagen:', err);
      // Error manejado automáticamente por el hook
    }
  };

/**
 * ✅ CORREGIDO: Manejar eliminación de PDF con error usado
 */
const handleDeletePDF = async () => {
  if (!editingPlace || !editingPlace.pdf_url) {
    toast({
      title: 'ℹ️ Información',
      description: 'No hay PDF para eliminar',
      variant: 'default',
    });
    return;
  }

  try {
    console.log('🗑️ Eliminando PDF del lugar:', editingPlace.id);
    await deletePlacePDF(editingPlace.id);
    
    // Actualizar el estado local
    setFormData(prev => ({ ...prev, pdf_url: '' }));
    await refetch();
    
  } catch (error) { // ← Cambiado de 'err' a 'error' para ser consistente
    console.error('❌ Error eliminando PDF:', error);
    // Error manejado automáticamente por el hook
  }
};

  const handleDelete = async () => {
    if (!editingPlace || isDeleting) {
      console.log('🛑 Eliminación ya en proceso o lugar no seleccionado');
      return;
    }

    console.log('🗑️ [DELETE] Iniciando eliminación de lugar:', editingPlace.id);
    setIsDeleting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await deletePlace(editingPlace.id);
      
      console.log('✅ [DELETE] Lugar eliminado correctamente');
      
      await new Promise(resolve => setTimeout(resolve, 300));
      setIsDeleteDialogOpen(false);
      resetForm();
      
      await refetch();
      console.log('🔄 [DELETE] Lista actualizada después de eliminar');

    } catch (err) {
      console.error('❌ [DELETE] Error eliminando lugar:', err);
      // ✅ ELIMINADO: Toast de error - ahora se maneja desde el hook
    } finally {
      setIsDeleting(false);
    }
  };

  const openGalleryManager = (place: Place) => {
    setSelectedPlaceForGallery(place);
    setGalleryManagerOpen(true);
  };

  const closeGalleryManager = () => {
    setGalleryManagerOpen(false);
    setSelectedPlaceForGallery(null);
  };

  const handleGalleryUpdate = () => {
    refetch();
    // ✅ ELIMINADO: Toast de éxito - ahora se maneja desde GalleryManager
  };

  const openDeleteDialog = (place: Place) => {
    setEditingPlace(place);
    setIsDeleteDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
      clearError();
    }
  };

  const handleRefresh = async () => {
    await refetch();
    toast({
      title: '🔄 Lista actualizada',
      description: 'Los lugares se han actualizado correctamente',
    });
  };

  const removeFile = (type: 'image' | 'pdf') => {
    setFiles(prev => ({ ...prev, [type]: null }));
    toast({
      title: '🗑️ Archivo removido',
      description: `El ${type === 'image' ? 'imagen' : 'PDF'} ha sido removido`,
      variant: 'default',
    });
  };

  // Skeletons
  if (loading && places.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100"
      >
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Administrar Lugares
          </h1>
          <p className="text-lg text-blue-700/80">
            Gestiona los lugares turísticos de San Juan Tahitic
          </p>
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{places.length} lugares registrados</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>Promedio: {safeToFixed(places.reduce((acc, p) => acc + (p.average_rating || 0), 0) / (places.length || 1), 1)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
          title='Actualizar lista de lugares'
            variant="outline" 
            onClick={handleRefresh} 
            disabled={loading}
            className="bg-green-950 text-white hover:bg-green-900 flex gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg">
                <Plus className="h-4 w-4" />
                Nuevo Lugar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden bg-slate-900/95 backdrop-blur-sm border border-slate-700 shadow-xl text-white flex flex-col"
            aria-describedby={undefined}>
              <DialogHeader className="flex-shrink-0 pb-4 border-b border-gray-200 px-6 pt-6">
                <DialogTitle className="text-xl font-bold text-white">
                  {editingPlace ? 'Editar Lugar' : 'Crear Nuevo Lugar'}
                </DialogTitle>
              </DialogHeader>
              <FormErrorBoundary> 
                <form 
                  onSubmit={handleSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  className="flex flex-col flex-1 min-h-0"
                  noValidate
                >
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                    {/* Información básica */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-white font-medium">Nombre del lugar *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ej: Mirador de la Sierra"
                            className={cn(
                              "border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-black bg-white",
                              getFieldError('name') && "border-red-500 focus:border-red-500"
                            )}
                          />
                          {getFieldError('name') && (
                            <p className="text-sm text-red-400">{getFieldError('name')}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="category" className="text-white font-medium">Categoría *</Label>
                          <CategoryDropdown
                            value={formData.category}
                            onValueChange={(value) => setFormData({ ...formData, category: value })}
                            error={getFieldError('category')}
                            placeholder="Selecciona una categoría"
                            categories={categories}
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="location" className="text-white font-medium">Ubicación *</Label>
                          <div className="flex gap-2">
                            <Input
                              id="location"
                              value={formData.location}
                              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                              placeholder="Ej: Centro de San Juan Tahitic"
                              className={cn(
                                "flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-black bg-white",
                                getFieldError('location') && "border-red-500 focus:border-red-500"
                              )}
                            />
                            <MapLocationSelector
                              onLocationSelect={handleLocationSelect}
                              currentLocation={formData.location}
                              buttonText="Mapa"
                              className="w-auto px-4 border-gray-300 hover:border-blue-500"
                            />
                          </div>
                          {getFieldError('location') && (
                            <p className="text-sm text-red-400">{getFieldError('location')}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Descripción */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="description" className="text-white font-medium">Descripción *</Label>
                        <span className={cn("text-sm", formData.description.length > 1800 ? "text-amber-400" : "text-gray-300")}>
                          {formData.description.length}/2000 caracteres
                        </span>
                      </div>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => {
                          if (e.target.value.length <= 2000) {
                            setFormData({ ...formData, description: e.target.value });
                          }
                        }}
                        placeholder="Describe el lugar, sus características, atractivos, historia, servicios disponibles, horarios, recomendaciones..."
                        rows={6}
                        className={cn(
                          "min-h-[150px] max-h-[300px] resize-y border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-black bg-white",
                          getFieldError('description') && "border-red-500 focus:border-red-500"
                        )}
                      />
                      {getFieldError('description') && (
                        <p className="text-sm text-red-400">{getFieldError('description')}</p>
                      )}
                      
                      {formData.description && !getFieldError('description') && (
                        <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
                          <h4 className="text-sm font-medium text-white mb-2">Vista previa:</h4>
                          <ExpandableText 
                            text={formData.description} 
                            maxLength={200}
                            className="text-gray-300 bg-gray-900 p-3 rounded border border-gray-700"
                          />
                        </div>
                      )}
                    </div>

                    {/* Archivos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Input de Imagen */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="image_file" className="text-white">
                            Imagen {!editingPlace && '*'}
                          </Label>
                          {cargandoModelo && (
                            <Badge variant="outline" className="text-yellow-400 border-yellow-400 text-xs">
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Cargando filtro de seguridad...
                            </Badge>
                          )}
                          {modelo && (
                            <Badge variant="outline" className="text-green-400 border-green-400 text-xs">
                              <Shield className="h-3 w-3 mr-1" />
                              {modeloCargado === 'inception_v3' && 'Filtro Avanzado (Inception)'}
                              {modeloCargado === 'mobilenet_v2' && 'Filtro Seguro (MobileNet)'}
                              {modeloCargado === 'mobilenet_v2_mid' && 'Filtro Equilibrado (MobileNet Mid)'}
                            </Badge>
                          )}
                          {errorModelo && (
                            <Badge variant="outline" className="text-red-400 border-red-400 text-xs">
                              <Shield className="h-3 w-3 mr-1" />
                              Filtro no disponible
                            </Badge>
                          )}
                        </div>
                        
                        {/* Información adicional sobre el filtro */}
                        <div className="text-xs text-blue-200/80 space-y-1">
                          <p>• Todas las imágenes pasan por un filtro de contenido inapropiado</p>
                          <p>• Se rechazan imágenes con contenido explícito o sugerente</p>
                          <p>• Máximo 5MB por imagen</p>
                        </div>
                        <div className="space-y-2">
                          {files.image ? (
                            <div className="flex items-center justify-between p-3 border-2 border-blue-300/50 rounded-lg bg-blue-500/10 backdrop-blur-sm">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={URL.createObjectURL(files.image)} 
                                  alt="Vista previa" 
                                  className="w-12 h-12 object-cover rounded-lg border-2 border-blue-200/50"
                                />
                                <span className="text-sm font-medium text-blue-100 truncate max-w-[120px]">
                                  {files.image.name}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile('image')}
                                className="text-blue-200 hover:text-white hover:bg-blue-400/30"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : editingPlace?.image_url ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between p-3 border-2 border-green-300/50 rounded-lg bg-green-500/10 backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={buildImageUrl(editingPlace.image_url)} 
                                    alt="Imagen actual" 
                                    className="w-12 h-12 object-cover rounded-lg border-2 border-green-200/50"
                                  />
                                  <span className="text-sm font-medium text-green-100">Imagen actual</span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => imageInputRef.current?.click()}
                                    className="border-blue-300 text-blue-100 hover:bg-blue-400/30 hover:text-white"
                                  >
                                    Cambiar
                                  </Button>
                                </div>
                              </div>
                              {/* ✅ BOTÓN PARA ELIMINAR IMAGEN */}
                              <Button
                              title='Eliminar Imagen'
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={handleDeleteImage}
                                className="w-full bg-red-600 hover:bg-red-700 text-white border-red-600"
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Eliminar Imagen
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="border-2 border-dashed border-blue-300/50 rounded-lg p-6 text-center cursor-pointer bg-blue-500/10 hover:bg-blue-500/20 transition-all duration-300 backdrop-blur-sm group"
                              onClick={() => imageInputRef.current?.click()}
                            >
                              <Upload className="h-10 w-10 mx-auto text-blue-300 mb-3 group-hover:text-blue-200 transition-colors" />
                              <p className="text-sm font-medium text-blue-100 mb-2">
                                Haz clic para seleccionar una imagen
                              </p>
                              <p className="text-xs text-blue-200/80 mb-3">
                                PNG, JPG, WEBP (max. 5MB)
                              </p>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="border-blue-300 text-blue-100 hover:bg-blue-400/30 hover:text-white hover:border-blue-200"
                              >
                                <Upload className="h-3 w-3 mr-2" />
                                Seleccionar Imagen
                              </Button>
                            </div>
                          )}
                          
                          <Input
                            ref={imageInputRef}
                            id="image_file"
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange('image', e.target.files?.[0] || null)}
                            className="hidden"
                          />
                          
                          {getFieldError('image') && (
                            <p className="text-sm text-red-400 font-medium">{getFieldError('image')}</p>
                          )}
                        </div>
                      </div>

                      {/* Input de PDF */}
                      <div className="space-y-2">
                        <Label htmlFor="pdf_file" className="text-white">Documento PDF</Label>
                        <div className="space-y-2">
                          {files.pdf ? (
                            <div className="flex items-center justify-between p-3 border-2 border-indigo-300/50 rounded-lg bg-indigo-500/10 backdrop-blur-sm">
                              <div className="flex items-center gap-3">
                                <FileText className="h-12 w-12 text-indigo-300" />
                                <span className="text-sm font-medium text-indigo-100 truncate max-w-[120px]">
                                  {files.pdf.name}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile('pdf')}
                                className="text-indigo-200 hover:text-white hover:bg-indigo-400/30"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : editingPlace?.pdf_url ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between p-3 border-2 border-green-300/50 rounded-lg bg-green-500/10 backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-12 w-12 text-green-300" />
                                  <span className="text-sm font-medium text-green-100">PDF actual</span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => pdfInputRef.current?.click()}
                                    className="border-indigo-300 text-indigo-100 hover:bg-indigo-400/30 hover:text-white"
                                  >
                                    Cambiar
                                  </Button>
                                </div>
                              </div>
                              {/* ✅ BOTÓN PARA ELIMINAR PDF */}
                              <Button
                              title='Eliminar PDF'
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={handleDeletePDF}
                                className="w-full bg-red-600 hover:bg-red-700 text-white border-red-600"
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Eliminar PDF
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="border-2 border-dashed border-indigo-300/50 rounded-lg p-6 text-center cursor-pointer bg-indigo-500/10 hover:bg-indigo-500/20 transition-all duration-300 backdrop-blur-sm group"
                              onClick={() => pdfInputRef.current?.click()}
                            >
                              <FileText className="h-10 w-10 mx-auto text-indigo-300 mb-3 group-hover:text-indigo-200 transition-colors" />
                              <p className="text-sm font-medium text-indigo-100 mb-2">
                                Haz clic para seleccionar un PDF
                              </p>
                              <p className="text-xs text-indigo-200/80 mb-3">
                                Archivo PDF (max. 10MB)
                              </p>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="border-indigo-300 text-indigo-100 hover:bg-indigo-400/30 hover:text-white hover:border-indigo-200"
                              >
                                <FileText className="h-3 w-3 mr-2" />
                                Seleccionar PDF
                              </Button>
                            </div>
                          )}
                          
                          <Input
                            ref={pdfInputRef}
                            id="pdf_file"
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => handleFileChange('pdf', e.target.files?.[0] || null)}
                            className="hidden"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer del formulario */}
                  <div className='border-t border-gray-700 flex-shrink-0 px-6 py-4 bg-gray-800 flex justify-end items-center gap-3'>
                    <div className="flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleDialogOpenChange(false)}
                        disabled={isSubmitting || isProcessing}
                        className="bg-red-700 text-white hover:bg-red-600 border-red-600"
                      >
                        Cancelar
                      </Button>

<Button 
  title='Guardar Lugar'
  type="submit"
  disabled={Boolean(isSubmitting || isProcessing || (editingPlace && !hasFormChanges()))}
  className="bg-blue-600 text-white hover:bg-blue-700 min-w-24 border-blue-600"
>
  {isProcessing ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin mr-2" />
      {files.image ? 'Analizando seguridad...' : 'Procesando...'}
    </>
  ) : isSubmitting ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin mr-2" />
      {editingPlace ? 'Actualizando...' : 'Creando...'}
    </>
  ) : editingPlace ? (
    hasFormChanges() ? 'Guardar Cambios' : 'Sin cambios'
  ) : (
    'Crear Lugar'
  )}
</Button>
                    </div>
                  </div>
                </form>
              </FormErrorBoundary>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Filtros */}
      <Card className="border border-gray-200 shadow-lg bg-white">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2 relative"
            title='Buscar Lugares'>
              <Search className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
              <Input
                placeholder="Buscar lugares por nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 border-gray-300 focus:border-blue-500"
              />
            </div>
            <CategoryFilter 
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              categories={categories}
            />
            <div className="flex gap-2">
              <Button
                title='Ver en Modo Cuadricula'
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                onClick={() => setViewMode('grid')}
                className="flex-1 gap-2"
              >
                <div className="grid grid-cols-2 gap-1 w-4 h-4">
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                </div>
                Cuadrícula
              </Button>
              <Button
                  title='Ver en Tabla'
                variant={viewMode === 'table' ? 'default' : 'outline'}
                onClick={() => setViewMode('table')}
                className="flex-1 gap-2"
              >
                <div className="flex flex-col gap-1 w-4 h-4">
                  <div className="bg-current h-1 rounded-sm"></div>
                  <div className="bg-current h-1 rounded-sm"></div>
                  <div className="bg-current h-1 rounded-sm"></div>
                </div>
                Tabla
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ✅ ELIMINADO: Sección de Alert de error global - Los errores se muestran en toasts */}

      {/* Contenido principal con scroll */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key="grid-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-y-auto"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
                {filteredPlaces.map((place) => (
                  <AdminErrorBoundary 
                    key={place.id}
                    operation={`renderizado de card ${place.name}`}
                    fallback={
                      <Card className="border border-red-200 bg-red-50 p-4 text-center">
                        <p className="text-red-600 text-sm">Error mostrando lugar</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => window.location.reload()}
                          className="mt-2"
                        >
                          Recargar
                        </Button>
                      </Card>
                    }
                  >
                    <PlaceCard
                      place={place}
                      onEdit={handleEdit}
                      onDelete={openDeleteDialog}
                      onManageGallery={openGalleryManager}
                    />
                  </AdminErrorBoundary>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="table-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-hidden"
            >
              <Card className="border border-gray-200 shadow-lg h-full flex flex-col">
                <CardHeader className="flex-shrink-0 bg-gray-50 rounded-t-lg">
                  <CardTitle className="text-gray-900">
                    Lugares ({filteredPlaces.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 p-0">
                  <div className="h-full overflow-auto">
                    <Table>
                      <TableHeader className="bg-gray-50 sticky top-0">
                        <TableRow>
                          <TableHead className="text-gray-900 font-semibold">Lugar</TableHead>
                          <TableHead className="text-gray-900 font-semibold">Categoría</TableHead>
                          <TableHead className="text-gray-900 font-semibold">Ubicación</TableHead>
                          <TableHead className="text-gray-900 font-semibold">Calificación</TableHead>
                          <TableHead className="text-gray-900 font-semibold text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPlaces.map((place) => (
                          <TableRow key={place.id} className="hover:bg-gray-50">
                            <TableCell className="max-w-[300px]">
                              <div className="flex items-center gap-3">
                                {place.image_url && (
                                  <img 
                                    src={buildImageUrl(place.image_url)} 
                                    alt={place.name}
                                    className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-gray-900 truncate">
                                    {place.name}
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    <ExpandableText 
                                      text={place.description || ''} 
                                      maxLength={80}
                                      showToggle={false}
                                    />
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="secondary" 
                                className={cn(getCategoryColor(place.category), "text-white")}
                              >
                                {place.category || 'Sin categoría'}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{place.location || 'Sin ubicación'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <AdminRating 
                                rating={place.average_rating} 
                                totalRatings={place.total_ratings} 
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <AdminErrorBoundary 
                                  operation="edición de lugar" 
                                  fallback={
                                    <Button variant="ghost" size="sm" disabled className="text-gray-400"
                                    title='No se puede editar'>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  }
                                >
                                  <Button 
                                      title='Editar Lugar'
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleEdit(place)} 
                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </AdminErrorBoundary>

                                <AdminErrorBoundary 
                                  operation="gestión de galería"
                                  fallback={
                                    <Button variant="ghost" size="sm" disabled className="text-gray-400"
                                    title='No se puede gestionar la galería'>
                                      <Grid3X3 className="h-4 w-4" />
                                    </Button>
                                  }
                                >
                                  <Button 
                                  title='Gestionar Galería'
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => openGalleryManager(place)} 
                                    className="text-green-600 hover:text-green-800 hover:bg-green-50"
                                  >
                                    <Grid3X3 className="h-4 w-4" />
                                  </Button>
                                </AdminErrorBoundary>

                                <AdminErrorBoundary 
                                  operation="apertura de diálogo de eliminación"
                                  fallback={
                                    <Button variant="ghost" size="sm" disabled className="text-gray-400"
                                    title='No se puede eliminar'>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  }
                                >
                                  <Button 
                                  title='Eliminar Lugar'
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => openDeleteDialog(place)} 
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AdminErrorBoundary>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Diálogo de eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="border border-gray-200 shadow-2xl bg-white">
          <AdminErrorBoundary operation="eliminación de lugar">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600">
                ¿Eliminar lugar?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600">
                Esta acción no se puede deshacer. El lugar "{editingPlace?.name}" será eliminado permanentemente junto con todas sus calificaciones y datos asociados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={isDeleting}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete} 
                className="bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Permanentemente
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AdminErrorBoundary>
        </AlertDialogContent>
      </AlertDialog>

      {/* Gallery Manager */}
      {selectedPlaceForGallery && (
        <AdminErrorBoundary operation="gestión de galería">
          <GalleryManager
            key={selectedPlaceForGallery.id}
            placeId={selectedPlaceForGallery.id}
            placeName={selectedPlaceForGallery.name}
            isOpen={galleryManagerOpen}
            onClose={closeGalleryManager}
            onGalleryUpdate={handleGalleryUpdate}
          />
        </AdminErrorBoundary>
      )}
    </div>
  );
};