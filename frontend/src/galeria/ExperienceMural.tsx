// components/ExperienceMural.tsx
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Heart, 
  MessageCircle, 
  Eye, 
  Calendar, 
  MapPin, 
  UploadCloud, 
  X, 
  Camera,
  Users,
  CheckCircle,
  Clock,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExperiences } from '@/hooks/useExperiences';
import { usePlaces } from '@/hooks/usePlaces';
import { useToast } from '@/hooks/use-toast';
import { TermsAndConditionsDialog } from '@/components/TermsAndConditionsDialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

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

export const ExperienceMural = () => {
  const { 
    experiences, 
    loading, 
    uploading, 
    uploadExperience, 
    fetchExperiences,
    incrementViewCount
  } = useExperiences();
  
  const { places } = usePlaces();
  const { toast } = useToast();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<any>(null);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [pendingExperience, setPendingExperience] = useState<{
    imageFile: File;
    descripcion: string;
    lugarId?: string;
  } | null>(null);

  const [uploadData, setUploadData] = useState({
    descripcion: '',
    lugarId: '',
    imageFile: null as File | null,
    previewUrl: '' as string | null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Cargar experiencias al iniciar
  useEffect(() => {
    fetchExperiences();
  }, [fetchExperiences]);

  const resetUploadForm = () => {
    setUploadData({
      descripcion: '',
      lugarId: '',
      imageFile: null,
      previewUrl: null
    });
    setIsUploadOpen(false);
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
    } catch (err: any) {
      if (err.message === 'TERMS_REQUIRED') {
        setPendingExperience({
          imageFile: uploadData.imageFile,
          descripcion: uploadData.descripcion,
          lugarId: uploadData.lugarId || undefined
        });
        setShowTermsDialog(true);
      }
    }
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

  const handleExperienceClick = async (experience: any) => {
    setSelectedExperience(experience);
    // Incrementar contador de vistas
    await incrementViewCount(experience.id);
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
          <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4">
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

          {/* Banner de invitación */}
          <ExperienceInvitationBanner />

          {/* Grid de experiencias */}
          {experiences.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Aún no hay experiencias
              </h3>
              <p className="text-gray-600 mb-6">
                Sé el primero en compartir tu experiencia en San Juan Tahitic
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
                {experiences.map((experience, index) => (
                  <motion.div
                    key={experience.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-xl transition-all duration-300 cursor-pointer group"
                    onClick={() => handleExperienceClick(experience)}
                  >
                    {/* Imagen */}
                    <div className="relative overflow-hidden">
                      <img
                        src={experience.url_foto}
                        alt={experience.descripcion}
                        className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
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
                    </div>

                    {/* Contenido */}
                    <div className="p-4">
                      <p className="text-gray-700 line-clamp-2 mb-3 leading-relaxed">
                        {experience.descripcion}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{experience.contador_vistas}</span>
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
        <DialogContent className= "max-w-4xl max-h-[95vh] overflow-hidden bg-slate-900/95 backdrop-blur-sm border border-slate-700 shadow-xl text-white flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-center">Compartir Experiencia</DialogTitle>
            <DialogDescription>
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
                  <p className="text-blue-600 font-medium">Selecciona una imagen</p>
                  <p className="text-sm text-white-500 mt-1">
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
              <label className="block text-sm font-medium text-white-700 mb-2">
                Describe tu experiencia *
              </label>
              <Textarea
                placeholder="Comparte los detalles de tu experiencia en San Juan Tahitic..."
                value={uploadData.descripcion}
                onChange={(e) => setUploadData(prev => ({ ...prev, descripcion: e.target.value }))}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Lugar relacionado (opcional) */}
            <div>
              <label className="block text-sm font-medium text-white-700 mb-2">
                Lugar relacionado (opcional)
              </label>
              <select
                value={uploadData.lugarId}
                onChange={(e) => setUploadData(prev => ({ ...prev, lugarId: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="" >Selecciona un lugar</option>
                {places.map(place => (
                  <option key={place.id} value={place.id}
                  className='text-black'>
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
                className="flex-1 hover:bg-red-900 text-white"
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

      {/* Modal de experiencia seleccionada */}
      <AnimatePresence>
        {selectedExperience && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedExperience(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-full bg-white rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Botón cerrar */}
              <button
                onClick={() => setSelectedExperience(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Contenido */}
              <div className="flex flex-col md:flex-row h-full">
                {/* Imagen */}
                <div className="md:w-1/2">
                  <img
                    src={selectedExperience.url_foto}
                    alt={selectedExperience.descripcion}
                    className="w-full h-64 md:h-full object-cover"
                  />
                </div>

                {/* Información */}
                <div className="md:w-1/2 p-6 flex flex-col">
                  <div className="flex-1">
                    {/* Estado */}
                    <Badge className={cn(
                      "mb-4",
                      selectedExperience.estado === 'aprobado' ? 'bg-green-100 text-green-800' :
                      selectedExperience.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    )}>
                      {selectedExperience.estado}
                    </Badge>

                    {/* Descripción */}
                    <p className="text-gray-700 text-lg leading-relaxed mb-6">
                      {selectedExperience.descripcion}
                    </p>

                    {/* Metadatos */}
                    <div className="space-y-3 text-sm text-gray-600">
                      {selectedExperience.lugar_nombre && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{selectedExperience.lugar_nombre}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Publicado el {formatDate(selectedExperience.creado_en)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        <span>{selectedExperience.contador_vistas} vistas</span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-3 pt-6 border-t border-gray-200">
                    <Button variant="outline" className="flex-1">
                      <Heart className="w-4 h-4 mr-2" />
                      Me gusta
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Comentar
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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