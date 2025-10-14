// hooks/useModeracionImagen.ts (FRONTEND)
import { useState, useCallback } from 'react';
import * as nsfwjs from 'nsfwjs';

export const useModeracionImagen = () => {
  const [modelo, setModelo] = useState<nsfwjs.NSFWJS | null>(null);
  const [cargando, setCargando] = useState(false);

  const inicializarModelo = useCallback(async () => {
    if (modelo) return;
    
    setCargando(true);
    try {
      console.log('🔄 Cargando modelo NSFWJS en frontend...');
      
      // ✅ Esto SÍ funciona en el frontend
      const modeloCargado = await nsfwjs.load(
        'https://tfhub.dev/tensorflow/tfjs-model/nsfwjs/3/default/1', 
        { size: 299 }
      );
      
      setModelo(modeloCargado);
      console.log('✅ Modelo NSFWJS cargado en frontend');
    } catch (error) {
      console.error('❌ Error cargando modelo en frontend:', error);
    } finally {
      setCargando(false);
    }
  }, [modelo]);

  const analizarImagen = useCallback(async (file: File): Promise<{
    esAprobado: boolean;
    puntuacion: number;
    categorias: Array<{clase: string, probabilidad: number}>;
    razon?: string;
  }> => {
    if (!modelo) {
      throw new Error('Modelo no inicializado');
    }

    try {
      // Crear elemento imagen
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      
      // Cargar imagen desde File
      const imageUrl = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Clasificar imagen
      const predicciones = await modelo.classify(img);
      
      // Limpiar URL
      URL.revokeObjectURL(imageUrl);

      // Lógica de moderación
      const categoriasRechazo = ['Porn', 'Hentai', 'Sexy'];
      const categoriaPrincipal = predicciones[0];
      
      if (!categoriaPrincipal) {
        return {
          esAprobado: true,
          puntuacion: 0.8,
          categorias: [],
          razon: 'No se pudo analizar la imagen'
        };
      }

      let puntuacionSeguridad = 1.0;
      let razonRechazo: string | undefined;

      if (categoriasRechazo.includes(categoriaPrincipal.className)) {
        puntuacionSeguridad = 1 - categoriaPrincipal.probability;
        if (categoriaPrincipal.probability > 0.6) {
          razonRechazo = `Contenido inapropiado detectado: ${categoriaPrincipal.className}`;
        }
      }

      const esAprobado = puntuacionSeguridad >= 0.8 && !razonRechazo;

      return {
        esAprobado,
        puntuacion: Math.round(puntuacionSeguridad * 100) / 100,
        categorias: predicciones.map(p => ({
          clase: p.className,
          probabilidad: Math.round(p.probability * 100) / 100
        })),
        razon: razonRechazo
      };

    } catch (error) {
      console.error('❌ Error analizando imagen en frontend:', error);
      return {
        esAprobado: false,
        puntuacion: 0.3,
        categorias: [],
        razon: 'Error al analizar la imagen'
      };
    }
  }, [modelo]);

  return {
    modelo,
    cargando,
    inicializarModelo,
    analizarImagen
  };
};