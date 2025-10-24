// hooks/useModeracionImagen.ts
import { useState, useCallback } from 'react';
import * as nsfwjs from 'nsfwjs';

type ModeloNSFW = 'inception_v3' | 'mobilenet_v2' | 'mobilenet_v2_mid';

export const useModeracionImagen = () => {
  const [modelo, setModelo] = useState<nsfwjs.NSFWJS | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errorModelo, setErrorModelo] = useState<string | null>(null);
  const [modeloCargado, setModeloCargado] = useState<ModeloNSFW | null>(null);

  const inicializarModelo = useCallback(async (tipoModelo: ModeloNSFW = 'mobilenet_v2') => {
    if (modelo || cargando) return;
    setCargando(true);
    setErrorModelo(null);

    try {
      console.log(`🔄 Cargando modelo NSFWJS: ${tipoModelo}...`);

      // Rutas de modelos (usa los JSON, no los min.js)
      const rutasModelos: Record<ModeloNSFW, string> = {
        inception_v3: '/models/inception_v3/model.json',
        mobilenet_v2: '/models/mobilenet_v2/model.json',
        mobilenet_v2_mid: '/models/mobilenet_v2_mid/model.json',
      };

      const rutaModelo = rutasModelos[tipoModelo];
      console.log(`📁 Cargando modelo desde: ${rutaModelo}`);

      // Carga del modelo desde public/
      const modeloCargado = await nsfwjs.load(rutaModelo);
      setModelo(modeloCargado);
      setModeloCargado(tipoModelo);

      console.log(`✅ Modelo NSFWJS ${tipoModelo} cargado correctamente`);
    } catch (error) {
      console.error('❌ Error al cargar modelo NSFWJS:', error);
      setErrorModelo(
        `No se pudo cargar el modelo: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    } finally {
      setCargando(false);
    }
  }, [modelo, cargando]);

  const analizarImagen = useCallback(async (file: File): Promise<{
    esAprobado: boolean;
    puntuacion: number;
    categorias: Array<{clase: string, probabilidad: number}>;
    razon?: string;
  }> => {
    if (!modelo) {
      console.warn('⚠️ Modelo no disponible, aprobando imagen por defecto');
      return {
        esAprobado: true,
        puntuacion: 0.8,
        categorias: [],
        razon: 'Modelo de moderación no disponible'
      };
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

      console.log('🔍 Resultados del análisis:', predicciones);

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

      // Buscar si hay categorías de rechazo en las predicciones
      const categoriaRechazo = predicciones.find(p => 
        categoriasRechazo.includes(p.className) && p.probability > 0.6
      );

      if (categoriaRechazo) {
        puntuacionSeguridad = 1 - categoriaRechazo.probability;
        razonRechazo = `Contenido inapropiado detectado: ${categoriaRechazo.className} (${Math.round(categoriaRechazo.probability * 100)}%)`;
      }

      const esAprobado = !razonRechazo;

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
      console.error('❌ Error analizando imagen:', error);
      return {
        esAprobado: false,
        puntuacion: 0.3,
        categorias: [],
        razon: 'Error técnico al analizar la imagen'
      };
    }
  }, [modelo]);

  // Inicializar automáticamente con MobileNet V2
  const inicializarAutomaticamente = useCallback(() => {
    if (!modelo && !cargando && !errorModelo) {
      console.log('🚀 Inicializando modelo automáticamente...');
      inicializarModelo('mobilenet_v2');
    }
  }, [modelo, cargando, errorModelo, inicializarModelo]);

  return {
    modelo,
    cargando,
    errorModelo,
    modeloCargado,
    inicializarModelo: inicializarAutomaticamente,
    inicializarModeloEspecifico: inicializarModelo,
    analizarImagen
  };
};