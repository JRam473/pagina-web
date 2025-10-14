// TraditionsAnimation.tsx
import { motion, useAnimation } from "framer-motion";
import { type FC, useMemo, useEffect } from "react";

interface TraditionsAnimationProps {
  count?: number;
  particlesPerFirework?: number;
}

const TraditionsAnimation: FC<TraditionsAnimationProps> = ({
  count = 3,
  particlesPerFirework = 50,
}) => {
  const controls = useAnimation();

  const colors = [
    "#FF5733",
    "#FFC300",
    "#DAF7A6",
    "#6495ED",
    "#9B59B6",
    "#FF33A8",
  ];

  const fireworks = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
      originX: Math.random() * 80 + 10,
      originY: Math.random() * 80 + 10,
      particles: Array.from({ length: particlesPerFirework }).map(() => ({
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 4 + 5,
        velocity: Math.random() * 100 + 50,
        angle: Math.random() * 2 * Math.PI,
      })),
    }));
  }, [count, particlesPerFirework]);

  useEffect(() => {
    const animateCycle = async () => {
      while (true) {
        for (let i = 0; i < fireworks.length; i++) {
          const firework = fireworks[i];
          
          // Animar las partículas del fuego artificial
          await controls.start(j => ({
            x: Math.cos(firework.particles[j].angle) * firework.particles[j].velocity,
            y: Math.sin(firework.particles[j].angle) * firework.particles[j].velocity,
            opacity: 0,
            scale: 0.5,
            transition: {
              duration: 1.5,
              ease: "easeOut",
            },
          }));
          
          await new Promise(resolve => setTimeout(resolve, 2000)); // Pausa entre fuegos artificiales
          
          // Reiniciar las partículas a su posición inicial
          controls.set({ x: 0, y: 0, opacity: 2, scale: 1 });
        }
      }
    };
    animateCycle();
  }, [controls, fireworks]);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {fireworks.map((firework, i) => (
        <div
          key={i}
          className="absolute"
          style={{ top: `${firework.originY}%`, left: `${firework.originX}%` }}
        >
          {firework.particles.map((particle, j) => (
            <motion.div
              key={j}
              className="absolute rounded-full"
              style={{
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={controls}
              custom={j}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default TraditionsAnimation;