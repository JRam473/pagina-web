// src/components/figma/AnimatedLetterTitle.tsx
import { type Easing } from "framer-motion";
import { type FC, useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Datos inmutable fuera del componente
const PHRASES = [
  {
    welcome: "Bienvenido a",
    location: "San Juan Tahitic",
    lang: "es", // Metadata para accesibilidad
    shortLocation: "San Juan Tahitic" // Para móviles si necesitamos abreviar
  },
  {
    welcome: "Xiixmati", 
    location: "San Juan Tahitic", 
    lang: "mix", // Lengua mixe para metadata
    shortLocation: "San Juan Tahitic"
  }
] as const;

// Constantes para timing - adaptadas para móviles
const DESKTOP_ANIMATION_DURATION = 4000; // 4 segundos desktop
const MOBILE_ANIMATION_DURATION = 6000; // 6 segundos móvil (más lento)
const DESKTOP_TRANSITION_DURATION = 0.8;
const MOBILE_TRANSITION_DURATION = 0.5; // Más rápido en móviles

// Hook personalizado para detección móvil y preferencias
const useDeviceOptimization = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const checkDeviceAndPreferences = () => {
      // Detectar móvil
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

    checkDeviceAndPreferences();
    
    const handleResize = () => {
      checkDeviceAndPreferences();
    };

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReduceMotion(e.matches);
    };

    window.addEventListener('resize', handleResize);
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionMediaQuery.addEventListener('change', handleMotionChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      motionMediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  return { isMobile, reduceMotion };
};

// Hook personalizado para el ciclo de frases optimizado para móviles
const usePhraseCycle = (phrases: typeof PHRASES, isMobile: boolean, reduceMotion: boolean) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextPhrase = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % phrases.length);
  }, [phrases.length]);

  const pauseCycle = useCallback(() => setIsPaused(true), []);
  const resumeCycle = useCallback(() => setIsPaused(false), []);

  // Ciclo automático con pausa - optimizado para móviles
  useEffect(() => {
    if (isPaused || reduceMotion) return;

    const intervalTime = isMobile ? MOBILE_ANIMATION_DURATION : DESKTOP_ANIMATION_DURATION;
    
    const cycleInterval = setInterval(nextPhrase, intervalTime);
    return () => clearInterval(cycleInterval);
  }, [nextPhrase, isMobile, isPaused, reduceMotion]);

  return {
    currentPhrase: phrases[currentIndex],
    currentIndex,
    isPaused,
    pauseCycle,
    resumeCycle,
    nextPhrase
  };
};

// Componente de título individual optimizado para móviles
const AnimatedPhrase: FC<{ 
  phrase: typeof PHRASES[number]; 
  isMobile: boolean;
  reduceMotion: boolean;
  onAnimationComplete?: () => void;
}> = ({ phrase, isMobile, reduceMotion, onAnimationComplete }) => {
  // Animaciones simplificadas para móviles y reducción de movimiento
  const mobileAnimations = useMemo(() => {
    if (reduceMotion) {
      return {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 1 },
        transition: { duration: 0 }
      };
    }

    if (isMobile) {
      return {
        initial: { opacity: 0, y: 20 }, // Menos desplazamiento en móviles
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: { 
          duration: MOBILE_TRANSITION_DURATION, 
          ease: "easeInOut" as Easing// Mejor performance en móviles
        }
      };
    }

    return {
      initial: { opacity: 0, y: 40 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -40 },
      transition: { 
        duration: DESKTOP_TRANSITION_DURATION, 
        ease: "easeInOut" as Easing
      }
    };
  }, [isMobile, reduceMotion]);

  return (
    <motion.h1
      key={`${phrase.welcome}-${phrase.lang}-${isMobile ? 'mobile' : 'desktop'}`}
      {...mobileAnimations}
      onAnimationComplete={onAnimationComplete}
      className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold leading-tight text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] px-4"
      aria-live="polite"
      aria-atomic="true"
      style={{
        // Optimizaciones de rendimiento para móviles
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      }}
    >
      {phrase.welcome}
      <br />
      <span 
        className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-green-600"
        lang={phrase.lang === 'mix' ? 'mix' : 'es'}
      >
        {phrase.location}
      </span>
    </motion.h1>
  );
};

// Loading fallback para Suspense - optimizado para móviles
export const AnimatedTitleFallback: FC<{ isMobile?: boolean }> = ({ isMobile = false }) => (
  <div className="flex flex-col items-center justify-center text-center overflow-hidden px-4">
    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold leading-tight text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]">
      Bienvenido a
      <br />
      <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-green-600">
        San Juan Tahitic
      </span>
    </h1>
    {isMobile && (
      <div className="sr-only">
        Cargando título animado...
      </div>
    )}
  </div>
);

/**
 * Componente principal optimizado para móviles
 */
export const AnimatedLetterTitle: FC = () => {
  const { isMobile, reduceMotion } = useDeviceOptimization();
  const {
    currentPhrase,
    currentIndex,
    isPaused,
    pauseCycle,
    resumeCycle
  } = usePhraseCycle(PHRASES, isMobile, reduceMotion);

  // Si hay reducción de movimiento, mostrar solo la primera frase
  if (reduceMotion) {
    return (
      <div className="flex flex-col items-center justify-center text-center overflow-hidden px-4">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold leading-tight text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]">
          Bienvenido a
          <br />
          <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-green-600">
            San Juan Tahitic
          </span>
        </h1>
      </div>
    );
  }

  // Memoizar el contenido para evitar re-renders innecesarios
  const titleContent = useMemo(() => (
    <div 
      className="flex flex-col items-center justify-center text-center overflow-hidden"
      onMouseEnter={pauseCycle}
      onMouseLeave={resumeCycle}
      onTouchStart={pauseCycle} // Para móviles
      onTouchEnd={resumeCycle}  // Para móviles
      onFocus={pauseCycle}
      onBlur={resumeCycle}
      role="marquee"
      aria-label="Título de bienvenida que alterna entre español y lengua mixe"
      style={{
        // Contenedor optimizado para GPU
        transform: 'translateZ(0)'
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <AnimatedPhrase 
          phrase={currentPhrase} 
          isMobile={isMobile}
          reduceMotion={reduceMotion}
          key={`${currentPhrase.welcome}-${isMobile ? 'mobile' : 'desktop'}`}
        />
      </AnimatePresence>
      
      {/* Indicadores de progreso para accesibilidad */}
      <div 
        className="sr-only" 
        aria-live="polite"
      >
        {isPaused ? 'Animación pausada' : `Mostrando frase en ${currentPhrase.lang === 'mix' ? 'lengua mixe' : 'español'}`}
      </div>

      {/* Indicador visual para móviles (opcional) */}
      {isMobile && !isPaused && (
        <div className="flex justify-center mt-4 space-x-1">
          {PHRASES.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex ? 'bg-green-400' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  ), [currentPhrase, isPaused, isMobile, reduceMotion, pauseCycle, resumeCycle]);

  return titleContent;
};

// Versión simplificada para uso en fallbacks
export const StaticTitle: FC<{ isMobile?: boolean }> = ({ isMobile = false }) => (
  <div className="flex flex-col items-center justify-center text-center overflow-hidden px-4">
    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold leading-tight text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]">
      Bienvenido a
      <br />
      <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-green-600">
        San Juan Tahitic
      </span>
    </h1>
  </div>
);

// Exportación por defecto para lazy loading
export default AnimatedLetterTitle;