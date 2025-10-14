import { CultureHome } from '@/cultura/CultureHome';
import { CultureSection } from '@/cultura/CultureSection';
import { CultureLanguageSection } from '@/cultura/CultureLanguageSection';
import { CultureGastronomySection } from '@/cultura/CultureGastronomy';
import { CultureDance } from '@/cultura/CultureDance';
import { CultureArtesanias } from '@/cultura/CultureArtesanias';
export function CulturePage() {
  return (
    <>
      <CultureHome />
      <CultureSection />
      <CultureLanguageSection/>
      <CultureArtesanias/>
      <CultureGastronomySection/>
      <CultureDance/>
    </>
  );
} 