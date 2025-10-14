// components/Places.tsx - VERSIÓN MODIFICADA
import { ImageGalleryModal } from '@/components/galeria/ImageGalleryModal';
import { MapRouteViewer } from '@/components/MapRouteViewer'; // ✅ NUEVO IMPORT
import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { TermsAndConditionsDialog } from '@/components/TermsAndConditionsDialog'; 
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Users, Star, BarChart3, ThumbsUp, Loader2, FileText, Navigation } from 'lucide-react';
import { usePlaces, type GalleryImage, type Place } from '@/hooks/usePlaces';
import { useCategories } from '@/hooks/useCategories';

import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Componente de esqueleto para lugares
const PlaceSkeletonGrid = ({ count }: { count: number }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="bg-card rounded-2xl overflow-hidden shadow-card">
        <Skeleton className="w-full h-64" />
        <div className="p-6 space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    ))}
  </div>
);

// Componente de rating
const Rating = ({ 
  rating, 
  onRatingChange, 
  totalRatings = 0, 
  size = "md", 
  readonly = false,
  showProgress = true
}: {
  rating: number | null | undefined;
  onRatingChange?: (rating: number) => void;
  totalRatings?: number;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
  showProgress?: boolean;
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  const numericRating = typeof rating === 'number' ? rating : 0;
  const displayRating = isHovering && hoverRating > 0 ? hoverRating : numericRating;

  return (
    <div 
      className="flex flex-col gap-2"
      onMouseEnter={() => !readonly && setIsHovering(true)}
      onMouseLeave={() => !readonly && setIsHovering(false)}
    >
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !readonly && onRatingChange?.(star)}
            onMouseEnter={() => !readonly && setHoverRating(star)}
            disabled={readonly}
            className={`relative transition-all duration-200 ${
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-125'
            }`}
          >
            <Star
              className={sizeClasses[size]}
              fill="none"
              color="#d1d5db"
            />
            
            <div 
              className="absolute top-0 left-0 overflow-hidden"
              style={{ width: star <= displayRating ? '100%' : '0%' }}
            >
              <Star
                className={sizeClasses[size]}
                fill="currentColor"
                color={star <= displayRating ? "#f59e0b" : "#d1d5db"}
              />
            </div>
            
            {!readonly && star <= hoverRating && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-yellow-300 rounded-full blur-[3px] opacity-70"></div>
              </div>
            )}
          </button>
        ))}

        <span className={cn(
          "text-sm font-medium ml-2",
          numericRating > 0 ? "text-amber-700" : "text-muted-foreground"
        )}>
          {numericRating && numericRating > 0 ? numericRating.toFixed(1) : 'Sin calificaciones'}
        </span>
      </div>
      
      {showProgress && !readonly && (
        <div className="mt-2 relative">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${(displayRating / 5) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          
          <motion.div
            className="absolute -top-6 text-xs font-bold text-amber-600"
            initial={{ opacity: 0, x: -10 }}
            animate={{ 
              opacity: isHovering ? 1 : 0,
              x: isHovering ? 0 : -10
            }}
            style={{ left: `${(displayRating / 5) * 100}%` }}
          >
            {displayRating}/5
          </motion.div>
          
          <div className="flex justify-between mt-1">
            {[1, 2, 3, 4, 5].map((num) => (
              <div
                key={num}
                className={`w-1 h-1 rounded-full ${
                  num <= displayRating ? 'bg-amber-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      )}
      
      {totalRatings > 0 && (
        <p className="text-xs text-muted-foreground">
          {totalRatings} {totalRatings === 1 ? 'calificación' : 'calificaciones'}
        </p>
      )}
    </div>
  );
};

// Interface para estadísticas
interface RatingStats {
  promedio: number;
  total: number;
  distribucion: Array<{
    calificacion: number;
    cantidad: number;
    porcentaje: number;
  }>;
}

// Componente para mostrar estadísticas de calificaciones
const RatingStatsDialog = ({ 
  placeName, 
  stats, 
  variant = "default", 
  theme = "default" 
}: { 
  placeName: string;
  stats: RatingStats;
  variant?: "default" | "primary" | "secondary";
  theme?: "default" | "nature" | "waterfall" | "cultural" | "history" | "bridge" | "viewpoint" | "trail" | "montain" | "river" | "path";
}) => {
  if (!stats) return null;

  const themeButtonClasses: Record<string, Record<string, string>> = {
    default: {
      primary: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:from-blue-600 hover:to-indigo-700",
      secondary: "bg-secondary text-secondary-foreground"
    },
    nature: {
      primary: "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md hover:from-green-600 hover:to-emerald-700",
      secondary: "bg-green-200 text-green-800 hover:bg-green-300"
    },
    waterfall: {
      primary: "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-md hover:from-blue-600 hover:to-cyan-700",
      secondary: "bg-blue-200 text-blue-800 hover:bg-blue-300"
    },
    cultural: {
      primary: "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md hover:from-amber-600 hover:to-orange-700",
      secondary: "bg-amber-200 text-amber-800 hover:bg-amber-300"
    },
    history: {
      primary: "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md hover:from-purple-600 hover:to-pink-700",
      secondary: "bg-purple-200 text-purple-800 hover:bg-purple-300"
    },
    bridge: {
      primary: "bg-gradient-to-r from-gray-700 to-gray-900 text-white shadow-md hover:from-gray-800 hover:to-black",
      secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300"
    },
    viewpoint: {
      primary: "bg-gradient-to-r from-yellow-500 to-red-600 text-white shadow-md hover:from-yellow-600 hover:to-red-700",
      secondary: "bg-yellow-200 text-yellow-800 hover:bg-yellow-300"
    },
    trail: {
      primary: "bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700",
      secondary: "bg-teal-200 text-teal-800 hover:bg-teal-300"
    },
    montain: {
      primary: "bg-gradient-to-r from-gray-600 to-gray-800 text-white hover:from-gray-700 hover:to-black",
      secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300"
    },
    river: {
      primary: "bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:from-blue-700 hover:to-black",
      secondary: "bg-blue-200 text-blue-800 hover:bg-blue-300"
    },
    path: {
      primary: "bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700",
      secondary: "bg-teal-200 text-teal-800 hover:bg-teal-300"
    }
  };

  const currentTheme = themeButtonClasses[theme] || themeButtonClasses.default;
  const buttonClass = currentTheme[variant || "default"] || currentTheme.primary;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant={variant === "primary" ? "default" : "outline"} 
          size="sm" 
          className={cn("mt-2 transition-all duration-300 transform hover:scale-105", buttonClass)}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Ver estadísticas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white/30 backdrop-blur-sm border border-white/20 p-2 text-gray-900 dark:text-gray-100 dark:bg-black/30 dark:border-gray-700 shadow-lg rounded-md">
        <DialogHeader>
          <DialogTitle className={cn("text-lg font-bold", {
            "text-primary-foreground": variant === "primary",
            "text-secondary-foreground": variant === "secondary"
          })}>
            Estadísticas de calificaciones - {placeName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className={cn("text-center p-4 rounded-lg", {
              "bg-primary/20": variant === "default",
              "bg-primary/30": variant === "primary",
              "bg-secondary/30": variant === "secondary"
            })}>
              <p className="text-2xl font-bold">
                {stats.promedio !== null && stats.promedio !== undefined 
                  ? Number(stats.promedio).toFixed(1) 
                  : '0.0'
                }
              </p>
              <p className="text-sm text-muted-foreground">Promedio</p>
            </div>
            <div className={cn("text-center p-4 rounded-lg", {
              "bg-primary/20": variant === "default",
              "bg-primary/30": variant === "primary",
              "bg-secondary/30": variant === "secondary"
            })}>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total calificaciones</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold">Distribución de calificaciones:</h4>
            {stats.distribucion.map((item) => (
              <div key={item.calificacion} className="flex items-center gap-3">
                <div className="w-16 text-sm text-muted-foreground">
                  {item.calificacion} estrella{item.calificacion !== 1 ? 's' : ''}
                </div>
                <div className="flex-1 bg-secondary rounded-full h-3">
                  <div 
                    className={cn("rounded-full h-3", {
                      "bg-primary": variant === "default",
                      "bg-primary-foreground": variant === "primary",
                      "bg-secondary-foreground": variant === "secondary"
                    })} 
                    style={{ 
                      width: `${stats.total > 0 ? (item.cantidad / stats.total) * 100 : 0}%` 
                    }}
                  />
                </div>
                <div className="w-12 text-sm font-medium text-right">
                  {item.cantidad} ({item.porcentaje}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Componente de invitación para valoraciones
const UpdatedRatingInvitationBanner = ({ theme }: { 
  theme: 'default' | 'nature' | 'waterfall' | 'cultural' | 'history' | 'bridge' | 'viewpoint' | 'trail' | 'montain' | 'river' | 'path'; 
}) => {
  const themeClasses: Record<string, { bg: string; border: string }> = {
    default: {
      bg: 'bg-gradient-to-r from-blue-100/80 via-indigo-100/80 to-purple-100/80',
      border: 'border-blue-200/30',
    },
    nature: {
      bg: 'bg-gradient-to-r from-green-100/80 via-emerald-100/80 to-teal-100/80',
      border: 'border-green-200/30',
    },
    waterfall: {
      bg: 'bg-gradient-to-r from-blue-100/80 via-cyan-100/80 to-sky-100/80',
      border: 'border-blue-200/30',
    },
    cultural: {
      bg: 'bg-gradient-to-r from-amber-100/80 via-orange-100/80 to-red-100/80',
      border: 'border-amber-200/30',
    },
    history: {
      bg: 'bg-gradient-to-r from-purple-100/80 via-pink-100/80 to-red-100/80',
      border: 'border-purple-200/30',
    },
    bridge: {
      bg: 'bg-gradient-to-r from-gray-100/80 via-gray-200/80 to-gray-300/80',
      border: 'border-gray-200/30',
    },
    viewpoint: {
      bg: 'bg-gradient-to-r from-yellow-100/80 via-orange-100/80 to-red-100/80',
      border: 'border-yellow-200/30',
    },
    trail: {
      bg: 'bg-gradient-to-r from-teal-100/80 via-cyan-100/80 to-sky-100/80',
      border: 'border-teal-200/30',
    },
    montain: {
      bg: 'bg-gradient-to-r from-gray-100/80 via-gray-200/80 to-gray-300/80',
      border: 'border-gray-200/30',
    },
    river: {
      bg: 'bg-gradient-to-r from-blue-100/80 via-blue-200/80 to-blue-300/80',
      border: 'border-blue-200/30',
    },
    path: {
      bg: 'bg-gradient-to-r from-teal-100/80 via-cyan-100/80 to-sky-100/80',
      border: 'border-teal-200/30',
    }
  };

  const currentTheme = themeClasses[theme] || themeClasses.default;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="mb-10"
    >
      <div className={`${currentTheme.bg} backdrop-blur-sm shadow-lg hover:shadow-2xl border ${currentTheme.border} transition-all duration-500 overflow-hidden rounded-2xl p-6`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
              <ThumbsUp className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold">¡Tu opinión es importante!</h3>
            </div>
            <p className="mb-3">
              Califica los lugares que has visitado. No necesitas crear una cuenta, 
              solo aceptar nuestros términos de privacidad.
            </p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">#SinRegistro</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">#Privacidad</span>
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">#Comunidad</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const TRANSPORT_BASE = {
  address: "Base de Transporte Zacapoaxtla, Puebla",
  lat: 19.8758703351958,
  lng: -97.5889138590976
};


const Places = () => {
  const { 
    places, 
    loading, 
    ratePlace, 
    getUserRating, 
    getRatingStats, 
    isRating,
    getUserCurrentRating,
    hasUserRated,
    getPlaceGallery,
    getPlacePdfUrl,
    getPlaceLocation
  } = usePlaces();
  
  const { getCategoryColor } = useCategories();
  
  const { toast } = useToast();
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [ratingStats, setRatingStats] = useState<Record<string, RatingStats>>({});
  const [loadingStats, setLoadingStats] = useState<Record<string, boolean>>({});
  const [loadingGalleries, setLoadingGalleries] = useState<Record<string, boolean>>({});
  const [placeGalleries, setPlaceGalleries] = useState<Record<string, GalleryImage[]>>({});
  const [galleryModal, setGalleryModal] = useState<{
    isOpen: boolean;
    placeId: string; // ✅ CAMBIO: Ahora guardamos el placeId en lugar de las imágenes
    initialIndex: number;
  }>({
    isOpen: false,
    placeId: '',
    initialIndex: 0
  });
  const [theme, setTheme] = useState<'default' | 'nature' | 'waterfall' | 'cultural' | 'history' | 'bridge' | 'viewpoint' | 'trail' | 'montain' | 'river' | 'path'>('default');

  // Estados para el diálogo de términos
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [pendingRating, setPendingRating] = useState<{
    placeId: string;
    placeName: string;
    rating: number;
  } | null>(null);

  // ✅ CORREGIDO: Determinar tema basado en las categorías de lugares usando useCategories
  useEffect(() => {
    if (places.length > 0) {
      const categories = places.map(p => p.categoria?.toLowerCase());
      if (categories.some(cat => cat?.includes('naturaleza') || cat?.includes('nature'))) {
        setTheme('nature');
      } else if (categories.some(cat => cat?.includes('cascada') || cat?.includes('waterfall'))) {
        setTheme('waterfall');
      } else if (categories.some(cat => cat?.includes('cultura') || cat?.includes('cultural'))) {
        setTheme('cultural');
      } else if (categories.some(cat => cat?.includes('historia') || cat?.includes('history'))) {
        setTheme('history');
      } else if (categories.some(cat => cat?.includes('puente') || cat?.includes('bridge'))) {
        setTheme('bridge');
      } else if (categories.some(cat => cat?.includes('mirador') || cat?.includes('viewpoint'))) {
        setTheme('viewpoint');
      } else if (categories.some(cat => cat?.includes('sendero') || cat?.includes('trail'))) {
        setTheme('trail');
      } else if (categories.some(cat => cat?.includes('ruta') || cat?.includes('path'))) {
        setTheme('path');
      } else if (categories.some(cat => cat?.includes('montaña') || cat?.includes('montain'))) {
        setTheme('montain');
      } else if (categories.some(cat => cat?.includes('río') || cat?.includes('river'))) {
        setTheme('river');
      } else {
        setTheme('default');
      }
    }
  }, [places]);

  const themeClasses: Record<string, { bg: string; text: string; alert: string; button: string }> = {
    default: {
      bg: 'bg-background',
      text: 'text-foreground',
      alert: 'bg-blue-50 text-blue-800 border-blue-200',
      button: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'
    },
    nature: {
      bg: 'bg-green-50',
      text: 'text-green-900',
      alert: 'bg-green-50 text-green-800 border-green-200',
      button: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
    },
    waterfall: {
      bg: 'bg-blue-50',
      text: 'text-blue-900',
      alert: 'bg-blue-50 text-blue-800 border-blue-200',
      button: 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700'
    },
    cultural: {
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      alert: 'bg-amber-50 text-amber-800 border-amber-200',
      button: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700'
    },
    path: {
      bg: 'bg-teal-50',
      text: 'text-teal-900',
      alert: 'bg-teal-50 text-teal-800 border-teal-200',
      button: 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700'
    },
    history: {
      bg: 'bg-purple-50',
      text: 'text-purple-900',
      alert: 'bg-purple-50 text-purple-800 border-purple-200',
      button: 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700'
    },
    bridge: {
      bg: 'bg-gray-50',
      text: 'text-gray-900',
      alert: 'bg-gray-50 text-gray-800 border-gray-200',
      button: 'bg-gradient-to-r from-gray-700 to-gray-900 text-white hover:from-gray-800 hover:to-black'
    },
    viewpoint: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-900',
      alert: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      button: 'bg-gradient-to-r from-yellow-500 to-red-600 text-white hover:from-yellow-600 hover:to-red-700'
    },
    trail: {
      bg: 'bg-teal-50',
      text: 'text-teal-900',
      alert: 'bg-teal-50 text-teal-800 border-teal-200',
      button: 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700'
    },
    montain: {
      bg: 'bg-gray-50', 
      text: 'text-gray-900',
      alert: 'bg-gray-50 text-gray-800 border-gray-200',
      button: 'bg-gradient-to-r from-gray-600 to-gray-800 text-white hover:from-gray-700 hover:to-black'
    },
    river: {
      bg: 'bg-blue-50',
      text: 'text-blue-900',
      alert: 'bg-blue-50 text-blue-800 border-blue-200',
      button: 'bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:from-blue-700 hover:to-black'
    }
  };

  // Load user ratings for each place
  useEffect(() => {
    if (places.length > 0) {
      const loadUserRatings = async () => {
        const ratings: Record<string, number> = {};
        for (const place of places) {
          try {
            const ratingData = await getUserRating(place.id);
            if (ratingData) {
              ratings[place.id] = ratingData.calificacion;
            }
          } catch (error) {
            console.error(`Error loading rating for place ${place.id}:`, error);
          }
        }
        setUserRatings(ratings);
      };
      loadUserRatings();
    }
  }, [places, getUserRating]);

  // Cargar estadísticas de calificaciones
  useEffect(() => {
    if (places.length > 0) {
      const loadRatingStats = async () => {
        const stats: Record<string, RatingStats> = {};
        const loading: Record<string, boolean> = {};
        
        for (const place of places) {
          loading[place.id] = true;
          setLoadingStats(prev => ({ ...prev, [place.id]: true }));
          
          try {
            const statsData = await getRatingStats(place.id);
            console.log(`📍 Stats for ${place.nombre}:`, statsData);
            
            if (statsData) {
              stats[place.id] = statsData;
            }
          } catch (error) {
            console.error(`Error loading stats for place ${place.id}:`, error);
          } finally {
            loading[place.id] = false;
            setLoadingStats(prev => ({ ...prev, [place.id]: false }));
          }
        }
        
        setRatingStats(stats);
        console.log('📊 All rating stats loaded:', stats);
      };
      
      loadRatingStats();
    }
  }, [places, getRatingStats]);

  // En el componente Places, agrega esta función
const handleOpenPdf = (place: Place) => {
  const pdfUrl = getPlacePdfUrl(place);
  
  if (!pdfUrl) {
    toast({
      title: 'ℹ️ Información',
      description: 'Este lugar no tiene una guía PDF disponible',
      variant: 'default',
    });
    return;
  }

  // Abrir el PDF en una nueva pestaña
  window.open(pdfUrl, '_blank', 'noopener,noreferrer');
};

  // ✅ CORREGIDO: Función para cargar la galería de un lugar específico
  const loadPlaceGallery = useCallback(async (placeId: string): Promise<GalleryImage[]> => {
    try {
      setLoadingGalleries(prev => ({ ...prev, [placeId]: true }));
      console.log('🔄 [Places] Cargando galería para:', placeId);
      
      const gallery = await getPlaceGallery(placeId);
      console.log('✅ [Places] Galería cargada:', gallery.length, 'imágenes');
      
      setPlaceGalleries(prev => ({ ...prev, [placeId]: gallery }));
      return gallery;
    } catch (error) {
      console.error('❌ [Places] Error cargando galería:', error);
      
      // Fallback: usar la imagen principal si la galería falla
      const place = places.find(p => p.id === placeId);
      if (place) {
        const fallbackGallery: GalleryImage[] = [{
          id: 'main',
          url_foto: place.foto_principal_url || '/placeholder.svg',
          descripcion: place.descripcion || place.nombre,
          es_principal: true,
          orden: 1,
          creado_en: new Date().toISOString()
        }];
        
        setPlaceGalleries(prev => ({ ...prev, [placeId]: fallbackGallery }));
        return fallbackGallery;
      }
      
      return [];
    } finally {
      setLoadingGalleries(prev => ({ ...prev, [placeId]: false }));
    }
  }, [getPlaceGallery, places]);

  // ✅ CORREGIDO: Función simplificada para abrir la galería desde la imagen principal
  const openGalleryFromImage = async (placeId: string) => {
    try {
      console.log('🔄 [Places] Abriendo galería desde imagen para:', placeId);
      
      // Cargar la galería si no está en cache
      if (!placeGalleries[placeId]) {
        await loadPlaceGallery(placeId);
      }
      
      // Abrir el modal con el placeId
      setGalleryModal({
        isOpen: true,
        placeId: placeId,
        initialIndex: 0
      });
      
      console.log('🎉 [Places] Galería abierta para placeId:', placeId);
      
    } catch (error) {
      console.error('❌ [Places] Error abriendo galería desde imagen:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la galería de imágenes',
        variant: 'destructive',
      });
    }
  };

  // ✅ CORREGIDO: Función handleImageClick simplificada
  const handleImageClick = (placeId: string) => {
    openGalleryFromImage(placeId);
  };

  // ✅ CORREGIDO: Función handleImageError simplificada
  const handleImageError = (imageUrl: string) => {
    console.error('❌ Error cargando imagen:', imageUrl);
  };

  // ✅ CORREGIDO: Función para manejar calificaciones
  const handleRatingChange = async (placeId: string, newRating: number) => {
    try {
      const place = places.find(p => p.id === placeId);
      if (!place) return;

      // Verificar si ya tiene una calificación para mostrar confirmación
      const currentUserRating = userRatings[placeId];
      const isUpdating = currentUserRating !== undefined;
      
      const success = await ratePlace(placeId, newRating);
      
      if (success) {
        // Actualizar estado local inmediatamente para mejor UX
        setUserRatings(prev => ({ ...prev, [placeId]: newRating }));
        
        // Mostrar mensaje apropiado
        toast({
          title: isUpdating ? '⭐ Calificación actualizada' : '🎉 ¡Gracias por tu calificación!',
          description: isUpdating 
            ? `Tu calificación para "${place.nombre}" ha sido actualizada a ${newRating} estrellas`
            : `Has calificado "${place.nombre}" con ${newRating} estrellas`,
        });
        
        // Recargar estadísticas después de un breve delay
        setTimeout(async () => {
          try {
            const statsData = await getRatingStats(placeId);
            if (statsData) {
              setRatingStats(prev => ({ ...prev, [placeId]: statsData }));
            }
          } catch (error) {
            console.error('Error reloading stats:', error);
          }
        }, 1000);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'TERMS_REQUIRED') {
        const place = places.find(p => p.id === placeId);
        if (place) {
          setPendingRating({
            placeId,
            placeName: place.nombre,
            rating: newRating
          });
          setShowTermsDialog(true);
        }
      }
      // Otros errores ya son manejados por el hook
    }
  };

  // ✅ CORREGIDO: Función para cuando se aceptan los términos
  const handleTermsAccept = async () => {
    if (pendingRating) {
      const { placeId, rating } = pendingRating;
      
      try {
        const success = await ratePlace(placeId, rating);
        if (success) {
          setUserRatings(prev => ({ ...prev, [placeId]: rating }));
          toast({
            title: '🎉 ¡Gracias por tu calificación!',
            description: `Has calificado "${pendingRating.placeName}" con ${rating} estrellas`,
          });
          
          // Recargar estadísticas
          setTimeout(async () => {
            try {
              const statsData = await getRatingStats(placeId);
              if (statsData) {
                setRatingStats(prev => ({ ...prev, [placeId]: statsData }));
              }
            } catch (error) {
              console.error('Error reloading stats:', error);
            }
          }, 1000);
        }
      } catch (error) {
        // Error ya manejado en ratePlace
      }
      
      setPendingRating(null);
      setShowTermsDialog(false);
    }
  };

  const getPlaceFeatures = (description: string | null): string[] => {
    if (!description) return [];
    
    const features: string[] = [];
    const descLower = description.toLowerCase();
    
    if (descLower.includes('senderismo') || descLower.includes('hiking')) features.push('Senderismo');
    if (descLower.includes('natación') || descLower.includes('swimming')) features.push('Natación');
    if (descLower.includes('fotografía') || descLower.includes('photo')) features.push('Fotografía');
    if (descLower.includes('gastronomía') || descLower.includes('food')) features.push('Gastronomía');
    if (descLower.includes('artesanías') || descLower.includes('crafts')) features.push('Artesanías');
    if (descLower.includes('música') || descLower.includes('music')) features.push('Música');
    if (descLower.includes('deportes') || descLower.includes('sports')) features.push('Deportes acuáticos');
    if (descLower.includes('atardecer') || descLower.includes('sunset')) features.push('Atardecer');
    if (descLower.includes('relax') || descLower.includes('peaceful')) features.push('Relax');
    
    return features.length > 0 ? features : ['Turismo'];
  };

  // Función para formatear el promedio de calificación
  const formatRating = (rating: number | null | undefined): string => {
    if (!rating || rating === 0) return '0.0';
    return Number(rating).toFixed(1);
  };

  if (loading) {
    return (
      <section id="places" className={`py-24 ${themeClasses[theme]?.bg || 'bg-background'} relative overflow-hidden`}>
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-indigo-200/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-2 rounded-full mb-6">
              <MapPin className="h-5 w-5 text-blue-600" />
              <span className="text-blue-800 font-medium">Destinos Únicos</span>
            </div>
            
            <h2 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Lugares{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
                Destacados
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Descubre los rincones más fascinantes de San Juan Tahitic, cada uno con su propia magia y experiencias únicas.
            </p>
          </div>
          <PlaceSkeletonGrid count={3} />
        </div>
      </section>
    );
  }

  return (
    <>
      <section id="places" className={`py-20 ${themeClasses[theme]?.bg || 'bg-background'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-2 rounded-full mb-6">
              <MapPin className="h-5 w-5 text-blue-600" />
              <span className="text-blue-800 font-medium">Destinos Únicos</span>
            </div>
            
            <h2 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Lugares{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
                Destacados
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Descubre los rincones más fascinantes de San Juan Tahitic, cada uno con su propia magia y experiencias únicas.
            </p>
          </div>

          <UpdatedRatingInvitationBanner theme={theme} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {places.map((place) => {
              const features = getPlaceFeatures(place.descripcion);
              const displayRating = userRatings[place.id] || place.puntuacion_promedio || 0;
              const isCurrentlyRating = isRating[place.id] || false;
              const imageUrl = place.foto_principal_url || '/placeholder.svg';
              const userHasRated = hasUserRated(place.id);
              const userCurrentRating = getUserCurrentRating(place.id);
              const placeLocation = getPlaceLocation(place);
              
              return (
                <div 
                  key={place.id}
                  className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-xl transition-shadow group"
                >
                  <div className="relative overflow-hidden">
                    <img 
                      src={imageUrl}
                      alt={place.nombre}
                      className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                      loading="lazy"
                      onClick={() => handleImageClick(place.id)}
                      onError={() => handleImageError(imageUrl)}
                    />
                    
                    {/* ✅ ELIMINADO: Botón de zoom individual */}
                    {/* ✅ ELIMINADO: Botón "Ver galería" completo */}

                    <div className="absolute top-4 left-4">
                      <Badge className={cn(getCategoryColor(place.categoria), "text-white")}>
                        {place.categoria || 'Turismo'}
                      </Badge>
                    </div>
                    {/* ✅ INDICADOR DE COORDENADAS DISPONIBLES */}
                    {placeLocation.hasCoordinates && (
                      <div className="absolute top-4 right-4 bg-green-500/90 backdrop-blur-sm rounded-lg px-2 py-1 text-white text-xs font-medium flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        GPS
                      </div>
                    )}
                    
                    <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 text-white text-sm font-medium">
                      Gratuito
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-semibold text-card-foreground group-hover:text-primary transition-colors">
                        {place.nombre}
                      </h3>
                    </div>

                    <p className="text-muted-foreground mb-4 leading-relaxed line-clamp-3">
                      {place.descripcion || 'Un hermoso lugar para visitar en San Juan Tahitic.'}
                    </p>

                    <div className="mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Rating 
                            rating={displayRating}
                            onRatingChange={(rating) => handleRatingChange(place.id, rating)}
                            totalRatings={place.total_calificaciones || 0}
                            size="sm"
                            readonly={isCurrentlyRating}
                          />
                          
                          {place.puntuacion_promedio !== null && place.puntuacion_promedio !== undefined && place.puntuacion_promedio > 0 && (
                            <div className="flex items-center ml-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold py-1 px-3 rounded-full shadow-lg">
                              <Star className="w-3 h-3 mr-1 fill-white" />
                              <span className="text-sm">{formatRating(place.puntuacion_promedio)}</span>
                            </div>
                          )}
                        </div>
                        
                        {isCurrentlyRating && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Calificando...
                          </div>
                        )}
                      </div>
                      
                      {userHasRated && userCurrentRating && (
                        <p className="text-xs text-green-600 mt-1">
                          ✅ Ya calificaste con {userCurrentRating} estrellas
                        </p>
                      )}
                      
                      {!userHasRated && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Califica este lugar (aceptarás términos de privacidad)
                        </p>
                      )}
                      
                      {ratingStats[place.id] && ratingStats[place.id].total > 0 && (
                        <div className="mt-2">
                          <RatingStatsDialog 
                            placeName={place.nombre}
                            stats={ratingStats[place.id]}
                            variant={theme === 'default' ? 'default' : 'primary'}
                            theme={theme}
                          />
                          {loadingStats[place.id] && (
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Cargando estadísticas...
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2" />
                        {place.ubicacion || 'San Juan Tahitic'}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="w-4 h-4 mr-2" />
                        2-4 horas
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Users className="w-4 h-4 mr-2" />
                        Todos los niveles
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {features.map((feature, index) => (
                        <Badge 
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {feature}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* ✅ REEMPLAZADO: Botón "Cómo Llegar" en lugar de "Ver Detalles" */}
                      <MapRouteViewer
                        origin={TRANSPORT_BASE}
                        destination={placeLocation}
                        buttonText="Cómo Llegar"
                        className={cn(
                          "w-full shadow-md hover:shadow-lg transition-all duration-300",
                          theme === 'default' && "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700",
                          theme === 'nature' && "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700",
                          theme === 'waterfall' && "bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700",
                          theme === 'cultural' && "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700",
                          theme === 'history' && "bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700",
                          theme === 'bridge' && "bg-gradient-to-r from-gray-700 to-gray-900 text-white hover:from-gray-800 hover:to-black",
                          theme === 'viewpoint' && "bg-gradient-to-r from-yellow-500 to-red-600 text-white hover:from-yellow-600 hover:to-red-700",
                          theme === 'trail' && "bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700",
                          theme === 'montain' && "bg-gradient-to-r from-gray-600 to-gray-800 text-white hover:from-gray-700 hover:to-black",
                          theme === 'river' && "bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:from-blue-700 hover:to-black",
                          theme === 'path' && "bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700"
                        )}
                      />

                      {/* Botón para ver PDF si está disponible */}
                      {place.pdf_url && (
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPdf(place)}
                          className={cn(
                            "w-full border-2 transition-all duration-300 hover:scale-105",
                            theme === 'default' && "border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400",
                            theme === 'nature' && "border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400",
                            theme === 'waterfall' && "border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400",
                            theme === 'cultural' && "border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400",
                            theme === 'history' && "border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400",
                            theme === 'bridge' && "border-gray-400 text-gray-700 hover:bg-gray-50 hover:border-gray-500",
                            theme === 'viewpoint' && "border-yellow-300 text-yellow-700 hover:bg-yellow-50 hover:border-yellow-400",
                            theme === 'trail' && "border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400",
                            theme === 'montain' && "border-gray-400 text-gray-700 hover:bg-gray-50 hover:border-gray-500",
                            theme === 'river' && "border-blue-400 text-blue-700 hover:bg-blue-50 hover:border-blue-500",
                            theme === 'path' && "border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400"
                          )}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Ver Guía PDF
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <Button 
              size="lg" 
              variant="outline"
              className="px-8"
            >
              Ver Todos los Lugares
            </Button>
          </div>
        </div>
      </section>

      <TermsAndConditionsDialog
        isOpen={showTermsDialog}
        onClose={() => {
          setShowTermsDialog(false);
          setPendingRating(null);
        }}
        onAccept={handleTermsAccept}
        placeName={pendingRating?.placeName || ''}
      />

      <ImageGalleryModal
        placeId={galleryModal.placeId}
        initialIndex={galleryModal.initialIndex}
        isOpen={galleryModal.isOpen}
        onClose={() => setGalleryModal(prev => ({ ...prev, isOpen: false }))}
        title="Galería del lugar"
      />
    </>
  );
};

export default Places;