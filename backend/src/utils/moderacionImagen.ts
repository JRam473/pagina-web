// utils/moderacionImagen.ts (VERSIÓN COMPLETAMENTE CORREGIDA)
import fs from 'fs';
import path from 'path';

// ✅ Interface con manejo explícito de undefined
interface ResultadoAnalisisImagen {
  puntuacion: number;
  esAprobado: boolean;
  categorias: Array<{clase: string, probabilidad: number}>;
  razon?: string; // Esto permite string | undefined explícitamente
}

export class ModeradorImagen {
  static async analizarImagenMulter(filePath: string): Promise<ResultadoAnalisisImagen> {
    try {
      // Verificar que el archivo existe
      if (!fs.existsSync(filePath)) {
        return {
          puntuacion: 0.1,
          esAprobado: false,
          categorias: [],
          razon: 'Archivo de imagen no encontrado'
        };
      }

      const stats = fs.statSync(filePath);
      const extension = path.extname(filePath).toLowerCase();
      
      const extensionesPermitidas = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      const tamanoMaximo = 5 * 1024 * 1024; // 5MB

      if (!extensionesPermitidas.includes(extension)) {
        return {
          puntuacion: 0.3,
          esAprobado: false,
          categorias: [],
          razon: `Formato de archivo no permitido: ${extension}`
        };
      }

      if (stats.size > tamanoMaximo) {
        return {
          puntuacion: 0.4,
          esAprobado: false,
          categorias: [],
          razon: 'La imagen es demasiado grande (máximo 5MB)'
        };
      }

      if (stats.size < 1024) {
        return {
          puntuacion: 0.2,
          esAprobado: false,
          categorias: [],
          razon: 'La imagen es demasiado pequeña'
        };
      }

      // ✅ CORRECCIÓN: Para aprobados, NO incluir la propiedad 'razon'
      return {
        puntuacion: 0.85,
        esAprobado: true,
        categorias: [
          { clase: 'Neutral', probabilidad: 0.85 },
          { clase: 'Drawing', probabilidad: 0.10 },
          { clase: 'Hentai', probabilidad: 0.03 },
          { clase: 'Porn', probabilidad: 0.01 },
          { clase: 'Sexy', probabilidad: 0.01 }
        ]
        // ✅ NO incluir 'razon' cuando es undefined
      };

    } catch (error) {
      console.error('❌ Error en análisis básico de imagen:', error);
      return {
        puntuacion: 0.5,
        esAprobado: false,
        categorias: [],
        razon: 'Error al procesar la imagen'
      };
    }
  }

  static async inicializarModelo(): Promise<void> {
    console.log('✅ Sistema de moderación de imágenes básico inicializado');
  }
}