import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { Users, Music, Palette, Book, Crown, Sparkles, Heart, Calendar, ArrowDown, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export function CultureSection() {
  const culturalAspects = [
    {
      icon: Music,
      title: "Danzas Tradicionales",
      description: "Expresiones culturales que transmiten la historia, la espiritualidad y la identidad de San Juan Tahitic a través del movimiento y el ritmo.",
      details: ["Coreografías ancestrales", "Vestimenta típica", "Fiestas patronales y rituales"],
      gradient: "from-purple-400 to-pink-500",
      bgColor: "bg-gradient-to-br from-purple-50 to-pink-50",
      scrollTarget: "danzas", // 👈 destino del scroll
    },
    {
      icon: Palette,
      title: "Artesanías Locales",
      description: "Creaciones únicas elaboradas por artesanos locales con técnicas transmitidas de generación en generación.",
      details: ["Textiles tradicionales", "Cerámica artesanal", "Tallado en madera"],
      gradient: "from-amber-400 to-orange-600",
      bgColor: "bg-gradient-to-br from-amber-50 to-orange-50",
      scrollTarget: "section-artesanias-locales", // 👈 destino del scroll
    },
    {
      icon: Book,
      title: "Idioma Náhuatl",
      description: "Conoce el idioma náhuatl: origen, uso actual y expresiones comunes en San Juan Tahitic.",
      details: ["Frases en náhuatl", "Lengua viva", "Identidad cultural"],
      gradient: "from-yellow-400 to-amber-600",
      bgColor: "bg-gradient-to-br from-yellow-50 to-amber-50",
      scrollTarget: "idioma", // 👈 destino del scroll

    },
    {
      icon: Users,
      title: "Gastronomía",
      description: "Explora los sabores tradicionales de San Juan Tahitic: ingredientes locales, platillos típicos y cocina artesanal.",
      details: ["Comida típica", "Ingredientes regionales", "Recetas tradicionales"],
      gradient: "from-rose-400 to-pink-600",
      bgColor: "bg-gradient-to-br from-rose-50 to-pink-50",
      scrollTarget: "gastronomia", // 👈 destino del scroll
    }
  ];

  const culturalStats = [
    { icon: Crown, number: "500+", label: "Años de Historia", color: "text-amber-600" },
    { icon: Palette, number: "20+", label: "Artesanos Locales", color: "text-orange-600" },
    { icon: Calendar, number: "8", label: "Festivales Anuales", color: "text-rose-600" },
    { icon: Heart, number: "100%", label: "Tradición Viva", color: "text-red-600" }
  ];

  const handleSmoothScroll = (targetId: string) => {
    document.getElementById(targetId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <section id="cultura-section" className="py-24 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-20 right-10 w-40 h-40 bg-orange-200/30 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 left-10 w-32 h-32 bg-amber-200/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }}></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-rose-200/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '0.5s' }}></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {culturalAspects.map((aspect, index) => (
            <Card 
              key={index} 
              className="group hover:shadow-culture transition-all duration-500 transform hover:-translate-y-2 border-0 bg-white/90 backdrop-blur-sm overflow-hidden"
            >
              <CardHeader className="flex flex-row items-start space-y-0 pb-4 relative">
                {/* Gradiente de fondo animado */}
                <div className={`absolute inset-0 ${aspect.bgColor} opacity-0 group-hover:opacity-50 transition-opacity duration-500`}></div>
                
                <div className="relative mr-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-200 to-amber-200 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                  <div className={`relative bg-gradient-to-br ${aspect.gradient} p-4 rounded-2xl shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    <aspect.icon className="h-8 w-8 text-white" />
                  </div>
                </div>
                
                <div className="flex-1 relative">
                  <CardTitle className="text-2xl text-gray-900 group-hover:text-orange-700 transition-colors duration-300 mb-3">
                    {aspect.title}
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-base leading-relaxed">
                    {aspect.description}
                  </CardDescription>
                </div>
              </CardHeader>
              
              <CardContent className="relative">
                <div className="space-y-3">
                  {aspect.details.map((detail, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center text-gray-700 group-hover:text-orange-700 transition-colors duration-300"
                    >
                      <div className={`w-3 h-3 bg-gradient-to-r ${aspect.gradient} rounded-full mr-3 shadow-lg group-hover:scale-125 transition-transform duration-300`}></div>
                      <span className="font-medium">{detail}</span>
                    </div>
                  ))}
                </div>
                
                {/* Barra de progreso decorativa */}
                <div className="mt-6 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${aspect.gradient} transform -translate-x-full group-hover:translate-x-0 transition-transform duration-700 shadow-lg`}></div>
                </div>
                {/* 👇 Botón animado de scroll suave */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSmoothScroll(aspect.scrollTarget)}
                  className="mt-6 inline-flex items-center gap-2 bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-full shadow-md hover:bg-orange-600 transition-colors"
                >
                  Explorar más
                  <ArrowDown className="w-5 h-5" />
                </motion.button>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Botón destacado hacia el calendario cultural */}
      <div className="flex justify-center my-16 relative">
        {/* Efecto luminoso de fondo */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-orange-400/30 via-amber-300/20 to-orange-400/30 rounded-full blur-3xl"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Botón principal MEJORADO */}
      <motion.a
        href="/calendario-cultural"
        // Animación del botón al pasar el ratón
        whileHover={{
          scale: 1.08,
          boxShadow: "0px 0px 35px rgba(255,140,0,0.9)", // Sombra más intensa
          backgroundColor: "#ea580c",
        }}
        // Animación al hacer clic/tocar (más rápido y perceptible)
        whileTap={{ scale: 0.95 }}
        className="relative z-10 inline-flex items-center gap-6 bg-orange-600 text-white text-xl font-bold px-12 py-5 rounded-full shadow-2xl transition-all duration-300 overflow-hidden group"
      >
        {/* EFECTO DE BRILLO DESLIZANTE (Añade esta sección) */}
        {/* Este span será el "reflejo" que se desliza */}
        <motion.span
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full bg-white opacity-20 transform -skew-x-12 pointer-events-none"
        />

        {/* Texto y flecha (Asegúrate de que el texto tenga z-index para estar por encima del brillo) */}
        <span className="relative z-20">Descubre nuestras festividades</span>
        
        <motion.span
        className="relative z-20" // Asegura que la flecha también esté por encima
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Asegúrate de usar la clase 'text-2xl' o similar en tu icono si quieres que crezca con el texto. */}
        <Star className="w-7 h-7" />
      </motion.span>
        </motion.a>
      </div>
        {/* Sección de preservación cultural */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 lg:p-16 shadow-culture border border-orange-100 relative overflow-hidden">
          {/* Decoración de fondo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-100/50 to-transparent rounded-full transform translate-x-32 -translate-y-32"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-amber-600/20 rounded-3xl blur-2xl transform -rotate-3"></div>
              <ImageWithFallback
                src="/images/cultura/Comunidad.jpg"
                alt="Artesanías tradicionales de San Juan Tahitic"
                className="relative w-full h-full object-cover rounded-3xl shadow-2xl transform hover:rotate-1 transition-all duration-500"
              />
              
              {/* Overlay decorativo */}
              <div className="absolute inset-0 bg-gradient-to-t from-orange-900/40 to-transparent rounded-3xl"></div>
              
              {/* Badge flotante */}
              <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-xl">
                <span className="text-orange-700 font-semibold text-sm flex items-center">
                  <Crown className="h-4 w-4 mr-1" />
                  Patrimonio
                </span>
              </div>
              
              {/* Efecto de brillo */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rounded-3xl opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            
            <div>
              <div className="inline-flex items-center space-x-2 bg-orange-100 px-4 py-2 rounded-full mb-6">
                <Heart className="h-5 w-5 text-orange-600" />
                <span className="text-orange-800 font-medium">Tradición Viva</span>
              </div>
              
              <h3 className="text-4xl font-bold text-gray-900 mb-6">
                Preservando Nuestras{' '}
                <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  Raíces
                </span>
              </h3>
              <p className="text-gray-700 mb-8 text-lg leading-relaxed">
                Trabajamos activamente en la preservación y promoción de nuestro patrimonio cultural. 
                A través de talleres, festivales y programas educativos, mantenemos vivas las tradiciones 
                que nos definen como comunidad.
              </p>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                {culturalStats.map((stat, index) => (
                  <div 
                    key={index}
                    className="group bg-gradient-to-br from-white to-orange-50 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-orange-100"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="bg-gradient-to-br from-orange-100 to-amber-100 p-2 rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                    </div>
                    <div className={`text-3xl font-bold mb-2 ${stat.color}`}>
                      {stat.number}
                    </div>
                    <div className="text-gray-600 font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
              
              {/* Lista de logros */}
              <div className="space-y-4">
                {[
                  "Talleres de artesanía tradicional",
                  "Festival anual de cultura local",
                  "Programa de mentores artesanos",
                  "Archivo digital de tradiciones orales"
                ].map((achievement, index) => (
                  <div key={index} className="flex items-center group">
                    <div className="w-3 h-3 bg-gradient-to-r from-orange-400 to-amber-500 rounded-full mr-4 group-hover:scale-150 transition-transform duration-300 shadow-lg"></div>
                    <span className="text-gray-700 group-hover:text-orange-700 font-medium transition-colors duration-300">{achievement}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}