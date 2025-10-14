// src/components/VisualCardsSection.tsx
import { motion, useScroll, useTransform, useAnimation, useInView, useReducedMotion } from "framer-motion";
import { useRef, useEffect, useState, useCallback } from "react";

/* =============================
   Tipos
============================= */
interface CardData {
  title: string;
  description: string;
  image: string;
  link: string;
  priority?: boolean;
}

interface VisualCardProps {
  card: CardData;
  index: number;
  shouldReduceMotion: boolean;
  isMobile: boolean;
}

/* =============================
   Datos optimizados
============================= */
const cardsData: CardData[] = [
  {
    title: "Comedor de Doña Adela",
    description: "Disfruta de la gastronomía local con platillos tradicionales y auténticos sabores de la región.",
    image: "/images/home/cards/Comedor.webp",
    link: "#comedor",
    priority: true // Primera imagen con prioridad
  },
  {
    title: "Cascada de los Enamorados",
    description: "Admira una de las cascadas más bellas, rodeada de naturaleza y tranquilidad.",
    image: "/images/home/cards/Cascada-enamorados.webp",
    link: "#cascada",
  },
  {
    title: "Construcción de cabañas al 60%",
    description: "Próximamente nuevas opciones de hospedaje inmersas en la naturaleza.",
    image: "/images/home/cards/Cabanas.webp",
    link: "#cabanas",
  },
  {
    title: "Miradores",
    description: "Vistas panorámicas impresionantes para capturar recuerdos inolvidables.",
    image: "/images/home/cards/mirador.webp",
    link: "#miradores",
  },
  {
    title: "Danzas",
    description: "Vive la riqueza cultural a través de danzas y música tradicional.",
    image: "/images/home/cards/Danza.webp",
    link: "#danzas",
  },
  {
    title: "Ríos",
    description: "Sumérgete en la belleza de nuestros ríos y disfruta de su entorno natural.",
    image: "/images/home/cards/Rios.webp",
    link: "#rios",
  },
];

/* =============================
   Hook personalizado para detección de dispositivo y optimizaciones
============================= */
const useDeviceOptimization = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const checkDeviceCapabilities = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      // Detectar dispositivos low-end
      if ('hardwareConcurrency' in navigator && 'deviceMemory' in navigator) {
        const cores = navigator.hardwareConcurrency || 4;
        const memory = (navigator as any).deviceMemory || 4;
        setIsLowEndDevice(cores < 4 || memory < 4);
      }
    };

    checkDeviceCapabilities();
    
    // Debounce resize para mejor performance
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkDeviceCapabilities, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  return { isMobile, isLowEndDevice, shouldReduceMotion: shouldReduceMotion || isLowEndDevice };
};

/* =============================
   Hook personalizado para auto-scroll optimizado
============================= */
const useAutoScroll = (
  containerRef: React.RefObject<HTMLDivElement | null>, // ← AÑADE | null aquí
  isActive: boolean,
  isMobile: boolean,
  shouldReduceMotion: boolean
) => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getCardStep = useCallback(() => {
    if (!containerRef.current) return 400;
    const firstCard = containerRef.current.querySelector<HTMLDivElement>(".snap-center");
    const gap = 32;
    if (!firstCard) return 400;
    return firstCard.clientWidth + gap;
  }, [containerRef]);

  const scrollToPosition = useCallback((position: number) => {
    if (!containerRef.current) return;
    
    // Usar requestAnimationFrame para mejor performance
    animationFrameRef.current = requestAnimationFrame(() => {
      containerRef.current!.scrollTo({
        left: position,
        behavior: shouldReduceMotion ? 'auto' : 'smooth'
      });
    });
  }, [containerRef, shouldReduceMotion]);

  const scrollBy = useCallback((delta: number) => {
    if (!containerRef.current) return;
    
    animationFrameRef.current = requestAnimationFrame(() => {
      containerRef.current!.scrollBy({
        left: delta,
        behavior: shouldReduceMotion ? 'auto' : 'smooth'
      });
    });
  }, [containerRef, shouldReduceMotion]);

  const centerFirstCard = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const first = c.querySelector<HTMLElement>(".snap-center");
    if (!first) return;
    const clientWidth = c.clientWidth;
    const offsetLeft = first.offsetLeft;
    const left = Math.max(0, offsetLeft - (clientWidth - first.clientWidth) / 2);
    scrollToPosition(left);
  }, [containerRef, scrollToPosition]);

  const startAutoScroll = useCallback(() => {
    if (shouldReduceMotion || !isActive) return;
    
    stopAutoScroll();

    intervalRef.current = setInterval(() => {
      const c = containerRef.current;
      if (!c) return;

      const cardStep = getCardStep();
      const scrollWidth = c.scrollWidth;
      const clientWidth = c.clientWidth;
      const current = Math.round(c.scrollLeft);

      if (current + clientWidth >= scrollWidth - 2) {
        scrollToPosition(0);
      } else {
        scrollBy(cardStep);
      }
    }, isMobile ? 4000 : 3000); // Más lento en móviles
  }, [containerRef, getCardStep, scrollToPosition, scrollBy, isActive, isMobile, shouldReduceMotion]);

  const stopAutoScroll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const pauseThenResume = useCallback((delayMs = 3000) => {
    stopAutoScroll();
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      if (isActive) startAutoScroll();
    }, delayMs);
  }, [stopAutoScroll, startAutoScroll, isActive]);

  useEffect(() => {
    return () => {
      stopAutoScroll();
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, [stopAutoScroll]);

  return {
    startAutoScroll,
    stopAutoScroll,
    pauseThenResume,
    centerFirstCard,
    scrollBy,
    scrollToPosition
  };
};

/* =============================
   Tarjeta individual optimizada
============================= */
const VisualCard = ({ card, index, shouldReduceMotion, isMobile }: VisualCardProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: isMobile ? "-50px" : "-100px" });

  // Optimización: solo usar parallax en dispositivos capaces
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  
  const y = useTransform(
    scrollYProgress, 
    [0, 1], 
    shouldReduceMotion ? [0, 0] : [-50, 50] // Menos movimiento en dispositivos limitados
  );

  const variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 50 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: shouldReduceMotion ? 0.4 : 0.6, 
        delay: shouldReduceMotion ? 0 : index * 0.10 
      } 
    },
  };

  const hoverVariants = shouldReduceMotion ? {} : {
    whileHover: { scale: 1.02 }
  };

  return (
    <motion.div
      ref={ref}
      className="relative snap-center flex-shrink-0 w-[calc(100vw-48px)] max-w-[350px] mx-auto sm:w-[350px] lg:w-[400px] h-[400px] sm:h-[450px] rounded-2xl overflow-hidden shadow-2xl cursor-pointer group bg-gray-900"
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={variants}
      {...hoverVariants}
      role="article"
      aria-label={`Tarjeta de ${card.title}`}
    >
      {/* Imagen optimizada */}
      <motion.div 
        style={shouldReduceMotion ? undefined : { y }} 
        className="absolute inset-0 w-full h-full"
      >
        <img
          src={card.image}
          alt={card.title}
          width={400}
          height={450}
          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          loading={card.priority ? "eager" : "lazy"}
          decoding="async"
        />
      </motion.div>

      {/* Overlay optimizado */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-all duration-500 group-hover:from-black/90 group-hover:via-black/50" />

      {/* Contenido */}
      <div className="relative z-10 p-6 sm:p-8 flex flex-col justify-end h-full text-white">
        <h3 className="text-xl sm:text-2xl font-bold mb-2 drop-shadow-lg leading-tight">{card.title}</h3>
        <p className="text-gray-200 text-xs sm:text-sm drop-shadow-md line-clamp-2">{card.description}</p>

        {/* Botón optimizado */}
        <a
          href={card.link}
          aria-label={`Explorar ${card.title}`}
          className={`
            mt-4 sm:mt-6 inline-block w-fit px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium 
            border border-white/80 rounded-full transition-all duration-300 
            opacity-100 translate-y-0 sm:opacity-0 sm:translate-y-4 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 
            hover:bg-white hover:text-gray-900 shadow-md
            focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900
            ${shouldReduceMotion ? 'sm:opacity-100 sm:translate-y-0' : ''}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          Explorar
        </a>
      </div>
    </motion.div>
  );
};

/* =============================
   Sección principal optimizada
============================= */
export function VisualCardsSection() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { isMobile, isLowEndDevice, shouldReduceMotion } = useDeviceOptimization();
  const inView = useInView(containerRef, { once: true, amount: 0.3 });
  
  const {
    startAutoScroll,
    stopAutoScroll,
    pauseThenResume,
    centerFirstCard,
    scrollBy,
    scrollToPosition
  } = useAutoScroll(containerRef, inView, isMobile, shouldReduceMotion);

  // Navegación optimizada
  
  // Efectos optimizados
  useEffect(() => {
    if (inView && !shouldReduceMotion) {
      // Pequeño delay para centrado inicial
      const centerTimer = setTimeout(() => {
        centerFirstCard();
      }, 100);

      startAutoScroll();

      // Event listeners optimizados
      const el = containerRef.current;
      if (!el) return;

      const onInteract = () => pauseThenResume(8000);
      const onEnter = () => stopAutoScroll();
      const onLeave = () => {
        if (inView) {
          pauseThenResume(3000);
        }
      };

      // Passive events para mejor performance
      el.addEventListener("mouseenter", onEnter, { passive: true });
      el.addEventListener("mouseleave", onLeave, { passive: true });
      el.addEventListener("touchstart", onInteract, { passive: true });
      el.addEventListener("wheel", onInteract, { passive: true });

      return () => {
        clearTimeout(centerTimer);
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
        el.removeEventListener("touchstart", onInteract);
        el.removeEventListener("wheel", onInteract);
        stopAutoScroll();
      };
    }
  }, [inView, shouldReduceMotion, startAutoScroll, stopAutoScroll, pauseThenResume, centerFirstCard]);

  // Preload de primera imagen crítica
  useEffect(() => {
    const preloadImage = new Image();
    preloadImage.src = cardsData[0].image;
  }, []);

  return (
    <section 
      className="relative bg-black py-16 sm:py-24 px-0 overflow-hidden"
      aria-label="Galería de atracciones de San Juan Tahitic"
    >
      {/* Título optimizado */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-12 sm:mb-16">
        <motion.h2
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white text-center drop-shadow-2xl"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.3 : 0.8 }}
          viewport={{ once: true }}
        >
          Explora San Juan Tahitic
        </motion.h2>
        <motion.p
          className="text-base sm:text-lg text-gray-400 mt-3 sm:mt-4 text-center max-w-2xl mx-auto"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.3 : 0.8, delay: 0.1 }}
          viewport={{ once: true }}
        >
          Descubre las maravillas que te esperan en este paraíso
        </motion.p>
      </div>

      {/* Flechas optimizadas */}
      {!isMobile && (
        <>
          <button
            aria-label="Anterior"
            onClick={() => {
              const c = containerRef.current;
              if (!c) return;
              c.scrollBy({ left: -400, behavior: 'smooth' });
              pauseThenResume();
            }}
            className="hidden sm:flex absolute left-2 lg:left-4 top-1/2 -translate-y-1/2 z-30 items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 lg:w-6 lg:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            aria-label="Siguiente"
            onClick={() => {
              const c = containerRef.current;
              if (!c) return;
              c.scrollBy({ left: 400, behavior: 'smooth' });
              pauseThenResume();
            }}
            className="hidden sm:flex absolute right-2 lg:right-4 top-1/2 -translate-y-1/2 z-30 items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 lg:w-6 lg:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Carrusel optimizado */}
      <div
        ref={containerRef}
        className="flex flex-nowrap gap-6 sm:gap-8 py-4 px-4 sm:px-6 lg:px-8 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide"
        role="region"
        aria-label="Carrusel de tarjetas"
        aria-live="polite"
      >
        {cardsData.map((card, index) => (
          <VisualCard 
            key={`${card.title}-${index}`}
            card={card} 
            index={index}
            shouldReduceMotion={shouldReduceMotion}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* Indicadores de progreso para móvil */}
      {isMobile && (
        <div className="flex justify-center mt-6 space-x-2">
          {cardsData.map((_, index) => (
            <button
              key={index}
              aria-label={`Ir a tarjeta ${index + 1}`}
              className="w-2 h-2 rounded-full bg-white/30 hover:bg-white/50 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-white"
              onClick={() => {
                // Navegación directa a tarjeta específica
                const c = containerRef.current;
                if (c) {
                  const cards = c.querySelectorAll<HTMLElement>('.snap-center');
                  if (cards[index]) {
                    const cardStep = cards[index].offsetLeft;
                    scrollToPosition(cardStep);
                    pauseThenResume();
                  }
                }
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}