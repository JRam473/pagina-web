import { ArrowDown, ArrowRight, Sparkles, Utensils } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';


export function GastronomySection() {
  return (
    <section
      id="section-gastronomia"
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
          poster="/images/cultura/gastronomia/videos/video_bg_poster.webp"
          className="w-full h-full object-cover"
        >
          <source src="/images/cultura/gastronomia/videos/video_bg.webm" type="video/webm" />
          <source src="/images/cultura/gastronomia/videos/video_bg.mp4" type="video/mp4" />

          Tu navegador no soporta la reproducción de video.
        </video>

        {/* Overlay para mejorar legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/30"></div>
      </div>

      {/* Overlay para mejorar legibilidad */}
<div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/20"></div>

    {/* Contenido principal centrado */}
    <div className="relative z-20 flex flex-col items-center justify-center h-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        viewport={{ once: true }}
      >
        {/* Badge superior */}
        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-100/80 to-lime-100/80 px-4 py-2 rounded-full mb-6 backdrop-blur-sm shadow-sm">
          <Utensils className="h-5 w-5 text-amber-700" aria-hidden="true" />
          <span className="text-lime-800 font-medium">Sabores de Tahitic</span>
        </div>

        {/* Título principal */}
        <h2
          id="gastronomia-heading"
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.7)] text-center"
        >
          Gastronomía{' '}
          <span className="bg-gradient-to-r from-amber-500 via-red-500 to-lime-600 bg-clip-text text-transparent">
            Mexicana
          </span>
        </h2>

        {/* Descripción */}
        <p className="mt-4 text-base sm:text-lg text-white text-center drop-shadow-[0_4px_6px_rgba(0,0,0,0.7)] max-w-3xl">
          Descubre los platillos típicos, ingredientes locales y recetas que dan sabor a San Juan Tahitic. Una experiencia culinaria que conecta con nuestras raíces.
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
            document.getElementById("section-gastronomia-inmersiva-v2")?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
          }
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 bg-red-600 text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:bg-red-700 transition-colors"
        >
          Explora la gastronomía
          <ArrowDown className="h-5 w-5" />
        </motion.button>

        <Link
          to="/cultura"
          className="border-2 border-amber-500 text-amber-100 hover:bg-amber-500/20 px-8 py-4 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 text-center backdrop-blur-sm"
        >
          Regresar
        </Link>
      </motion.div>
    </div>

    </section>
  );
}
