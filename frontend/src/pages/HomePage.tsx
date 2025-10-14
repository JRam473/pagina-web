import { useRef } from 'react';
import { HeroSection } from '@/home/HeroSection';
import { HeroHighlightsSection } from '@/home/HeroHighlightsSection';
import { VisualCardsSection } from '@/home/VisualCardsSection';

export function HomePage() {
  // 1. Creamos una ref para apuntar a la sección de highlights
  const highlightsRef = useRef<HTMLDivElement>(null);

  // 2. Creamos la función que manejará el scroll
  const handleScrollToHighlights = () => {
    highlightsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* 3. Pasamos la función de scroll como prop a HeroSection */}
      <HeroSection onDiscoverClick={handleScrollToHighlights} />
      
      {/* 4. Adjuntamos la ref al componente HeroHighlightsSection */}
      <HeroHighlightsSection ref={highlightsRef} />
      
      <VisualCardsSection />
    </>
  );
}