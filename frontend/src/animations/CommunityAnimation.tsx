// CommunityAnimation.tsx
import { motion, useAnimation } from "framer-motion";
import { type FC, useMemo, useEffect } from "react";

interface CommunityAnimationProps {
  count?: number;
}

const CommunityAnimation: FC<CommunityAnimationProps> = ({ count = 10 }) => {
  const controls = useAnimation();

  const points = useMemo(() => {
    const colors = ["#8B5CF6", "#6366F1", "#3B82F6", "#0EA5E9", "#06B6D4", "#14B8A6"];
    return Array.from({ length: count }).map(() => ({
      // Aumentamos los valores iniciales para que comiencen más dispersos
      initialX: Math.random() * 400 - 200, 
      initialY: Math.random() * 400 - 200,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 2,
      // Aumentamos el tamaño de los puntos
      size: Math.random() * 10 + 8,
    }));
  }, [count]);

  useEffect(() => {
    const animateCycle = async () => {
      while (true) {
        // Fase de unión
        await controls.start(i => ({
          x: 0,
          y: 0,
          opacity: 1,
          scale: 1,
          transition: {
            duration: 2.5, // Duración un poco más larga para un efecto más elegante
            ease: "easeInOut",
            delay: points[i].delay,
          },
        }));

        await new Promise(resolve => setTimeout(resolve, 1500)); 

        // Fase de explosión
        await controls.start(i => ({
          // Usamos `vw` y `vh` para que salgan de la pantalla
          x: `${Math.random() * 200 - 100}vw`,
          y: `${Math.random() * 200 - 100}vh`,
          opacity: 0,
          // Hacemos que la escala sea mucho mayor
          scale: Math.random() * 4 + 2, 
          transition: {
            duration: 2, // Aumentamos la duración de la explosión
            ease: "easeOut",
            delay: points[i].delay,
          },
        }));
      }
    };

    animateCycle();
  }, [controls, points]);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden">
      {points.map((point, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            x: point.initialX,
            y: point.initialY,
            width: point.size,
            height: point.size,
            backgroundColor: point.color,
            opacity: 0,
            scale: 0,
          }}
          animate={controls}
          custom={i}
        />
      ))}
    </div>
  );
};

export default CommunityAnimation;