// src/pages/CalendarPage.tsx
import { CalendarSection } from '@/cultura/section/CalendarSection';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { InmersiveCarousel } from '@/cultura/section/InmersiveCarousel';

export function CalendarPage() {
  const breadcrumbItems = [
    { label: "Inicio", path: "/" },
    { label: "Cultura", path: "/cultura" },
    { label: "Calendario Cultural" }, // Actual, sin path
  ];

  
    return (
      <div className="bg-[url('/images/home/cards/file.svg')] bg-cover bg-center min-h-screen py-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumbs arriba */}
          <Breadcrumbs items={breadcrumbItems} />
          {/* Contenido principal */}
          <CalendarSection />
          <InmersiveCarousel />
        </div>
      </div>
    );
  }
