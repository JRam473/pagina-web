import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { Utensils, Leaf, Star, Calendar, Sparkles, Heart, MousePointer2, ArrowDown, Cookie } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

type Dish = {
  name: string;
  description: string;
  image: string;
  video: string;
  origin?: string;
  ingredients?: string[];
  spiceLevel?: 'Suave' | 'Medio' | 'Picante';
  festival?: string;
};

const dishes: Dish[] = [
  {
    name: "Mole Poblano",
    description: "Receta ancestral con mezcla de chiles, especias y cacao, una joya de la gastronomía regional.",
    image: "/images/cultura/gastronomia/Comedor.webp",
    video: "/images/cultura/videos/gastronomia/Mole-poblano_720p.mp4",
    origin: "San Juan Tahitic",
    ingredients: ["Chiles secos", "Cacao", "Especias", "Semillas", "Tortilla"],
    spiceLevel: "Medio",
    festival: "Fiestas patronales de mayo",
  },
  {
    name: "Tamales de Hoja",
    description: "Suave masa de maíz rellena y envuelta en hojas de plátano, cocidos al vapor para un sabor único.",
    image: "/images/cultura/gastronomia/tamales-hoja.jpg",
    video: "/images/cultura/videos/gastronomia/Tamales_optimizado.mp4",
    origin: "Comunidad local",
    ingredients: ["Maíz", "Relleno tradicional", "Hojas de plátano", "Salsa"],
    spiceLevel: "Suave",
    festival: "Ferias gastronómicas",
  },
  {
    name: "Atole de Maíz Morado",
    description: "Bebida caliente tradicional elaborada con maíz local, perfecta para acompañar las mañanas frías.",
    image: "/images/cultura/gastronomia/atole.jpg",
    video: "/images/cultura/videos/gastronomia/atole_optimizado.mp4",
    origin: "Región Sierra Norte",
    ingredients: ["Maíz morado", "Agua", "Piloncillo", "Canela"],
    spiceLevel: "Suave",
    festival: "Mañanitas y eventos matutinos",
  },
  {
    name: "Pan Artesanal",
    description: "Delicioso pan horneado en leña con recetas ancestrales que han pasado de generación en generación.",
    image: "/images/cultura/gastronomia/pan.jpg",
    video: "/images/cultura/videos/gastronomia/atole_optimizado.mp4",
    origin: "Hornos tradicionales",
    ingredients: ["Harina", "Levadura", "Piloncillo", "Especias"],
    spiceLevel: "Suave",
    festival: "Ferias anuales y festividades",
  },
];

export function CultureGastronomySection() {
  const highlights = [
    { icon: Utensils, number: "50+", label: "Recetas Tradicionales", color: "text-amber-600" },
    { icon: Leaf, number: "100%", label: "Ingredientes Locales", color: "text-orange-600" },
    { icon: Calendar, number: "3", label: "Ferias Anuales", color: "text-rose-600" },
    { icon: Heart, number: "100%", label: "Sabor y Tradición", color: "text-red-600" }
  ];

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [playingVideo, setPlayingVideo] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = parseInt(entry.target.getAttribute('data-index') || '-1', 10);
          if (entry.isIntersecting) {
            if (window.innerWidth <= 768) setPlayingVideo(index);
          } else {
            if (window.innerWidth <= 768 && playingVideo === index) setPlayingVideo(null);
          }
        });
      },
      { threshold: 0.7 }
    );

    videoRefs.current.forEach((el) => el && observer.observe(el));

    return () => {
      videoRefs.current.forEach((el) => el && observer.unobserve(el));
      observer.disconnect();
    };
  }, [playingVideo]);

  const handleMouseEnter = (index: number) => {
    if (window.innerWidth > 768) setPlayingVideo(index);
  };

  const handleMouseLeave = () => {
    if (window.innerWidth > 768) setPlayingVideo(null);
  };

  useEffect(() => {
    videoRefs.current.forEach((videoRef, index) => {
      if (!videoRef) return;
      if (playingVideo === index) {
        videoRef.play().catch(() => {});
      } else {
        videoRef.pause();
        videoRef.currentTime = 0;
      }
    });
  }, [playingVideo]);

  return (
    <section id="gastronomia" className="py-24 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-20 right-10 w-40 h-40 bg-orange-200/30 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 left-10 w-32 h-32 bg-amber-200/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }}></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-rose-200/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '0.5s' }}></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-20">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-100 to-amber-100 px-4 py-2 rounded-full mb-6">
            <Utensils className="h-5 w-5 text-orange-600" />
            <span className="text-orange-800 font-medium">Sabores Ancestrales</span>
          </div>
          <h2 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Un Viaje{' '}
            <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-red-600 bg-clip-text text-transparent">
              Gastronómico
            </span>
          </h2>
          <p className="text-xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
            Descubre los sabores de nuestra tierra, donde cada platillo narra una historia de herencia, tradición e ingredientes cultivados con amor.
          </p>
        </div>

        {/* Grid de tarjetas (altura aumentada y responsiva) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {dishes.map((dish, idx) => (
            <Card
              key={idx}
              className="group h-full hover:shadow-culture transition-all duration-500 transform hover:-translate-y-2 border-0 bg-white/90 backdrop-blur-sm overflow-hidden"
              onMouseEnter={() => handleMouseEnter(idx)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="relative overflow-hidden rounded-t-2xl">
                {/* Imagen más alta en desktop; controlado por breakpoints */}
                <ImageWithFallback
                  src={dish.image}
                  alt={dish.name}
                  className={`w-full h-56 sm:h-64 md:h-72 lg:h-80 object-cover transform transition-opacity duration-500 ${
                    playingVideo === idx ? 'opacity-0' : 'opacity-100'
                  }`}
                />

                {/* Video con mismas alturas para solapar suavemente */}
                <video
                  ref={el => {videoRefs.current[idx] = el}}
                  data-index={idx}
                  src={dish.video}
                  className={`absolute inset-0 w-full h-56 sm:h-64 md:h-72 lg:h-80 object-cover transform transition-opacity duration-500 ${
                    playingVideo === idx ? 'opacity-100' : 'opacity-0'
                  }`}
                  loop
                  muted
                  playsInline
                  preload="none"
                />

                {/* Overlay decorativo y gradiente */}
                <div className="absolute inset-0 bg-gradient-to-t from-orange-900/40 to-transparent rounded-t-2xl"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Badge de estrella */}
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full shadow-xl">
                  <Star className="h-4 w-4 text-orange-700" />
                </div>

                {/* Indicador de hover solo desktop (se oculta al hacer hover y cuando el video está activo) */}
                <div
                  className={`hidden md:flex items-center gap-2 absolute bottom-3 left-1/2 -translate-x-1/2 
                              bg-white/40 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-md
                              text-sm text-gray-800 transition-opacity duration-300
                              ${playingVideo === idx ? 'opacity-0' : 'opacity-100'} group-hover:opacity-0 pointer-events-none`}
                  aria-hidden="true"
                >
                  <MousePointer2 className="h-4 w-4 text-orange-700" />
                  <span>Pasa el mouse para ver el video</span>
                </div>
              </div>

              <CardContent className="p-6 relative">
                <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-orange-700 transition-colors duration-300">
                  {dish.name}
                </CardTitle>

                <CardDescription className="mt-2 text-gray-600 text-sm leading-relaxed">
                  {dish.description}
                </CardDescription>

                {/* Ficha informativa breve del platillo */}
                <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
                  {dish.origin && (
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-amber-600 mt-0.5" />
                      <p className="text-gray-700">
                        <span className="font-semibold">Origen:</span> {dish.origin}
                      </p>
                    </div>
                  )}
                  {dish.ingredients && dish.ingredients.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Leaf className="h-4 w-4 text-green-600 mt-0.5" />
                      <p className="text-gray-700">
                        <span className="font-semibold">Ingredientes:</span> {dish.ingredients.slice(0, 4).join(', ')}
                        {dish.ingredients.length > 4 ? '…' : ''}
                      </p>
                    </div>
                  )}
                  {dish.spiceLevel && (
                    <div className="flex items-start gap-2">
                      <Utensils className="h-4 w-4 text-orange-600 mt-0.5" />
                      <p className="text-gray-700">
                        <span className="font-semibold">Picor:</span> {dish.spiceLevel}
                      </p>
                    </div>
                  )}
                  {dish.festival && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-rose-600 mt-0.5" />
                      <p className="text-gray-700">
                        <span className="font-semibold">Temporada/Festividad:</span> {dish.festival}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {highlights.map((item, idx) => (
            <div 
              key={idx}
              className="group bg-gradient-to-br from-white to-orange-50 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-orange-100"
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="bg-gradient-to-br from-orange-100 to-amber-100 p-2 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                </div>
              </div>
              <div className={`text-3xl font-bold mb-2 ${item.color}`}>
                {item.number}
              </div>
              <p className="text-gray-600 font-medium">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Call to action */}
        <div className="text-center mt-20 relative">
        {/* Efecto de resplandor animado detrás del botón */}
        <motion.div
          className="absolute inset-0 flex justify-center"
          animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-64 h-16 bg-gradient-to-r from-orange-400/30 via-amber-300/20 to-orange-400/30 rounded-full blur-3xl"></div>
        </motion.div>

        {/* Botón principal */}
        <motion.a
          href="/section-gastronomia"
          whileHover={{
            scale: 1.08,
            boxShadow: "0 0 25px rgba(255, 140, 0, 0.6)",
          }}
          whileTap={{ scale: 0.95 }}
          className="relative inline-flex items-center gap-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white text-lg font-semibold px-10 py-4 rounded-full shadow-lg transition-all duration-300"
        >
          Explora Nuestra Cocina
          <motion.span
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Cookie className="w-6 h-6" />
          </motion.span>
        </motion.a>
      </div>
      </div>
    </section>
  );
}
