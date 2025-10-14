import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gastronomyData from '../../archivos_data/gastronomia.json';
import { ArrowLeft, MapPin, ChefHat, Clock, Utensils, Mouse } from 'lucide-react';

// Definición de tipos para las props del componente LazyImage
interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
}

// Componente para lazy loading de imágenes
const LazyImage: React.FC<LazyImageProps> = ({ src, alt, className = '', onLoad }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState('');

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImageSrc(src);
      setImageLoaded(true);
      onLoad?.();
    };
    
    // Cleanup function
    return () => {
      img.onload = null;
    };
  }, [src, onLoad]);

  return (
    <div className={`relative ${className}`}>
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="text-gray-400">Cargando...</div>
        </div>
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        loading="lazy"
      />
    </div>
  );
};

// Definición de tipos para los datos de gastronomía
interface Dish {
  name: string;
  chef: string;
  greeting: string;
  address: string;
  owner: string;
  suggestions: string[];
  hours: string;
  image: string;
  lat: number;
  lng: number;
}

export function PlatillosSection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

  // Preload de imágenes para transiciones más suaves
  useEffect(() => {
    const preloadImages = async () => {
      const newPreloaded = new Set(preloadedImages);
      
      for (const dish of gastronomyData as Dish[]) {
        if (!newPreloaded.has(dish.image)) {
          const img = new Image();
          img.src = dish.image;
          img.onload = () => {
            newPreloaded.add(dish.image);
            setPreloadedImages(new Set(newPreloaded));
          };
        }
      }
    };

    preloadImages();
  }, []);

  // Manejo de teclado para accesibilidad
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && activeIndex !== null) {
      setActiveIndex(null);
    }
    
    // Navegación con teclado entre tarjetas
    if (activeIndex !== null && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const newIndex = (activeIndex + direction + gastronomyData.length) % gastronomyData.length;
      setActiveIndex(newIndex);
    }
  }, [activeIndex]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Ruta relativa desde public
  const backgroundPatternClass = "bg-orange-50/40 bg-[url('/images/cultura/images-cultura/cultura-opti.svg')] bg-cover bg-center bg-no-repeat p-12";

  // Prefetch de imágenes adyacentes a la activa
  useEffect(() => {
    if (activeIndex !== null) {
      const indicesToPrefetch = [
        (activeIndex - 1 + gastronomyData.length) % gastronomyData.length,
        (activeIndex + 1) % gastronomyData.length,
      ];

      indicesToPrefetch.forEach(index => {
        const dish = gastronomyData[index] as Dish;
        if (!preloadedImages.has(dish.image)) {
          const img = new Image();
          img.src = dish.image;
        }
      });
    }
  }, [activeIndex, preloadedImages]);

  const handleCardClick = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const handleClose = () => {
    setActiveIndex(null);
  };

  const handleImageLoad = () => {
    // Puede usarse para tracking de carga si es necesario
  };

  // Handler para eventos de teclado en elementos individuales
  const handleCardKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardClick(index);
    }
  };

  const handleButtonKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      handleClose();
    }
  };

  const generateMapsUrl = (lat: number, lng: number): string => {
  // Codifica las coordenadas para la URL
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
};

  return (
    <section 
      id="section-gastronomia-inmersiva-v2"
      //className={`py-24 relative overflow-hidden ${backgroundPatternClass}`}.
      className="py-24 relative overflow-hidden" 
      aria-label="Sección de platillos gastronómicos de San Juan Tahitic"
    >
      {/* 1. Capa de Fondo (Patrón) - Cambia 'bg-black/90' por el patrón */}
        <div className={`absolute inset-0 ${backgroundPatternClass}`} aria-hidden="true" /> 
        
        {/* 2. Capa de Overlay Oscuro (Añadido) */}
        <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
        
        {/* 3. Contenido (Z-index superior para que esté encima) */}
        <div className="max-w-7xl mx-auto px-4 relative z-10"> 
        {/* Header con título e instrucciones */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
            Sabores de San Juan Tahitic
          </h2>
          
          {/* Instrucciones para el usuario */}
          <div className="flex flex-col items-center gap-4 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 text-lg text-gray-700 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-orange-200"
            >
              <Mouse className="w-5 h-5 text-orange-600" />
              <span className="font-medium">Haz clic en cualquier platillo para descubrir su historia</span>
            </motion.div>
            
            <div className="bg-black/90 p-4 rounded-lg">
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-white max-w-2xl text-base md:text-lg leading-relaxed drop-shadow-lg"
            >
                Explora nuestra rica tradición culinaria. Cada platillo cuenta una historia única 
                de sabores, ingredientes locales y técnicas ancestrales que han pasado de generación en generación.
            </motion.p>
            </div>
          </div>
        </div>

        {/* Contenedor para la tarjeta expandida - POSICIÓN FIJA */}
        <AnimatePresence>
          {activeIndex !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={handleClose}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="bg-white rounded-3xl shadow-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden mx-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {activeIndex !== null && (() => {
                  const dish = gastronomyData[activeIndex] as Dish;
                  return (
                    <div className="flex flex-col lg:flex-row h-full">
                      {/* Columna de la Imagen */}
                      <div className="lg:w-1/2 h-64 lg:h-full">
                        <LazyImage
                          src={dish.image}
                          alt={dish.name}
                          className="w-full h-full object-cover"
                          onLoad={handleImageLoad}
                        />
                      </div>

                      {/* Columna de Información */}
                      <div className="lg:w-1/2 p-6 lg:p-8 flex flex-col overflow-y-auto max-h-[60vh] lg:max-h-none">
                        <div className="flex-1">
                          <h3 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2">{dish.name}</h3>
                          <p className="text-lg font-medium text-amber-600 mb-4 flex items-center gap-2">
                            <ChefHat className="w-5 h-5" aria-hidden="true" /> 
                            {dish.chef}
                          </p>
                          
                          <p className="text-gray-700 italic border-l-4 border-amber-500 pl-4 py-1 mb-6">
                            {dish.greeting}
                          </p>

                          <div className="grid gap-4 text-gray-800">
                            <div>
                              <h4 className="font-bold text-orange-600 flex items-center gap-2 mb-1">
                                <MapPin className="w-4 h-4" aria-hidden="true" /> 
                                Ubicación
                              </h4>
                              <p><strong>Dirección:</strong> {dish.address}</p>
                              <p><strong>Propietario:</strong> {dish.owner}</p>
                              <p><strong>Teléfono:</strong> {('phone' in dish) ? (dish as any).phone : 'N/A'}</p>
                              {/* AÑADE ESTE BOTÓN/ENLACE AQUÍ */}
                            <motion.a
                                href={generateMapsUrl(dish.lat, dish.lng)} // Usa tu nueva función aquí
                                target="_blank"
                                rel="noopener noreferrer"
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                className="mt-3 inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-full transition-colors shadow-md"
                                aria-label={`Ver ubicación de ${dish.name} en Google Maps`}
                            >
                                <MapPin className="w-5 h-5" /> 
                                Abrir en Google Maps
                            </motion.a>
                            </div>

                            <div>
                              <h4 className="font-bold text-orange-600 flex items-center gap-2 mb-1">
                                <Utensils className="w-4 h-4" aria-hidden="true" /> 
                                Sugerencias
                              </h4>
                              <div role="list" aria-label="Sugerencias del platillo" className="flex flex-wrap gap-2">
                                {dish.suggestions.map((s, i) => (
                                  <span 
                                    key={i} 
                                    className="bg-orange-100 text-orange-800 text-xs font-semibold px-3 py-1 rounded-full"
                                    role="listitem"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Horario y Botón de Cierre */}
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <h4 className="font-bold text-orange-600 flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4" aria-hidden="true" /> 
                            Horario de Atención
                          </h4>
                          <p className="text-2xl lg:text-3xl font-extrabold text-green-700 mb-4">{dish.hours}</p>

                          <motion.button
                            onClick={handleClose}
                            onKeyDown={handleButtonKeyDown}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-full shadow-lg flex items-center justify-center gap-2 transition-colors"
                            aria-label="Cerrar detalles y regresar a la vista de grid"
                          >
                            <ArrowLeft className="w-5 h-5" aria-hidden="true" /> 
                            Regresar a la galería
                          </motion.button>

                          {/* Indicadores de navegación por teclado */}
                          <div className="mt-3 text-center text-sm text-gray-500" aria-hidden="true">
                            Presiona ESC para cerrar • ← → para navegar entre platillos
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contenedor principal de la cuadrícula - SOLO PARA ESTADO NORMAL */}
        <motion.div
          layout
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-300 ${
            activeIndex !== null ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          role="grid"
          aria-label="Grid de platillos gastronómicos"
        >
          {(gastronomyData as Dish[]).map((dish, index) => (
            <motion.div
              key={index}
              layout
              className="relative h-80 rounded-3xl overflow-hidden cursor-pointer shadow-2xl transition-all duration-300 hover:shadow-3xl"
              onClick={() => handleCardClick(index)}
              onKeyDown={(e) => handleCardKeyDown(e, index)}
              whileHover={{ 
                y: -8,
                scale: 1.02
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              role="gridcell"
              aria-label={`${dish.name} por ${dish.chef}. Haz clic para expandir`}
              tabIndex={0}
            >
              <LazyImage
                src={dish.image}
                alt={dish.name}
                className="rounded-3xl"
                onLoad={handleImageLoad}
              />
              
              {/* Overlay con información básica */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className="text-2xl font-bold text-white mb-2">{dish.name}</h3>
                  <p className="text-amber-300 flex items-center gap-2 text-sm">
                    <ChefHat className="w-4 h-4" aria-hidden="true" /> 
                    {dish.chef}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-white/80 text-xs">
                    <Mouse className="w-3 h-3" />
                    <span>Haz clic para más información</span>
                  </div>
                </motion.div>
              </div>

              {/* Indicador de interactividad en móvil */}
              <div className="md:hidden absolute top-4 right-4 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                TOCA
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Mensaje cuando hay una tarjeta activa */}
        <AnimatePresence>
          {activeIndex !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center mt-8 text-gray-600 text-sm"
            >
              <p>Explora otros platillos cerrando este primero</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Indicador de accesibilidad para screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {activeIndex !== null 
          ? `Tarjeta ${(gastronomyData[activeIndex] as Dish).name} expandida. Usa las flechas izquierda y derecha para navegar o ESC para cerrar.`
          : 'Vista de grid de platillos. Usa tab para navegar entre las tarjetas.'}
      </div>
    </section>
  );
}