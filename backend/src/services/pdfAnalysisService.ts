// services/pdfAnalysisService.ts
import fs from 'fs';
import { ModeracionService } from './moderacionService';

// ✅ SOLUCIÓN: Usar require para evitar problemas de tipos
const pdfParse = require('pdf-parse');

export class PdfAnalysisService {
  private moderacionService: ModeracionService;

  constructor() {
    this.moderacionService = new ModeracionService();
  }

  /**
   * Extraer texto del PDF usando pdf-parse (CORREGIDO)
   */
  private async extraerTextoPDF(rutaArchivo: string): Promise<{
    texto: string;
    numPaginas: number;
    info: any;
    metadata: any;
  }> {
    try {
      const dataBuffer = fs.readFileSync(rutaArchivo);
      
      // ✅ Usar directamente con require
      const data = await pdfParse(dataBuffer);
      
      return {
        texto: data.text || '',
        numPaginas: data.numpages || 0,
        info: data.info || {},
        metadata: data.metadata || {}
      };
    } catch (error) {
      console.error('❌ Error extrayendo texto PDF:', error);
      throw new Error(`No se pudo extraer texto del PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Analizar texto de PDF para moderación
   */
  async analizarTextoPDF(rutaArchivo: string, ipUsuario: string, hashNavegador: string) {
    try {
      console.log('📄 Iniciando análisis de texto PDF:', {
        rutaArchivo,
        ipUsuario,
        hash: hashNavegador.substring(0, 10) + '...'
      });

      // 1. Extraer texto del PDF
      const datosPDF = await this.extraerTextoPDF(rutaArchivo);
      
      console.log('✅ Texto extraído del PDF:', {
        numPaginas: datosPDF.numPaginas,
        tamanoTexto: datosPDF.texto.length,
        primerosCaracteres: datosPDF.texto.substring(0, 100) + '...'
      });

      // 2. Validar que tenga texto legible
      if (!datosPDF.texto || datosPDF.texto.trim().length < 10) {
        return {
          esAprobado: false,
          motivo: 'El PDF no contiene texto legible o está vacío',
          metadata: {
            numPaginas: datosPDF.numPaginas,
            tamanoTexto: datosPDF.texto?.length || 0,
            tieneTexto: false
          }
        };
      }

      // 3. Limitar texto para análisis (por rendimiento)
      const textoParaAnalizar = this.limitarTexto(datosPDF.texto, 10000);
      
      console.log('🔍 Enviando texto para moderación:', {
        tamanoOriginal: datosPDF.texto.length,
        tamanoAnalisis: textoParaAnalizar.length,
        fragmento: textoParaAnalizar.substring(0, 150) + '...'
      });

      // 4. Moderar el texto extraído
      const resultadoModeracion = await this.moderacionService.moderarTexto(
        textoParaAnalizar,
        ipUsuario,
        hashNavegador
      );

      console.log('📊 Resultado moderación PDF:', {
        esAprobado: resultadoModeracion.esAprobado,
        motivo: resultadoModeracion.motivoRechazo,
        puntuacion: resultadoModeracion.puntuacionGeneral
      });

      return {
        esAprobado: resultadoModeracion.esAprobado,
        motivo: resultadoModeracion.motivoRechazo,
        puntuacion: resultadoModeracion.puntuacionGeneral,
        detalles: resultadoModeracion.detalles,
        metadata: {
          numPaginas: datosPDF.numPaginas,
          tamanoTextoOriginal: datosPDF.texto.length,
          tamanoTextoAnalizado: textoParaAnalizar.length,
          tieneTexto: true,
          info: datosPDF.info
        }
      };

    } catch (error) {
      console.error('❌ Error analizando PDF:', error);
      
      // Si falla la extracción, rechazar por seguridad
      return {
        esAprobado: false,
        motivo: 'No se pudo analizar el contenido del PDF',
        metadata: {
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      };
    }
  }





  /**
   * Limitar tamaño del texto para análisis (optimización)
   */
  private limitarTexto(texto: string, maxCaracteres: number): string {
    if (texto.length <= maxCaracteres) {
      return texto;
    }
    
    console.log(`📝 Limitando texto de ${texto.length} a ${maxCaracteres} caracteres`);
    
    // Tomar inicio y fin del texto para mejor contexto
    const mitad = Math.floor(maxCaracteres / 2);
    const inicio = texto.substring(0, mitad);
    const fin = texto.substring(texto.length - mitad);
    
    return inicio + '\n\n...[texto recortado por optimización]...\n\n' + fin;
  }

  /**
   * Validación rápida de PDF (CORREGIDO)
   */
  async validarPDFBasico(rutaArchivo: string): Promise<{
    valido: boolean;
    error?: string;
    tamano?: number;
    esPDF?: boolean;
  }> {
    try {
      const stats = fs.statSync(rutaArchivo);
      
      // Validar tamaño máximo (10MB)
      if (stats.size > 10 * 1024 * 1024) {
        return {
          valido: false,
          error: 'El PDF es demasiado grande (máximo 10MB)',
          tamano: stats.size
        };
      }

      // ✅ CORREGIDO: Leer solo los primeros bytes para validar
      const buffer = Buffer.alloc(4);
      const fd = fs.openSync(rutaArchivo, 'r');
      fs.readSync(fd, buffer, 0, 4, 0);
      fs.closeSync(fd);
      
      const esPDF = buffer.toString().startsWith('%PDF');
      
      if (!esPDF) {
        return {
          valido: false,
          error: 'El archivo no es un PDF válido',
          esPDF: false
        };
      }

      return {
        valido: true,
        tamano: stats.size,
        esPDF: true
      };

    } catch (error) {
      return {
        valido: false,
        error: 'No se pudo validar el archivo PDF'
      };
    }
  }
}