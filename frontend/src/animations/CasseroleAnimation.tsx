// CasseroleAnimation.tsx
import { motion } from "framer-motion";
import { type FC, useMemo } from "react";

interface CasseroleAnimationProps {
  count?: number; // Cantidad de nubes de humo
}

const CasseroleAnimation: FC<CasseroleAnimationProps> = ({ count = 5 }) => {
  const smokeClouds = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
      size: Math.random() * 80 + 100,
      left: Math.random() * 80 + 10,
      delay: Math.random() * 3,
      duration: Math.random() * 6 + 10,
    }));
  }, [count]);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex flex-col justify-end items-center">
      {/* 1. Nubes de humo animadas */}
      {smokeClouds.map((smoke, i) => (
        <motion.div
          key={i}
          className="absolute z-0"
          style={{
            left: `${smoke.left}%`,
            width: `${smoke.size}px`,
            height: `${smoke.size}px`,
          }}
          initial={{
            opacity: 0,
            y: "100%", // Inicia desde abajo
            scale: 0.5,
          }}
          animate={{
            opacity: [0.3, 0.4, 0.5, 0.4, 0.2, 0], // El humo se hace visible y luego se desvanece
            y: "-200%", // Sube mucho más para desaparecer completamente
            scale: [0.5, 0.8, 1, 1.2, 1.5],
          }}
          transition={{
            repeat: Infinity,
            repeatType: "loop",
            ease: "linear",
            duration: smoke.duration,
            delay: smoke.delay,
          }}
        >
          {/* Forma del humo - un círculo semi-transparente */}
          <div className="w-full h-full bg-white/25 rounded-full blur-md opacity-75" />
        </motion.div>
      ))}
      
      {/* 2. Cazuela SVG estática en la parte inferior */}
      <motion.div
        className="relative z-10 w-40 h-20 mb-8" // Ajusta el tamaño de la cazuela aquí
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
        style={{
          maskImage: "url('/images/home/casserole-shape.svg')",
          maskRepeat: "no-repeat",
          maskSize: "contain",
          maskPosition: "center",
          WebkitMaskImage: "url('/images/home/casserole-shape.svg')",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
          WebkitMaskPosition: "center",
        }}
      >
        <div className="w-full h-full bg-gray-500" />
      </motion.div>
    </div>
  );
};

export default CasseroleAnimation;