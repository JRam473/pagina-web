// backend/src/utils/analizadorImagen.ts
import * as tf from '@tensorflow/tfjs';
import * as nsfwjs from 'nsfwjs';
import sharp from 'sharp';
import { AnalisisImagen } from '../types/moderacion';
import { createCanvas, loadImage } from 'canvas';

export class AnalizadorImagen {
  private modelo: any;
  private modeloCargado: boolean = false;

  async cargarModelo(): Promise<void> {
    if (!this.modeloCargado) {
      try {
        this.modelo = await nsfwjs.load();
        this.modeloCargado = true;
        console.log('✅ Modelo NSFWJS cargado correctamente');
      } catch (error) {
        console.error('❌ Error cargando modelo NSFWJS:', error);
        throw new Error('No se pudo cargar el modelo de análisis de imágenes');
      }
    }
  }

  async analizarBuffer(buffer: Buffer): Promise<AnalisisImagen> {
    await this.cargarModelo();

    try {
      const imagenProcesada = await sharp(buffer)
        .resize(224, 224, { fit: 'cover' })
        .jpeg({ quality: 90 })
        .toBuffer();

      const image = await loadImage(imagenProcesada);
      
      const canvas = createCanvas(224, 224);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, 224, 224);

      const imagenTensor = tf.browser.fromPixels(canvas);
      const predictions = await this.modelo.classify(imagenTensor);
      
      imagenTensor.dispose();

      return this.procesarPredictions(predictions);

    } catch (error) {
      console.error('Error analizando imagen:', error);
      return this.resultadoError(`Error procesando imagen: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async analizarDesdeURL(url: string): Promise<AnalisisImagen> {
    await this.cargarModelo();

    try {
      const fetch = await import('node-fetch');
      const response = await fetch.default(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      return await this.analizarBuffer(buffer);

    } catch (error) {
      console.error('Error analizando imagen desde URL:', error);
      return this.resultadoError(`Error descargando imagen: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private procesarPredictions(predictions: any[]): AnalisisImagen {
    const categoriasPeligrosas = ['Porn', 'Hentai', 'Sexy'];
    
    // Encontrar la categoría con mayor probabilidad
    const categoriaPrincipal = predictions.reduce((prev, current) => 
      (prev.probability > current.probability) ? prev : current
    );

    // Verificar categorías peligrosas
    const categoriaPeligrosa = predictions.find(p => 
      categoriasPeligrosas.includes(p.className)
    );

    const probabilidadPeligrosa = categoriaPeligrosa ? categoriaPeligrosa.probability : 0;
    const contenidoPeligroso = probabilidadPeligrosa > 0.4;

    // Calcular puntuación
    let puntuacion = 1.0;
    if (contenidoPeligroso) {
      puntuacion = Math.max(0.1, 1 - probabilidadPeligrosa);
    } else if (categoriaPrincipal.className === 'Neutral') {
      puntuacion = 0.9;
    } else if (categoriaPrincipal.className === 'Drawing') {
      puntuacion = 0.8;
    }

    return {
      esAprobado: !contenidoPeligroso,
      puntuacion: Math.round(puntuacion * 100) / 100,
      contenidoPeligroso,
      categorias: predictions.map(p => ({
        clase: p.className,
        probabilidad: Math.round(p.probability * 100) / 100
      })),
      detalles: {
        probabilidadPeligrosa: Math.round(probabilidadPeligrosa * 100) / 100,
        categoriaPeligrosa: categoriaPeligrosa?.className || null,
        categoriaPrincipal: categoriaPrincipal.className // SIEMPRE disponible aquí
      }
    };
  }

  private resultadoError(mensaje: string): AnalisisImagen {
    return {
      esAprobado: true,
      puntuacion: 0.5,
      contenidoPeligroso: false,
      categorias: [],
      detalles: {
        probabilidadPeligrosa: 0,
        categoriaPeligrosa: null,
        categoriaPrincipal: 'Error', // Valor por defecto en caso de error
        error: mensaje
      }
    };
  }

  async validarImagen(buffer: Buffer): Promise<{
    esValido: boolean;
    motivo?: string;
    metadata?: any;
  }> {
    try {
      const metadata = await sharp(buffer).metadata();
      
      if (!metadata.width || !metadata.height) {
        return { esValido: false, motivo: 'Dimensiones de imagen inválidas' };
      }

      if (metadata.width < 50 || metadata.height < 50) {
        return { esValido: false, motivo: 'Imagen demasiado pequeña' };
      }

      if (metadata.width > 5000 || metadata.height > 5000) {
        return { esValido: false, motivo: 'Imagen demasiado grande' };
      }

      if (buffer.length > 10 * 1024 * 1024) {
        return { esValido: false, motivo: 'Archivo demasiado pesado' };
      }

      return { 
        esValido: true, 
        metadata: {
          formato: metadata.format,
          ancho: metadata.width,
          alto: metadata.height,
          tamaño: buffer.length
        }
      };

    } catch (error) {
      return { esValido: false, motivo: 'Archivo de imagen corrupto o no soportado' };
    }
  }
}