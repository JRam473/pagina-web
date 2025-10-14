// components/ExperienceMural.tsx (VERSIÓN COMPLETAMENTE CORREGIDA - SOLO VISTAS)
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Eye, 
  Calendar, 
  MapPin, 
  UploadCloud, 
  X, 
  Camera,
  Users,
  CheckCircle,
  Clock,
  Image as ImageIcon,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExperiences, type Experience } from '@/hooks/useExperiences';
import { usePlaces } from '@/hooks/usePlaces';
import { useToast } from '@/hooks/use-toast';
import { TermsAndConditionsDialog } from '@/components/TermsAndConditionsDialog';
import { ExperienceImageModal } from '@/components/galeria/ExperienceImageModal';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Componente de esqueleto para experiencias
const ExperienceSkeletonGrid = ({ count }: { count: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="bg-white rounded-2xl overflow-hidden shadow-card">
        <Skeleton className="w-full h-64" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex justify-between">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Componente de invitación
const ExperienceInvitationBanner = () => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  
  const invitationTexts = [
    "¡Comparte tu experiencia en San Juan Tahitic!",
    "Sube fotos de tus lugares favoritos",
    "Inspira a otros con tus aventuras",
    "Forma parte de nuestra comunidad viajera"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % invitationTexts.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [invitationTexts.length]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="relative bg-gradient-to-r from-blue-500/10 via-green-500/10 to-emerald-500/10 rounded-2xl p-6 mb-8 overflow-hidden border border-blue-200/30 backdrop-blur-sm"
    >
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-xl"></div>
      <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-emerald-400/20 rounded-full blur-xl"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
            <Camera className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-800">Mural de Experiencias</h3>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.p
              key={currentTextIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="text-lg text-gray-700 mb-4"
            >
              {invitationTexts[currentTextIndex]}
            </motion.p>
          </AnimatePresence>
          
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">#Aventuras</span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">#Naturaleza</span>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">#Comunidad</span>
          </div>
        </div>
        
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Users className="w-16 h-16 text-blue-500/50" />
        </motion.div>
      </div>
    </motion.div>
  );
};

// Componente para mostrar estadísticas del usuario
const UserStatsBanner = ({ myExperiences }: { myExperiences: Experience[] }) => {
  if (myExperiences.length === 0) return null;

  const aprobadas = myExperiences.filter(exp => exp.estado === 'aprobado').length;
  const pendientes = myExperiences.filter(exp => exp.estado === 'pendiente').length;
  const rechazadas = myExperiences.filter(exp => exp.estado === 'rechazado').length;
  const totalVistas = myExperiences.reduce((sum, exp) => sum + exp.contador_vistas, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-4 mb-6 border border-blue-200"
    >
      <h4 className="text-lg font-semibold text-gray-800 mb-3">Mis Estadísticas</h4>
      <div className="flex flex-wrap gap-4 justify-center md:justify-start">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{myExperiences.length}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{aprobadas}</div>
          <div className="text-sm text-gray-600">Aprobadas</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{pendientes}</div>
          <div className="text-sm text-gray-600">Pendientes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{rechazadas}</div>
          <div className="text-sm text-gray-600">Rechazadas</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{totalVistas}</div>
          <div className="text-sm text-gray-600">Vistas</div>
        </div>
      </div>
    </motion.div>
  );
};

// Interfaz para datos de subida
interface UploadData {
  descripcion: string;
  lugarId: string;
  imageFile: File | null;
  previewUrl: string | null;
}

// Interfaz para datos de edición
interface EditData {
  descripcion: string;
}

// Interfaz para experiencia pendiente
interface PendingExperience {
  imageFile: File;
  descripcion: string;
  lugarId?: string;
}

export const ExperienceMural = () => {
  const { 
    experiences, 
    myExperiences,
    loading, 
    uploading, 
    editing,
    deleting,
    uploadExperience, 
    editExperience,
    deleteExperience,
    fetchExperiences,
    fetchMyExperiences,
    incrementViewCount
  } = useExperiences();
  
  const { places } = usePlaces();
  const { toast } = useToast();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [experienceToEdit, setExperienceToEdit] = useState<Experience | null>(null);
  const [experienceToDelete, setExperienceToDelete] = useState<Experience | null>(null);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'comunidad' | 'mis-experiencias'>('comunidad');
  const [pendingExperience, setPendingExperience] = useState<PendingExperience | null>(null);

  const [uploadData, setUploadData] = useState<UploadData>({
    descripcion: '',
    lugarId: '',
    imageFile: null,
    previewUrl: null
  });

  const [editData, setEditData] = useState<EditData>({
    descripcion: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Cargar experiencias al iniciar
  useEffect(() => {
    fetchExperiences();
    fetchMyExperiences();
  }, [fetchExperiences, fetchMyExperiences]);

  // Determinar qué experiencias mostrar según la pestaña activa
  const displayedExperiences = activeTab === 'comunidad' 
    ? experiences 
    : myExperiences;

  const resetUploadForm = () => {
    setUploadData({
      descripcion: '',
      lugarId: '',
      imageFile: null,
      previewUrl: null
    });
    setIsUploadOpen(false);
  };

  const resetEditForm = () => {
    setEditData({ descripcion: '' });
    setExperienceToEdit(null);
    setIsEditOpen(false);
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Tipo de archivo inválido',
        description: 'Por favor selecciona solo archivos de imagen.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Archivo muy grande',
        description: 'La imagen no debe superar los 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploadData(prev => ({
      ...prev,
      imageFile: file,
      previewUrl: URL.createObjectURL(file)
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!uploadData.imageFile || !uploadData.descripcion.trim()) {
      toast({
        title: 'Información requerida',
        description: 'Por favor selecciona una imagen y escribe una descripción.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const success = await uploadExperience(
        uploadData.imageFile,
        uploadData.descripcion,
        uploadData.lugarId || undefined
      );

      if (success) {
        resetUploadForm();
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'TERMS_REQUIRED') {
        setPendingExperience({
          imageFile: uploadData.imageFile,
          descripcion: uploadData.descripcion,
          lugarId: uploadData.lugarId || undefined
        });
        setShowTermsDialog(true);
      }
    }
  };

  const handleEdit = async () => {
    if (!editData.descripcion.trim()) {
      toast({
        title: 'Descripción requerida',
        description: 'Por favor escribe una descripción.',
        variant: 'destructive',
      });
      return;
    }

    if (experienceToEdit) {
      const success = await editExperience(experienceToEdit.id, editData.descripcion);
      if (success) {
        resetEditForm();
      }
    }
  };

  const handleDelete = async () => {
    if (experienceToDelete) {
      const success = await deleteExperience(experienceToDelete.id);
      if (success) {
        setExperienceToDelete(null);
      }
    }
  };

  const openEditModal = (experience: Experience) => {
    setExperienceToEdit(experience);
    setEditData({ descripcion: experience.descripcion });
    setIsEditOpen(true);
  };

  const openDeleteModal = (experience: Experience) => {
    setExperienceToDelete(experience);
  };

  const handleTermsAccept = async () => {
    if (pendingExperience) {
      localStorage.setItem('experience_terms_accepted', 'true');
      
      const success = await uploadExperience(
        pendingExperience.imageFile,
        pendingExperience.descripcion,
        pendingExperience.lugarId
      );

      if (success) {
        resetUploadForm();
        setPendingExperience(null);
        setShowTermsDialog(false);
      }
    }
  };

  const handleExperienceClick = async (experience: Experience) => {
    console.log('🖱️ Click en experiencia:', experience.id);
    
    // 1. Abrir el modal inmediatamente para mejor UX
    setSelectedExperience(experience);
    
    // 2. Registrar la vista en segundo plano (SOLO UNA VEZ)
    try {
      const success = await incrementViewCount(experience.id);
      if (success) {
        console.log('✅ Vista registrada para:', experience.id);
        
        // Actualizar el contador localmente para feedback inmediato
        fetchExperiences(); // Recargar experiencias públicas
        if (activeTab === 'mis-experiencias') {
          fetchMyExperiences(); // Recargar mis experiencias
        }
      }
    } catch (error) {
      console.error('❌ Error al registrar vista:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading && experiences.length === 0) {
    return (
      <section className="py-20 bg-gradient-to-br from-blue-50 via-green-50 to-emerald-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Mural de <span className="text-blue-600">Experiencias</span>
            </h2>
            <p className="text-xl text-gray-600">
              Descubre las experiencias compartidas por la comunidad
            </p>
          </div>
          <ExperienceSkeletonGrid count={6} />
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="py-20 bg-gradient-to-br from-blue-50 via-green-50 to-emerald-50">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div className="text-center md:text-left">
              <h2 className="text-4xl font-bold text-gray-900 mb-2">
                Mural de <span className="text-blue-600">Experiencias</span>
              </h2>
              <p className="text-xl text-gray-600">
                Historias y momentos compartidos por la comunidad
              </p>
            </div>
            
            <Button
              onClick={() => setIsUploadOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus className="w-5 h-5" />
              Compartir Experiencia
            </Button>
          </div>

          {/* Pestañas */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('comunidad')}
              className={`px-4 py-2 font-medium text-lg transition-colors ${
                activeTab === 'comunidad'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              👥 Comunidad
            </button>
            <button
              onClick={() => setActiveTab('mis-experiencias')}
              className={`px-4 py-2 font-medium text-lg transition-colors ${
                activeTab === 'mis-experiencias'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📱 Mis Experiencias
            </button>
          </div>

          {/* Banner de estadísticas del usuario */}
          {activeTab === 'mis-experiencias' && (
            <UserStatsBanner myExperiences={myExperiences} />
          )}

          {/* Banner de invitación - solo mostrar en pestaña comunidad */}
          {activeTab === 'comunidad' && <ExperienceInvitationBanner />}

          {/* Grid de experiencias */}
          {loading && displayedExperiences.length === 0 ? (
            <ExperienceSkeletonGrid count={6} />
          ) : displayedExperiences.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {activeTab === 'comunidad' 
                  ? 'Aún no hay experiencias' 
                  : 'Aún no has compartido experiencias'}
              </h3>
              <p className="text-gray-600 mb-6">
                {activeTab === 'comunidad'
                  ? 'Sé el primero en compartir tu experiencia en San Juan Tahitic'
                  : 'Comparte tu primera experiencia en San Juan Tahitic'}
              </p>
              <Button
                onClick={() => setIsUploadOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Compartir Mi Experiencia
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {displayedExperiences.map((experience, index) => (
                  <motion.div
                    key={experience.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-xl transition-all duration-300 group relative"
                  >
                    {/* Imagen */}
                    <div className="relative overflow-hidden">
                      <img
                        src={experience.url_foto}
                        alt={experience.descripcion}
                        className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                        onClick={() => handleExperienceClick(experience)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Estado */}
                      <div className="absolute top-3 left-3">
                        <Badge className={cn(
                          "text-white border-0",
                          experience.estado === 'aprobado' ? 'bg-green-500' :
                          experience.estado === 'pendiente' ? 'bg-yellow-500' :
                          'bg-red-500'
                        )}>
                          {experience.estado === 'aprobado' ? <CheckCircle className="w-3 h-3 mr-1" /> :
                           experience.estado === 'pendiente' ? <Clock className="w-3 h-3 mr-1" /> :
                           <X className="w-3 h-3 mr-1" />}
                          {experience.estado}
                        </Badge>
                      </div>

                      {/* Menú de acciones (solo en "Mis Experiencias") */}
                      {activeTab === 'mis-experiencias' && (
                        <div className="absolute top-3 right-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 bg-black/60 hover:bg-black/80 text-white"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end"
                              className="bg-white border border-gray-200 shadow-lg">
                              <DropdownMenuItem 
                                onClick={() => openEditModal(experience)}
                                disabled={editing === experience.id}
                                className="focus:text-blue-600"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                {editing === experience.id ? 'Editando...' : 'Editar'}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => openDeleteModal(experience)}
                                disabled={deleting === experience.id}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {deleting === experience.id ? 'Eliminando...' : 'Eliminar'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>

                    {/* Contenido */}
                    <div className="p-4">
                      <p 
                        className="text-gray-700 line-clamp-2 mb-3 leading-relaxed cursor-pointer"
                        onClick={() => handleExperienceClick(experience)}
                      >
                        {experience.descripcion}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{experience.contador_vistas} vistas</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(experience.creado_en)}</span>
                          </div>
                        </div>
                        
                        {experience.lugar_nombre && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate max-w-[100px]">
                              {experience.lugar_nombre}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* QUITAR ACCIONES SOCIALES - SOLO VISTAS */}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      {/* Modal de subida */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden bg-slate-900/95 backdrop-blur-sm border border-slate-700 shadow-xl text-white flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-center">Compartir Experiencia</DialogTitle>
            <DialogDescription className="text-white/70">
              Comparte tu foto y experiencia en San Juan Tahitic
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Área de subida de imagen */}
            <div
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
            >
              {uploadData.previewUrl ? (
                <div className="relative">
                  <img
                    src={uploadData.previewUrl}
                    alt="Vista previa"
                    className="w-full h-40 object-cover rounded-md mx-auto"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadData(prev => ({ ...prev, previewUrl: null, imageFile: null }));
                    }}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                  <p className="text-blue-400 font-medium">Selecciona una imagen</p>
                  <p className="text-sm text-white/70 mt-1">
                    Arrastra y suelta o haz clic para seleccionar
                  </p>
                </>
              )}
              
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Describe tu experiencia *
              </label>
              <Textarea
                placeholder="Comparte los detalles de tu experiencia en San Juan Tahitic..."
                value={uploadData.descripcion}
                onChange={(e) => setUploadData(prev => ({ ...prev, descripcion: e.target.value }))}
                rows={4}
                className="resize-none bg-white/10 border-white/20 text-white"
              />
            </div>

            {/* Lugar relacionado (opcional) */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Lugar relacionado (opcional)
              </label>
              <select
                value={uploadData.lugarId}
                onChange={(e) => setUploadData(prev => ({ ...prev, lugarId: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
              >
                <option value="">Selecciona un lugar</option>
                {places.map(place => (
                  <option key={place.id} value={place.id}>
                    {place.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Footer */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={resetUploadForm}
                className="flex-1 hover:bg-red-900 text-white border-white/30"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!uploadData.imageFile || !uploadData.descripcion.trim() || uploading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                    />
                    Subiendo...
                  </>
                ) : (
                  'Compartir'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de edición */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Experiencia</DialogTitle>
            <DialogDescription>
              Modifica la descripción de tu experiencia
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {experienceToEdit && (
              <div className="flex gap-4">
                <img
                  src={experienceToEdit.url_foto}
                  alt="Experiencia"
                  className="w-32 h-32 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <Badge className={cn(
                    "mb-2",
                    experienceToEdit.estado === 'aprobado' ? 'bg-green-100 text-green-800' :
                    experienceToEdit.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  )}>
                    {experienceToEdit.estado}
                  </Badge>
                  <p className="text-sm text-gray-600">
                    Publicado el {formatDate(experienceToEdit.creado_en)}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción *
              </label>
              <Textarea
                placeholder="Describe tu experiencia..."
                value={editData.descripcion}
                onChange={(e) => setEditData({ descripcion: e.target.value })}
                rows={4}
              />
              <p className="text-sm text-gray-500 mt-1">
                Al editar, tu experiencia volverá a estado "pendiente" para ser revisada.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={resetEditForm}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEdit}
                disabled={!editData.descripcion.trim() || editing === experienceToEdit?.id}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {editing === experienceToEdit?.id ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                    />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <Dialog open={!!experienceToDelete} onOpenChange={() => setExperienceToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar Experiencia?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. La experiencia será eliminada permanentemente.
            </DialogDescription>
          </DialogHeader>
          
          {experienceToDelete && (
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <img
                  src={experienceToDelete.url_foto}
                  alt="Experiencia"
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div>
                  <p className="text-sm text-gray-700 line-clamp-3">
                    {experienceToDelete.descripcion}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Publicado el {formatDate(experienceToDelete.creado_en)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setExperienceToDelete(null)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleting === experienceToDelete.id}
                  variant="destructive"
                  className="flex-1"
                >
                  {deleting === experienceToDelete.id ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      Eliminando...
                    </>
                  ) : (
                    'Eliminar'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de imagen de experiencia - SIN LIKES */}
      <ExperienceImageModal
        experience={selectedExperience}
        isOpen={!!selectedExperience}
        onClose={() => setSelectedExperience(null)}
      />

      {/* Diálogo de términos y condiciones */}
      <TermsAndConditionsDialog
        isOpen={showTermsDialog}
        onClose={() => {
          setShowTermsDialog(false);
          setPendingExperience(null);
        } }
        onAccept={handleTermsAccept}
        type="experience"
        title="Términos para Compartir Experiencias"
        description="Al compartir tu experiencia, aceptas nuestros términos de uso y política de privacidad." placeName={''}      />
    </>
  );
};