import { Button } from '../components/ui/button';
import { ArrowDown, MapPin, Sparkles, Sun, Languages, Coins, Calendar } from 'lucide-react';
import { type FC, useEffect, useMemo, useState, lazy, Suspense, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedTitleFallback } from '../animations/AnimatedTitle';

// Lazy loading para componentes pesados
const AnimatedLetterTitle = lazy(() => 
  import('../animations/AnimatedTitle').then(module => ({
    default: module.AnimatedLetterTitle
  }))
);

// Componente de fallback móvil
const MobileFallback: FC = () => (
  <div className="text-white text-center">
    <div className="text-xl font-semibold">San Juan Tahitic</div>
    <div className="text-sm opacity-80 mt-2">Cargando experiencia...</div>
  </div>
);

/**
 * HeroSection: Sección principal de bienvenida - Optimizado para Móviles
 */
export const HeroSection: FC<HeroSectionProps> = ({ onDiscoverClick }) => {
  const [visible, setVisible] = useState(true);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [clima, setClima] = useState<string>("Cargando...");
  const [climaError, setClimaError] = useState<string | null>(null);


  const scrollTo = (id: string): void => {
    const element = document.querySelector<HTMLElement>(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  // Detectar móvil y preferencias de usuario
  useEffect(() => {
    const checkMobileAndPreferences = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Verificar preferencia de reducción de movimiento
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setReduceMotion(prefersReducedMotion);

      // Reducir animaciones en móviles low-end
      if (mobile && 'hardwareConcurrency' in navigator) {
        const cores = navigator.hardwareConcurrency || 4;
        if (cores < 4) {
          setReduceMotion(true);
        }
      }
    };

    checkMobileAndPreferences();
    window.addEventListener('resize', checkMobileAndPreferences);
    
    // Escuchar cambios en preferencias de movimiento
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    motionMediaQuery.addEventListener('change', handleMotionChange);

    return () => {
      window.removeEventListener('resize', checkMobileAndPreferences);
      motionMediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

    // Obtener clima real desde Open-Meteo
  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=19.9366099&longitude=-97.5511631&current_weather=true")
      .then((res) => {
        if (!res.ok) throw new Error("Error al obtener el clima");
        return res.json();
      })
      .then((data) => {
        const temperatura = data.current_weather.temperature;
        setClima(`${temperatura}°C`);
      })
      .catch((err) => setClimaError(err.message));
  }, []);


  // Ciclo de fade optimizado para móviles
  useEffect(() => {
    if (reduceMotion) {
      setVisible(true); // Siempre visible si hay reducción de movimiento
      return;
    }

    const intervalTime = isMobile ? 15000 : 10000; // 15s en móvil vs 10s en desktop
    
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => setVisible(true), isMobile ? 3000 : 4000);
    }, intervalTime);
    
    return () => clearInterval(interval);
  }, [isMobile, reduceMotion]);

  // Pausar animaciones cuando la página no es visible (especialmente en móviles)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pausar cuando la pestaña no es visible (cambio de app en móvil)
        setVisible(false);
      } else {
        setVisible(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Preload crítico optimizado para móviles
  useEffect(() => {
    const preloadImage = new Image();
    preloadImage.src = isMobile ? '/images/san_juan-mobile-optimized.jpg' : '/images/san_juan-poster.jpg';
    
    if ('fonts' in document) {
      document.fonts.load('1em Inter');
    }
  }, [isMobile]);

  return (
    <section 
      id="inicio" 
      className="relative min-h-screen flex flex-col items-center justify-center text-white overflow-hidden"
      aria-label="Sección de bienvenida San Juan Tahitic"
      style={{
        // Optimizaciones GPU para móviles
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        perspective: '1000px'
      }}
    >
      {/* Meta tags para SEO y accesibilidad del video */}
      <head>
        <meta name="description" content="Descubre San Juan Tahitic - Destino turístico con clima templado húmedo, ubicado en la Región Central" />
        <meta property="og:video" content="/videos/san_juan-optimized.mp4" />
        <meta property="og:video:type" content="video/mp4" />
        <meta property="og:video:width" content="1920" />
        <meta property="og:video:height" content="1080" />
        <link rel="preload" href={isMobile ? "/videos/san_juan-mobile.mp4" : "/videos/san_juan-optimized.mp4"} as="video" type="video/mp4" />
        <link rel="preload" href={isMobile ? "/images/san_juan-mobile-optimized.jpg" : "/images/san_juan-poster.jpg"} as="image" />
      </head>

      {/* Fondo optimizado para móviles */}
      <BackgroundLayer 
        onVideoLoad={() => setIsVideoLoaded(true)}
        isVideoLoaded={isVideoLoaded}
        isMobile={isMobile}
      />

      {/* Contenido animado con optimizaciones móviles */}
      <div className={reduceMotion ? 'reduce-motion' : ''}>
        <AnimatePresence>
          {(visible || reduceMotion) && (
            <motion.div
              key="heroContent"
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
              transition={{ 
                duration: isMobile ? 1 : 1.5,
                ease: "easeOut"
              }}
              className="absolute inset-0 flex flex-col items-center justify-center w-full h-full z-10"
            >
              <Suspense fallback={<MobileFallback />}>
                <MainContent 
                  scrollToTourism={onDiscoverClick} // Usamos la nueva prop aquí
                  scrollToContact={() => scrollTo('#contacto')} 
                  isVideoLoaded={isVideoLoaded}
                  isMobile={isMobile}
                  reduceMotion={reduceMotion}
                  clima={clima}
                  climaError={climaError}
                />
              </Suspense>
              <ScrollIndicator isMobile={isMobile} reduceMotion={reduceMotion} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
/**
 * Capa de fondo optimizada para móviles
 */
interface BackgroundLayerProps {
  onVideoLoad: () => void;
  isVideoLoaded: boolean;
  isMobile: boolean;
}

interface HeroSectionProps {
  onDiscoverClick: () => void;
}

const BackgroundLayer: FC<BackgroundLayerProps> = ({ onVideoLoad, isVideoLoaded, isMobile }) => {
  const [videoError, setVideoError] = useState(false);

  const handleVideoError = useCallback(() => {
    console.warn('Video failed to load, using image fallback');
    setVideoError(true);
    onVideoLoad();
  }, [onVideoLoad]);

  return (
    <div className="absolute inset-0 z-0">
      {/* Video optimizado para móviles */}
      <video
        autoPlay={!isMobile} // En móviles, no autoplay o condicional
        loop
        muted
        playsInline
        preload={isMobile ? "metadata" : "auto"}
        poster={isMobile ? "/images/san_juan-poster-mobile.jpg" : "/images/san_juan-poster.jpg"}
        className={`
          absolute inset-0 w-full h-full min-h-screen object-cover bg-black
          ${isMobile ? 'object-center' : 'object-[60%_center] xl:object-[55%_bottom]'}
          transition-opacity duration-1000
          ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}
          ${videoError ? 'hidden' : ''}
        `}
        aria-label="Paisajes de San Juan Tahitic"
        onLoadedData={onVideoLoad}
        onCanPlayThrough={onVideoLoad}
        onError={handleVideoError}
      >
        {/* Videos optimizados para diferentes dispositivos */}
        <source 
          src={isMobile ? "/videos/san_juan-mobile.webm" : "/videos/san_juan-optimized.webm"} 
          type="video/webm" 
        />
        <source 
          src={isMobile ? "/videos/san_juan-mobile.mp4" : "/videos/san_juan-optimized.mp4"} 
          type="video/mp4" 
        />
        
        {/* Fallback para navegadores antiguos */}
        <track kind="captions" src="/videos/captions.vtt" srcLang="es" label="Español" default />
      </video>

      {/* Fallback de imagen si video falla o en móviles con datos limitados */}
      {(videoError || isMobile) && (
        <img 
          src={isMobile ? "/images/san_juan-mobile-optimized.jpg" : "/images/san_juan-poster.jpg"} 
          alt="Paisajes de San Juan Tahitic"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          onLoad={onVideoLoad}
        />
      )}

      {/* Overlays optimizados para móviles */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-transparent to-black/60"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
      
      {/* Loading state móvil mejorado */}
      {!isVideoLoaded && !videoError && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          <div className="text-white text-lg animate-pulse">
            {isMobile ? 'Cargando...' : 'Cargando experiencia...'}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Contenido principal optimizado para móviles
 */
interface MainContentProps {
  scrollToTourism: () => void;
  scrollToContact: () => void;
  isVideoLoaded: boolean;
  isMobile: boolean;
  reduceMotion: boolean;
  clima: string;
  climaError: string | null;
}

const MainContent: FC<MainContentProps> = ({ 
  scrollToTourism, 
  scrollToContact, 
  isVideoLoaded, 
  isMobile,
  reduceMotion,
  clima,
  climaError 
}) => (
  <div className={`relative z-10 text-center max-w-4xl mx-auto px-4 py-8 sm:py-20 flex flex-col items-center transition-opacity duration-1000 ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}>
    
    {/* Badge superior optimizado para móviles */}
    <div className={`inline-flex items-center space-x-2 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1 sm:py-2 rounded-full mb-10 sm:mb-12 border border-white/30 shadow-xl ${
      reduceMotion ? '' : 'animate-fade-in-down'
    }`}>
      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-green-300" aria-hidden="true" />
      <span className="text-white font-medium text-sm sm:text-base">Región Central</span>
      <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-300 animate-pulse" aria-hidden="true" />
    </div>

    {/* Título animado con optimizaciones móviles */}
    <div className={`relative mb-10 sm:mb-12 w-full flex justify-center ${
      reduceMotion ? '' : 'animate-fade-in-up'
    }`}>
    <Suspense fallback={<AnimatedTitleFallback isMobile={isMobile} />}>
      {isVideoLoaded ? (
        <AnimatedLetterTitle />
      ) : (
        <AnimatedTitleFallback isMobile={isMobile} />
      )}
    </Suspense>
    </div>

    {/* Datos rápidos optimizados para móviles */}
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 max-w-4xl w-full mx-auto mb-12 sm:mb-14 ${
      reduceMotion ? '' : 'animate-fade-in-up'
    }`}>
      {[
        { label: "Clima", value: climaError ? "Error" : clima, icon: <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-300" aria-hidden="true" /> },
        { label: "Idioma", value: "Español", icon: <Languages className="h-4 w-4 sm:h-5 sm:w-5 text-blue-300" aria-hidden="true" /> },
        { label: "Moneda", value: "MXN", icon: <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-300" aria-hidden="true" /> },
        { label: "Temporada", value: "Mar-Oct", icon: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-pink-300" aria-hidden="true" /> }
      ].map((info, index) => (
        <div
          key={index}
          className="bg-white/10 backdrop-blur-md p-2 sm:p-4 rounded-lg sm:rounded-xl border border-white/20 shadow-lg hover:bg-white/15 transition-colors duration-300 flex flex-col items-center"
          role="listitem"
        >
          {info.icon}
          <div className="text-green-300 text-sm uppercase mt-1 sm:mt-2 font-semibold">{info.label}</div>
          <div className="text-white text-xs sm:text-sm font-medium mt-1">{info.value}</div>
        </div>
      ))}
    </div>

    {/* Botones optimizados para móviles */}
    <div className={`flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center items-center w-full ${
      reduceMotion ? '' : 'animate-fade-in-up'
    }`}>
      <Button 
        size={isMobile ? "default" : "lg"}
        onClick={scrollToTourism}
        className="group relative w-full sm:w-auto overflow-hidden rounded-full border-0 bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl sm:px-10 sm:py-4 sm:text-lg"
        aria-label="Descubre más sobre el turismo en San Juan Tahitic"
      >
        {/* Efecto de brillo */}
        <span className="absolute inset-0 h-full w-full -translate-x-full transform bg-white opacity-20 transition-transform duration-700 ease-in-out group-hover:translate-x-full group-hover:duration-1000" />
        
        <span className="relative z-10 flex items-center justify-center">
          Descubre San Juan Tahitic
          <ArrowDown className="ml-2 h-5 w-5 transition-transform duration-300 ease-in-out group-hover:translate-y-1" aria-hidden="true" />
        </span>
      </Button>

      <Button 
        variant="outline"
        size={isMobile ? "default" : "lg"}
        onClick={scrollToContact}
        className="group relative w-full sm:w-auto rounded-full border-2 border-transparent bg-white/10 px-6 py-3 text-base font-semibold text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-105 hover:shadow-xl sm:px-10 sm:py-4 sm:text-lg"
        aria-label="Comienza tu aventura en San Juan Tahitic"
      >
        {/* Contenedor del borde Aurora */}
        <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-amber-400 via-rose-500 to-green-400 opacity-0 transition-opacity duration-500 group-hover:opacity-75" />
        
        {/* Pseudo-elemento para la animación del borde */}
        <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-amber-400 via-rose-500 to-green-400 opacity-0 blur-lg transition-opacity duration-500 group-hover:animate-spin-slow group-hover:opacity-50" />

        <span className="relative z-10 flex items-center justify-center">
          Empieza tu aventura
          <Sparkles className="ml-2 h-5 w-5 transform transition-transform duration-500 ease-in-out group-hover:rotate-12 group-hover:scale-125" aria-hidden="true" />
        </span>
      </Button>
    </div>
  </div>
);

/**
 * Indicador de scroll optimizado para móviles
 */
const ScrollIndicator: FC<{ isMobile: boolean; reduceMotion: boolean }> = ({ isMobile, reduceMotion }) => (
  <div className={`absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 ${
    reduceMotion ? '' : 'animate-fade-in'
  }`}>
    <div className="flex flex-col items-center space-y-6 sm:space-y-4">
      <div className="text-white/60 text-xs sm:text-sm font-medium animate-pulse">
        {isMobile ? 'Desliza' : 'Descubre más'}
      </div>
      <div className="relative">
        <div className={`relative bg-white/30 backdrop-blur-sm rounded-full border border-white/40 shadow-lg ${
          reduceMotion ? '' : 'animate-bounce'
        } ${isMobile ? 'p-2' : 'p-3'}`}>
          <ArrowDown className={isMobile ? "h-4 w-4 text-white" : "h-6 w-6 text-white"} aria-hidden="true" />
        </div>
      </div>
    </div>
  </div>
);