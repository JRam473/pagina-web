import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, X, MapPin, Feather, Music, Sunrise, Shirt, Leaf, Footprints, Heart, Wind, BookOpen } from 'lucide-react';
import dancesData from '../archivos_data/danzas.json';
import { useWindowSize } from '../../src/hooks/useWindowSize';

// ... (Mapeo de iconos e interfaces se mantienen igual)
const iconMap = {
  Shirt, Feather, Music, Sunrise, Leaf, Footprints, Heart, Wind, BookOpen
};
interface DanceElement {
  icon: keyof typeof iconMap;
  title: string;
  text: string;
}
interface Dance {
  id: number;
  name: string;
  description: string;
  image: string;
  video: string;
  details: {
    story: string;
    elements: DanceElement[];
  };
}
interface DancesData {
  dances: Dance[];
}

// --- Componente Principal ---
export function CultureDance() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const dances = (dancesData as DancesData).dances;
  const { width } = useWindowSize();
  const isMobile = width ? width < 768 : false;

  // CTA: La longitud total ahora incluye la tarjeta de invitación
  const totalItems = dances.length + 1;
  const ctaCardIndex = dances.length;
  const googleMapsUrl = "https://www.google.com/maps/search/?api=1&query=Iglesia+de+San+Juan+Tahitic";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (expandedIndex !== null) {
        if (event.key === 'Escape') setExpandedIndex(null);
      } else {
        if (event.key === 'ArrowRight') setActiveIndex((prev) => (prev + 1) % totalItems);
        if (event.key === 'ArrowLeft') setActiveIndex((prev) => (prev - 1 + totalItems) % totalItems);
        // CTA: Solo expandir si no es la tarjeta CTA
        if ((event.key === 'Enter' || event.key === ' ') && activeIndex !== ctaCardIndex) {
          setExpandedIndex(activeIndex);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, expandedIndex, totalItems, ctaCardIndex]);

  return (
    <section id="danzas" className="py-16 sm:py-24 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 relative overflow-hidden min-h-screen flex flex-col justify-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* ... (Encabezado se mantiene igual) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12 md:mb-16">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-100 to-amber-100 px-4 py-2 rounded-full mb-6">
                <Sparkles className="h-5 w-5 text-orange-600" />
                <span className="text-orange-800 font-medium">Tradiciones en Movimiento</span>
            </div>
            {/* RESPONSIVE: Tamaños de fuente ajustados para móvil y escritorio */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-8">
            Danzas <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-red-600 bg-clip-text text-transparent">Ancestrales</span>
          </h2>
          <p className="text-xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
            Sumergete en cada danza dando clic en ellos y se parte de{' '}
            <span className="bg-gradient-to-r from-red-700 via-fuchsia-600 via-40% to-emerald-700 bg-clip-text text-transparent font-black tracking-tight text-2xl">
              San Juan Tahitic
            </span>
          </p>
        </motion.div>
        
        <div className="relative h-[550px] md:h-[600px] flex items-center justify-center">
          <AnimatePresence>
            {expandedIndex === null && (
              <motion.button onClick={() => setActiveIndex((p) => (p - 1 + totalItems) % totalItems)} className="absolute left-2 md:left-0 z-20 p-2 bg-white/70 rounded-full shadow-lg hover:bg-white transition"> <ChevronLeft /> </motion.button>
            )}
          </AnimatePresence>
          <div className="relative w-full h-full max-w-sm md:max-w-4xl">
            {/* --- Mapeo de las Danzas --- */}
            {dances.map((dance, index) => {
              // ... (La lógica de posicionamiento es la misma)
              const isActive = index === activeIndex;
              const isExpanded = index === expandedIndex;
              const position = index - activeIndex;
              const x = isMobile ? position * 100 : position * 50;
              const rotateY = isMobile ? 0 : position * -20;
              const scale = 1 - Math.abs(position) * 0.2;
              const opacity = isActive || isExpanded ? 1 : (isMobile ? 0 : 1 - Math.abs(position) * 0.4);

              return (
                <motion.div
                  key={dance.id}
                  layout
                  // ... (El resto de props de motion.div se mantiene igual)
                  className={`absolute w-full h-full origin-center cursor-pointer ${isExpanded ? 'z-30' : 'z-10'}`}
                  initial={false}
                  animate={{ x: `${x}%`, scale: isExpanded ? 1.05 : scale, opacity: opacity, rotateY: isExpanded ? 0 : rotateY, zIndex: isExpanded ? 10 : (dances.length - Math.abs(position)) }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                  onClick={() => {
                    if (isExpanded) setExpandedIndex(null);
                    else if (isActive) setExpandedIndex(index);
                    else setActiveIndex(index);
                  }}
                >
                  {/* ... (El contenido de la tarjeta de danza se mantiene igual) */}
                   <div className="w-full h-full bg-black rounded-3xl overflow-hidden shadow-2xl">
                    <motion.div className="absolute inset-0">
                      <video src={dance.video} poster={dance.image} autoPlay muted loop className="w-full h-full object-cover"/>
                      <div className="absolute inset-0 bg-black/40"></div>
                    </motion.div>
                    
                    <div className="relative h-full flex flex-col justify-end p-6 sm:p-8 text-white">
                      <motion.h3 layout="position" className="text-3xl sm:text-4xl font-bold">{dance.name}</motion.h3>
                      <AnimatePresence>
                        {!isExpanded && (
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.3 } }} exit={{ opacity: 0 }} className="text-base sm:text-lg mt-2">{dance.description}</motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 pt-4 bg-gradient-to-t from-black via-black/90 to-transparent max-h-[55%] overflow-y-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.3, duration: 0.5 } }} exit={{ opacity: 0 }}>
                          <p className="text-gray-300 mb-6 text-sm sm:text-base italic">"{dance.details.story}"</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                            {dance.details.elements.map((el) => { const Icon = iconMap[el.icon]; return ( <div key={el.title}> <h4 className="font-bold text-base sm:text-lg flex items-center gap-2 text-amber-300"><Icon size={20}/> {el.title}</h4> <p className="text-gray-300 text-sm">{el.text}</p> </div> ); })}
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); setExpandedIndex(null); }} className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/40 transition"><X/></button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}

            {/* CTA: La nueva tarjeta de invitación */}
            <motion.div
              key="cta-card"
              className="absolute w-full h-full origin-center"
              initial={false}
              animate={{
                x: isMobile ? `${(ctaCardIndex - activeIndex) * 100}%` : `${(ctaCardIndex - activeIndex) * 50}%`,
                scale: 1 - Math.abs(ctaCardIndex - activeIndex) * 0.2,
                opacity: activeIndex === ctaCardIndex ? 1 : (isMobile ? 0 : 1 - Math.abs(ctaCardIndex - activeIndex) * 0.4),
                rotateY: isMobile ? 0 : (ctaCardIndex - activeIndex) * -20,
                zIndex: (dances.length - Math.abs(ctaCardIndex - activeIndex)),
              }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              onClick={() => setActiveIndex(ctaCardIndex)}
            >
              <div className="w-full h-full bg-orange-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center justify-center text-center p-8 relative">
                <img src="/images/cultura/images-cultura/cultura7.jpg" alt="Pueblo de San Juan Tahitic" className="absolute inset-0 w-full h-full object-cover opacity-20"/>
                <div className="relative z-10 text-white">
                  <Sparkles className="h-12 w-12 mx-auto text-amber-300 mb-4"/>
                  <h3 className="text-3xl sm:text-4xl font-bold mb-4">Vive la Tradición</h3>
                  <p className="text-lg text-orange-100 max-w-sm mx-auto mb-8">
                    Hay danzas que deben sentirse en persona. Ven y descubre la magia de San Juan Tahitic.
                  </p>
                  <motion.a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-white text-orange-800 font-bold py-3 px-8 rounded-full shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()} // Evita que el click en el botón active el onClick del div padre
                  >
                    <MapPin size={20} />
                    Llevame ahí
                  </motion.a>
                </div>
              </div>
            </motion.div>

          </div>
           <AnimatePresence>
            {expandedIndex === null && (
               <motion.button onClick={() => setActiveIndex((p) => (p + 1) % totalItems)} className="absolute right-2 md:right-0 z-20 p-2 bg-white/70 rounded-full shadow-lg hover:bg-white transition"><ChevronRight/></motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}