// hooks/useCategories.ts
import { useState, useMemo } from 'react';

export const useCategories = () => {
  const CATEGORIES = useMemo(() => [
    'Naturaleza',
    'Cultura',
    'Cascada',
    'Mirador',
    'Puente',
    'Playa',
    'Historia',
    'Gastronomía',
    'Aventura',
    'Religioso',
    'Arquitectura'
  ], []);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const getCategoryColor = (category: string | null) => {
    if (!category) return 'bg-gray-500';

    const categoryLower = category.toLowerCase();

    if (categoryLower.includes('naturaleza') || categoryLower.includes('nature')) 
      return 'bg-green-600';
    if (categoryLower.includes('cultura') || categoryLower.includes('culture')) 
      return 'bg-yellow-500';
    if (categoryLower.includes('cascada') || categoryLower.includes('waterfall')) 
      return 'bg-sky-500';
    if (categoryLower.includes('historia') || categoryLower.includes('history')) 
      return 'bg-purple-600';
    if (categoryLower.includes('puente') || categoryLower.includes('bridge')) 
      return 'bg-red-600';
    if (categoryLower.includes('mirador') || categoryLower.includes('viewpoint')) 
      return 'bg-rose-500';
    if (categoryLower.includes('ruta') || categoryLower.includes('trail') || categoryLower.includes('path')) 
      return 'bg-emerald-500';
    if (categoryLower.includes('montaña') || categoryLower.includes('mountain')) 
      return 'bg-indigo-700';
    if (categoryLower.includes('rio') || categoryLower.includes('río') || categoryLower.includes('river')) 
      return 'bg-cyan-600';
    return 'bg-gray-400';
  };

  return {
    categories: CATEGORIES,
    selectedCategory,
    setSelectedCategory,
    getCategoryColor
  };
};