// App.tsx
import { Navigation } from './Navigation';
import { Footer } from './Footer';
import './index.css';
import { Outlet, useLocation } from 'react-router-dom';
import ScrollToTop from './ScrollToTop';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from "@/components/ui/toaster"

const pageVariants = {
  initial: { 
    opacity: 0, 
    x: "-100vw"
  },
  in: { 
    opacity: 1, 
    x: 0 
  },
};

const pageTransition = {
  type: "tween" as const,
  ease: "easeInOut" as const,
  duration: 0.6
};

function App() {
  const location = useLocation();

  const pageBackgrounds: Record<string, string> = {
    "/": "bg-gradient-to-b from-green-50 to-white",
    "/turismo": "bg-gradient-to-b from-emerald-50 to-green-100",
    "/cultura": "bg-gradient-to-b from-orange-50 to-yellow-100",
    "/comunidad": "bg-gradient-to-b from-purple-50 to-indigo-100",
    "/galeria": "bg-gradient-to-b from-pink-50 to-rose-100",
    "/contacto": "bg-gradient-to-b from-blue-50 to-indigo-100",
    "/login": "bg-gradient-to-br from-green-50 to-blue-100",
  };

  return (
    <div className={`min-h-screen transition-colors duration-700 ${pageBackgrounds[location.pathname] || "bg-gray-50"}`}>
      <ScrollToTop />
      <Navigation />

      {/* Contenedor principal para las animaciones */}
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={pageTransition}
          style={{ position: 'relative' }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>

      <Footer />
      <Toaster />
    </div>
  );
}

export default App;