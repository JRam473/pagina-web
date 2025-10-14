import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, User, Clock, Palette, Scissors, Brush, Star } from 'lucide-react';

// Importación de datos desde JSON
import artesaniasData from '../archivos_data/artesanias.json';

// Definición de tipos para las artesanías
interface Artisan {
  name: string;
  experience: string;
  location: string;
}

interface ArtisanCraft {
  id: number;
  name: string;
  category: 'textiles' | 'ceramica' | 'madera';
  description: string;
  materials: string[];
  techniques: string[];
  timeRequired: string;
  priceRange: string;
  artisan: Artisan;
  image: string;
  story: string;
}

// Tipado para la estructura del JSON
interface ArtesaniasData {
  artesanias: ArtisanCraft[];
}

// Componente para lazy loading de imágenes
interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
}

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
    
    return () => {
      img.onload = null;
    };
  }, [src, onLoad]);

  return (
    <div className={`relative ${className}`}>
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center rounded-2xl">
          <div className="text-gray-400">Cargando artesanía...</div>
        </div>
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 rounded-2xl ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        loading="lazy"
      />
    </div>
  );
};

// Iconos por categoría
const categoryIcons = {
  textiles: Scissors,
  ceramica: Palette,
  madera: Brush
};

const categoryColors = {
  textiles: 'bg-blue-100 text-blue-800 border-blue-200',
  ceramica: 'bg-amber-100 text-amber-800 border-amber-200',
  madera: 'bg-emerald-100 text-emerald-800 border-emerald-200'
};

const categoryNames = {
  textiles: 'Textiles Tradicionales',
  ceramica: 'Cerámica Artesanal',
  madera: 'Tallado en Madera'
};

export function CultureArtesanias() {
  const [activeCraft, setActiveCraft] = useState<number | null>(null);
  const [filter, setFilter] = useState<'todos' | 'textiles' | 'ceramica' | 'madera'>('todos');

  // Casting de datos importados
  const craftsData = (artesaniasData as ArtesaniasData).artesanias;

  // Filtrar artesanías según la categoría seleccionada
  const filteredCrafts = filter === 'todos' 
    ? craftsData 
    : craftsData.filter(craft => craft.category === filter);

  // Manejo de teclado para accesibilidad
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && activeCraft !== null) {
      setActiveCraft(null);
    }
    
    if (activeCraft !== null && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const currentIndex = filteredCrafts.findIndex(craft => craft.id === activeCraft);
      const newIndex = (currentIndex + direction + filteredCrafts.length) % filteredCrafts.length;
      setActiveCraft(filteredCrafts[newIndex].id);
    }
  }, [activeCraft, filteredCrafts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCraftClick = (id: number) => {
    setActiveCraft(activeCraft === id ? null : id);
  };

  const handleClose = () => {
    setActiveCraft(null);
  };

  const handleFilterClick = (newFilter: typeof filter) => {
    setFilter(newFilter);
    setActiveCraft(null);
  };

  const backgroundPatternClass = "bg-amber-40/60 [background-image:radial-gradient(ellipse_at_top,_var(--tw-color-amber-100),_var(--tw-color-amber-50))] py-24";

  return (
    <section 
      id="section-artesanias-locales"
      className={`relative overflow-hidden ${backgroundPatternClass}`}
      aria-label="Sección de artesanías locales de San Juan Tahitic"
    >
      <div className="max-w-7xl mx-auto px-2">
        {/* Header con título e instrucciones */}
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6"
          >
            <span className="bg-gradient-to-r from-rose-700 via-pink-500 to-amber-800 bg-clip-text text-transparent">
              Artesanías{' '}
            </span>
             locales
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-700 max-w-3xl mx-auto mb-8 leading-relaxed"
          >
            Creaciones únicas elaboradas por artesanos locales con técnicas transmitidas 
            de generación en generación.
          </motion.p>

          {/* Filtros por categoría */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap justify-center gap-4 mb-12"
          >
            <button
              onClick={() => handleFilterClick('todos')}
              className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                filter === 'todos' 
                  ? 'bg-amber-600 text-white shadow-lg' 
                  : 'bg-white text-gray-700 shadow-md hover:shadow-lg'
              }`}
            >
              Todas las Artesanías
            </button>
            {(['textiles', 'ceramica', 'madera'] as const).map(category => {
              const IconComponent = categoryIcons[category];
              return (
                <button
                  key={category}
                  onClick={() => handleFilterClick(category)}
                  className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2 ${
                    filter === category 
                      ? 'bg-amber-600 text-white shadow-lg' 
                      : 'bg-white text-gray-700 shadow-md hover:shadow-lg'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {categoryNames[category]}
                </button>
              );
            })}
          </motion.div>
        </div>

        {/* Modal para artesanía expandida */}
        <AnimatePresence>
          {activeCraft !== null && (() => {
            const craft = craftsData.find(c => c.id === activeCraft);
            if (!craft) return null;
            const CategoryIcon = categoryIcons[craft.category];

            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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
                  <div className="flex flex-col lg:flex-row h-full">
                    {/* Columna de la Imagen */}
                    <div className="lg:w-1/2 h-64 lg:h-full">
                      <LazyImage
                        src={craft.image}
                        alt={craft.name}
                        className="w-full h-full object-cover rounded-none"
                      />
                    </div>

                    {/* Columna de Información */}
                    {/* Columna de Información */}
                    <div className="lg:w-1/2 p-6 lg:p-8 flex flex-col overflow-y-auto max-h-[80vh]">
                      <div className="flex-1 overflow-y-auto pr-2">
                        {/* Header con categoría */}
                        <div className="flex items-center gap-2 mb-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${categoryColors[craft.category]}`}>
                            {categoryNames[craft.category]}
                          </span>
                        </div>

                        <h3 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4">
                          {craft.name}
                        </h3>
                        
                        <p className="text-gray-700 text-lg leading-relaxed mb-6">
                          {craft.description}
                        </p>

                        {/* Historia del Artesano */}
                        <div className="bg-amber-50 rounded-2xl p-6 mb-6">
                          <h4 className="font-bold text-amber-800 text-lg mb-3">La Historia Detrás</h4>
                          <p className="text-amber-900 italic leading-relaxed">
                            "{craft.story}"
                          </p>
                        </div>

                        {/* Información del Artesano */}
                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                          <div>
                            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                              <User className="w-5 h-5 text-amber-600" />
                              El Artesano
                            </h4>
                            <p className="text-gray-800 font-semibold">{craft.artisan.name}</p>
                            <p className="text-gray-600 text-sm">{craft.artisan.experience}</p>
                            <p className="text-gray-600 text-sm flex items-center gap-1 mt-1">
                              <MapPin className="w-4 h-4" />
                              {craft.artisan.location}
                            </p>
                          </div>

                          <div>
                            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                              <Clock className="w-5 h-5 text-amber-600" />
                              Detalles
                            </h4>
                            <p className="text-gray-800"><strong>Tiempo de elaboración:</strong> {craft.timeRequired}</p>
                            <p className="text-gray-800"><strong>Precio:</strong> {craft.priceRange}</p>
                          </div>
                        </div>

                        {/* Materiales y Técnicas */}
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-bold text-gray-900 mb-2">Materiales Utilizados</h4>
                            <div className="flex flex-wrap gap-2">
                              {craft.materials.map((material, index) => (
                                <span 
                                  key={index}
                                  className="bg-white border border-amber-200 text-amber-700 px-3 py-1 rounded-full text-sm"
                                >
                                  {material}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-bold text-gray-900 mb-2">Técnicas Ancestrales</h4>
                            <div className="flex flex-wrap gap-2">
                              {craft.techniques.map((technique, index) => (
                                <span 
                                  key={index}
                                  className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm"
                                >
                                  {technique}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Botón de Cierre */}
                      <div className="mt-8 pt-6 border-t border-gray-200 flex-shrink-0">
                        <motion.button
                          onClick={handleClose}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-full shadow-lg flex items-center justify-center gap-2 transition-colors"
                        >
                          <ArrowLeft className="w-5 h-5" />
                          Ver más artesanías
                        </motion.button>

                        <div className="mt-3 text-center text-sm text-gray-500">
                          Presiona ESC para cerrar • ← → para navegar
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Grid de Artesanías */}
        <motion.div
          layout
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-300 ${
            activeCraft !== null ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {filteredCrafts.map((craft) => {
            const CategoryIcon = categoryIcons[craft.category];
            
            return (
              <motion.div
                key={craft.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative group cursor-pointer"
                onClick={() => handleCraftClick(craft.id)}
              >
                <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden h-full flex flex-col">
                  {/* Imagen */}
                  <div className="relative h-64 overflow-hidden">
                    <LazyImage
                      src={craft.image}
                      alt={craft.name}
                      className="group-hover:scale-105 transition-transform duration-500"
                    />
                    
                    {/* Badge de categoría */}
                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${
                        craft.category === 'textiles' ? 'bg-blue-600' :
                        craft.category === 'ceramica' ? 'bg-amber-600' :
                        'bg-emerald-600'
                      }`}>
                        <CategoryIcon className="w-3 h-3 inline mr-1" />
                        {categoryNames[craft.category]}
                      </span>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                      {craft.name}
                    </h3>
                    
                    <p className="text-gray-600 text-sm mb-4 flex-1 line-clamp-3">
                      {craft.description}
                    </p>

                    {/* Información del artesano */}
                    <div className="border-t border-gray-100 pt-4 mt-auto">
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span className="font-medium text-gray-700">{craft.artisan.name}</span>
                        <span>{craft.timeRequired}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {craft.artisan.experience}
                      </div>
                    </div>

                    {/* Precio */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-lg font-bold text-amber-700">
                        {craft.priceRange}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Mensaje cuando no hay resultados */}
        {filteredCrafts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-gray-500 text-lg">
              No se encontraron artesanías en esta categoría.
            </div>
            <button
              onClick={() => setFilter('todos')}
              className="mt-4 text-amber-600 hover:text-amber-700 font-semibold"
            >
              Ver todas las artesanías
            </button>
          </motion.div>
        )}
          <div className="flex justify-center py-16">
            <motion.div
              whileHover={{
                scale: 1.05,
                boxShadow: "0px 0px 35px rgba(255,140,0,0.6)",
                backgroundColor: "#ea580c",
              }}
              whileTap={{ scale: 0.97 }}
              className="relative z-10 max-w-3xl w-full bg-orange-600 text-white px-8 py-10 rounded-3xl shadow-2xl transition-all duration-300 overflow-hidden group text-center"
            >
              {/* Brillo deslizante */}
              <motion.span
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                className="absolute inset-0 w-full h-full bg-white opacity-10 transform -skew-x-12 pointer-events-none"
              />

              {/* Contenido narrativo con enfoque artesanal */}
              <h2 className="relative z-20 text-3xl font-extrabold mb-4 tracking-tight">
                ¡Visitanos en San Juan Tahitic!
              </h2>
              <p className="relative z-20 text-lg text-orange-100 mb-6">
                Descubre piezas únicas hechas a mano por artesanos locales. Cada creación refleja tradición, identidad y pasión.
              </p>

              {/* Icono animado como guiño visual */}
              <motion.div
                className="relative z-20 inline-block"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Star className="w-8 h-8 text-white" />
              </motion.div>
            </motion.div>
          </div>
      </div>
    </section>
  );
}