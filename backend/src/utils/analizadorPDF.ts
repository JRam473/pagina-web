// backend/src/utils/analizadorPDF.ts
import { ExtraccionPDF } from './extraccionPDF';
import { AnalizadorTexto } from './analizadorTexto';
import { AnalizadorImagen } from './analizadorImagen';
import { AnalisisPDF, AnalisisTexto } from '../types/moderacion';

export class AnalizadorPDF {
  private extraccionPDF: ExtraccionPDF;
  private analizadorTexto: AnalizadorTexto;
  private analizadorImagen: AnalizadorImagen;

  constructor() {
    this.extraccionPDF = new ExtraccionPDF();
    this.analizadorTexto = new AnalizadorTexto();
    this.analizadorImagen = new AnalizadorImagen();
  }

  async analizarPDF(buffer: Buffer): Promise<AnalisisPDF> {
    console.log('📄 Iniciando análisis completo de PDF...');
    
    try {
      // 1. Obtener información básica del PDF
      const infoPDF = await this.extraccionPDF.obtenerInfoPDF(buffer);
      console.log(`📊 Info PDF: ${infoPDF.paginas} páginas, ${infoPDF.tamaño} bytes`);

      // 2. Extraer y analizar texto
      let analisisTexto: AnalisisTexto | undefined;
      let textoExtraido = '';
      
      try {
        const extraccionTexto = await this.extraccionPDF.extraerTexto(buffer);
        textoExtraido = extraccionTexto.texto;
        analisisTexto = this.analizadorTexto.analizarTexto(textoExtraido);
        console.log(`📖 Texto extraído: ${textoExtraido.length} caracteres`);
      } catch (error) {
        console.warn('⚠️ No se pudo extraer texto del PDF:', error);
        // Crear objeto AnalisisTexto válido sin propiedades extra
        analisisTexto = {
          esAprobado: false,
          puntuacion: 0.3,
          palabrasOfensivas: ['No se pudo extraer texto'],
          razon: 'PDF posiblemente escaneado o protegido',
          detalles: { 
            metodo: 'pdf-texto-no-extraible',
            intencion: 'error',
            calidadTexto: { tieneSentido: false, porcentajePalabrasValidas: 0, razon: 'Texto no extraíble' },
            longitud: 0,
            tienePatronesSpam: false
          }
        };
      }

      // 3. Extraer y analizar imágenes
      let imagenesAnalizadas = 0;
      let imagenesPeligrosas = 0;
      const errores: string[] = [];

      try {
        const imagenes = await this.extraccionPDF.extraerImagenes(buffer);
        console.log(`🖼️ Imágenes encontradas en PDF: ${imagenes.length}`);

        // Analizar cada imagen
        for (const imagenBuffer of imagenes) {
          try {
            const analisisImagen = await this.analizadorImagen.analizarBuffer(imagenBuffer);
            imagenesAnalizadas++;
            
            if (!analisisImagen.esAprobado) {
              imagenesPeligrosas++;
              console.log(`🚨 Imagen peligrosa detectada en PDF: ${analisisImagen.detalles.categoriaPeligrosa}`);
            }
          } catch (error) {
            errores.push(`Error analizando imagen ${imagenesAnalizadas + 1}`);
          }
        }

        // Si no se pudieron extraer imágenes, convertir primera página
        if (imagenes.length === 0 && infoPDF.paginas > 0) {
          console.log('🔄 Convirtiendo primera página a imagen para análisis...');
          try {
            const paginaImagen = await this.extraccionPDF.convertirPaginaAImagen(buffer, 1);
            const analisisImagen = await this.analizadorImagen.analizarBuffer(paginaImagen);
            imagenesAnalizadas++;
            
            if (!analisisImagen.esAprobado) {
              imagenesPeligrosas++;
            }
          } catch (error) {
            console.warn('No se pudo convertir página a imagen:', error);
          }
        }

      } catch (error) {
        console.warn('⚠️ Error en análisis de imágenes PDF:', error);
        errores.push('Error procesando imágenes del PDF');
      }

      // 4. Calcular puntuación general
      const puntuacionTexto = analisisTexto?.puntuacion || 0.3;
      const puntuacionGeneral = this.calcularPuntuacionGeneral(
        puntuacionTexto,
        imagenesAnalizadas,
        imagenesPeligrosas,
        infoPDF.esEscaneado
      );

      // 5. Determinar si está aprobado
      const textoAprobado = analisisTexto?.esAprobado || false;
      const esAprobado = this.evaluarAprobacionPDF(
        textoAprobado,
        imagenesPeligrosas,
        puntuacionGeneral
      );

      const resultado: AnalisisPDF = {
        esAprobado,
        puntuacion: puntuacionGeneral,
        textoExtraido: textoExtraido.substring(0, 2000), // Limitar para logs
        imagenesAnalizadas,
        imagenesPeligrosas,
        paginas: infoPDF.paginas,
        detalles: {
          analisisTexto,
          errores: errores.length > 0 ? errores : undefined,
          tieneImagenes: imagenesAnalizadas > 0
        }
      };

      console.log(`📄 Resultado análisis PDF: ${esAprobado ? '✅ APROBADO' : '❌ RECHAZADO'}`);
      console.log(`   Puntuación: ${puntuacionGeneral}, Imágenes: ${imagenesAnalizadas}/${imagenesPeligrosas} peligrosas`);

      return resultado;

    } catch (error) {
      console.error('❌ Error crítico analizando PDF:', error);
      return this.resultadoError(`Error procesando PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private calcularPuntuacionGeneral(
    puntuacionTexto: number,
    imagenesAnalizadas: number,
    imagenesPeligrosas: number,
    esEscaneado: boolean
  ): number {
    let puntuacion = puntuacionTexto;

    // Penalizar por imágenes peligrosas
    if (imagenesAnalizadas > 0) {
      const ratioPeligro = imagenesPeligrosas / imagenesAnalizadas;
      puntuacion -= ratioPeligro * 0.5;
    }

    // Penalizar PDFs escaneados (menos confiables)
    if (esEscaneado) {
      puntuacion -= 0.2;
    }

    return Math.max(0.1, Math.min(1.0, puntuacion));
  }

  private evaluarAprobacionPDF(
    textoAprobado: boolean,
    imagenesPeligrosas: number,
    puntuacionGeneral: number
  ): boolean {
    // REGLA 1: Texto ofensivo = RECHAZADO
    if (!textoAprobado) {
      return false;
    }

    // REGLA 2: Imágenes peligrosas = RECHAZADO
    if (imagenesPeligrosas > 0) {
      return false;
    }

    // REGLA 3: Puntuación muy baja = RECHAZADO
    if (puntuacionGeneral < 0.4) {
      return false;
    }

    return true;
  }

  private resultadoError(mensaje: string): AnalisisPDF {
    return {
      esAprobado: false,
      puntuacion: 0.1,
      textoExtraido: '',
      imagenesAnalizadas: 0,
      imagenesPeligrosas: 0,
      paginas: 0,
      detalles: {
        errores: [mensaje],
        tieneImagenes: false
      }
    };
  }
}