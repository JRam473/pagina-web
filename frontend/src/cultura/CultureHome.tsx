// src/sections/CultureHome.tsx
import { ArrowDown, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export function CultureHome() {
  return (
    <section
      id="cultura"
      aria-labelledby="culture-heading"
      className="relative w-full h-screen overflow-hidden"
    >
      {/* Video de fondo en pantalla completa */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/images/cultura/videos/Inicio/culture-fallback.webp"
          className="w-full h-full object-cover"
        >
          <source src="/images/cultura/videos/Inicio/Negritos_optimizado_new.webm" type="video/webm" />
          <source src="/images/cultura/videos/Inicio/Negritos_optimizado.mp4" type="video/mp4" />
          
          Tu navegador no soporta la reproducción de video.
        </video>

        {/* Overlay para mejorar legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/30"></div>
      </div>

      {/* Contenido principal centrado */}
      <div className="relative z-20 flex flex-col items-center justify-center h-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          {/* Badge superior */}
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-100/80 to-amber-100/80 px-4 py-2 rounded-full mb-6 backdrop-blur-sm shadow-sm">
            <Sparkles className="h-5 w-5 text-orange-600" aria-hidden="true" />
            <span className="text-orange-800 font-medium">Herencia Cultural</span>
          </div>

          {/* Título principal */}
          <h2
            id="culture-heading"
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-tight text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]"
          >
            Patrimonio{' '}
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-red-500 bg-clip-text text-transparent">
              Cultural
            </span>
          </h2>

          {/* Descripción */}
          <p className="text-lg sm:text-xl text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]">
            Nuestra rica herencia cultural es el alma de San Juan Tahitic. Descubre las tradiciones,
            arte y expresiones que han dado forma a nuestra identidad comunitaria a lo largo de los
            siglos.
          </p>
        </motion.div>

        {/* Botones centrados */}
        <motion.div
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
        >
      <motion.button
        onClick={() =>
          document.getElementById("cultura-section")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
        }
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        className="inline-flex items-center gap-2 bg-orange-500 text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:bg-orange-600 transition-colors"
      >
        Explora nuestra cultura
        <ArrowDown className="h-5 w-5" />
      </motion.button>
        <Link
            to="/calendario-cultural"
            className="border-2 border-orange-500 text-orange-100 hover:bg-orange-500/20 px-8 py-4 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 text-center backdrop-blur-sm"            >
            Calendario Cultural
        </Link>
        </motion.div>
      </div>
    </section>
  );
}

