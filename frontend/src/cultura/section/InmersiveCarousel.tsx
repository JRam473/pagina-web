import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

const phrases = [
  "Vive la magia de las montañas y el eco de sus tradiciones.",
  "Cada danza cuenta una historia... cada paso, una emoción.",
  "Donde la naturaleza abraza la cultura y el alma se siente libre.",
  "El corazón de la Sierra palpita en San Juan Tahitic.",
  "Tu próxima experiencia comienza aquí, donde el tiempo se detiene.",
];

export function InmersiveCarousel() {
  const [index, setIndex] = useState(0);

  // Rotación automática de frases
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % phrases.length);
    }, 5000); // cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden mt-20">
      {/* Fondo animado */}
      <motion.div
        className="absolute inset-0 bg-[url('/images/tahitic-montanas.webp')] bg-cover bg-center"
        initial={{ scale: 1.1 }}
        whileInView={{ scale: 1 }}
        transition={{ duration: 3, ease: "easeOut" }}
      />

      {/* Degradado para contraste */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Contenido */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center text-white py-24 px-6">
        <Sparkles className="mx-auto mb-4 h-10 w-10 text-yellow-400 animate-pulse" />

        <h2 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
          Descubre la esencia de <span className="text-orange-400">San Juan Tahitic</span>
        </h2>

        {/* Carrusel de frases */}
        <div className="h-20 md:h-16 relative w-full max-w-2xl mx-auto mb-10">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="text-lg text-gray-200 italic"
            >
              {phrases[index]}
            </motion.p>
          </AnimatePresence>
        </div>

        <motion.a
          href="/cultura"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 bg-orange-500 text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:bg-orange-600 transition-colors"
        >
          Explorar más
          <ArrowRight className="h-5 w-5" />
        </motion.a>
      </div>

      {/* Ondas decorativas */}
      <svg
        className="absolute bottom-0 left-0 w-full h-24 text-white/20"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        fill="currentColor"
      >
        <path d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,133.3C672,117,768,107,864,122.7C960,139,1056,181,1152,186.7C1248,192,1344,160,1392,144L1440,128V320H0Z"></path>
      </svg>
    </section>
  );
}
