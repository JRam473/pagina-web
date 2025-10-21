// backend/src/services/moderacionService.ts (VERSIÓN SIN PERSPECTIVE)
import { AnalizadorTexto } from '../utils/analizadorTexto';
import { AnalizadorImagen } from '../utils/analizadorImagen';
import { AnalizadorPDF } from '../utils/analizadorPDF';
import { pool } from '../utils/baseDeDatos';
import { ResultadoModeracion, AnalisisTexto, AnalisisImagen, AnalisisPDF } from '../types/moderacion';

export class ModeracionService {
  private analizadorTexto: AnalizadorTexto;
  private analizadorImagen: AnalizadorImagen;
  private analizadorPDF: AnalizadorPDF;

  constructor() {
    this.analizadorTexto = new AnalizadorTexto();
    this.analizadorImagen = new AnalizadorImagen();
    this.analizadorPDF = new AnalizadorPDF();
  }

  /**
   * Moderación en tiempo real para todos los tipos de contenido
   */
  async moderarContenidoEnTiempoReal(data: {
    texto?: string;
    imagenBuffer?: Buffer;
    imagenMimeType?: string;
    pdfBuffer?: Buffer;
    ipUsuario: string;
    hashNavegador: string;
  }): Promise<ResultadoModeracion> {
    
    console.log('🛡️ Iniciando moderación en tiempo real...');

    // Validar y preparar archivos
    const archivosValidos = await this.validarArchivos(data);
    if (!archivosValidos.esValido) {
      return {
        esAprobado: false,
        puntuacionGeneral: 0.1,
        motivoRechazo: archivosValidos.motivo || 'Archivos no válidos', // Asegurar que no sea undefined
        detalles: {
          texto: undefined,
          imagen: undefined,
          pdf: undefined
        }
      };
    }

    // Ejecutar análisis en paralelo
    const resultados = await Promise.allSettled([
      data.texto ? this.analizadorTexto.analizarTexto(data.texto) : Promise.resolve(undefined),
      data.imagenBuffer ? this.analizarImagenCompleta(data.imagenBuffer) : Promise.resolve(undefined),
      data.pdfBuffer ? this.analizadorPDF.analizarPDF(data.pdfBuffer) : Promise.resolve(undefined)
    ]);

    const [textoResult, imagenResult, pdfResult] = resultados;

    const analisisTexto = textoResult.status === 'fulfilled' ? textoResult.value : undefined;
    const analisisImagen = imagenResult.status === 'fulfilled' ? imagenResult.value : undefined;
    const analisisPDF = pdfResult.status === 'fulfilled' ? pdfResult.value : undefined;

    // Evaluar resultado general
    const esAprobado = this.evaluarAprobacionGeneral(analisisTexto, analisisImagen, analisisPDF);
    const motivoRechazo = this.generarMotivoRechazo(analisisTexto, analisisImagen, analisisPDF);
    const puntuacionGeneral = this.calcularPuntuacionGeneral(analisisTexto, analisisImagen, analisisPDF);

    // Log de moderación para contenido rechazado
    if (!esAprobado) {
      await this.registrarLogModeracion({
        tipoContenido: this.determinarTipoContenido(data),
        contenidoTexto: data.texto,
        resultadoModeracion: { analisisTexto, analisisImagen, analisisPDF },
        accion: 'rechazado',
        motivo: motivoRechazo,
        ipUsuario: data.ipUsuario,
        hashNavegador: data.hashNavegador
      });
    }

    console.log(`🎯 Resultado moderación: ${esAprobado ? '✅ APROBADO' : '❌ RECHAZADO'}`);

    // SOLUCIÓN: Crear objeto con tipos explícitos
    const resultado: ResultadoModeracion = {
      esAprobado,
      puntuacionGeneral,
      motivoRechazo: esAprobado ? undefined : motivoRechazo,
      detalles: {
        texto: analisisTexto,
        imagen: analisisImagen,
        pdf: analisisPDF
      }
    };

    return resultado;
  }

  /**
   * Validar archivos antes del análisis
   */
  private async validarArchivos(data: any): Promise<{ esValido: boolean; motivo?: string }> {
    // Validar imagen
    if (data.imagenBuffer) {
      const validadorImagen = new AnalizadorImagen();
      const validacion = await validadorImagen.validarImagen(data.imagenBuffer);
      if (!validacion.esValido) {
        return { esValido: false, motivo: `Imagen: ${validacion.motivo}` };
      }
    }

    // Validar PDF
    if (data.pdfBuffer) {
      if (data.pdfBuffer.length > 20 * 1024 * 1024) { // 20MB
        return { esValido: false, motivo: 'PDF demasiado grande (máximo 20MB)' };
      }

      // Verificar que es un PDF
      const header = data.pdfBuffer.slice(0, 4).toString();
      if (!header.includes('%PDF')) {
        return { esValido: false, motivo: 'Archivo no es un PDF válido' };
      }
    }

    return { esValido: true };
  }

  /**
   * Análisis completo de imagen con validación
   */
  private async analizarImagenCompleta(buffer: Buffer): Promise<AnalisisImagen | undefined> {
    const validador = new AnalizadorImagen();
    const validacion = await validador.validarImagen(buffer);
    
    if (!validacion.esValido) {
      // Crear un objeto AnalisisImagen válido para el error
      return {
        esAprobado: false,
        puntuacion: 0.1,
        contenidoPeligroso: false,
        categorias: [],
        detalles: {
          probabilidadPeligrosa: 0,
          categoriaPeligrosa: null,
          categoriaPrincipal: 'Error',
          error: validacion.motivo
        }
      };
    }

    return await validador.analizarBuffer(buffer);
  }

  private evaluarAprobacionGeneral(
    texto: AnalisisTexto | undefined, 
    imagen: AnalisisImagen | undefined, 
    pdf: AnalisisPDF | undefined
  ): boolean {
    // REGLAS MÁS ESTRICTAS SIN PERSPECTIVE API
    if (texto && !texto.esAprobado) return false;
    if (imagen && !imagen.esAprobado) return false;
    if (pdf && !pdf.esAprobado) return false;
    
    // Sin Perspective API, ser más estricto con el texto
    if (texto && texto.puntuacion < 0.5) return false;
    
    return true;
  }

  private generarMotivoRechazo(
    texto: AnalisisTexto | undefined, 
    imagen: AnalisisImagen | undefined, 
    pdf: AnalisisPDF | undefined
  ): string {
    const motivos: string[] = [];

    if (texto && !texto.esAprobado) {
      motivos.push(`Texto: ${texto.razon}`);
    }
    if (imagen && !imagen.esAprobado) {
      motivos.push(`Imagen: ${imagen.detalles?.categoriaPeligrosa || 'contenido inapropiado'}`);
    }
    if (pdf && !pdf.esAprobado) {
      motivos.push(`PDF: ${pdf.detalles?.errores?.[0] || 'contenido inapropiado'}`);
    }

    return motivos.join('; ') || 'Contenido no aprobado por los filtros automáticos';
  }

  private calcularPuntuacionGeneral(
    texto: AnalisisTexto | undefined, 
    imagen: AnalisisImagen | undefined, 
    pdf: AnalisisPDF | undefined
  ): number {
    const puntuaciones: number[] = [];
    
    if (texto) puntuaciones.push(texto.puntuacion);
    if (imagen) puntuaciones.push(imagen.puntuacion);
    if (pdf) puntuaciones.push(pdf.puntuacion);
    
    // Sin Perspective API, dar más peso al análisis local
    return puntuaciones.length > 0 ? 
      puntuaciones.reduce((a, b) => a + b, 0) / puntuaciones.length : 1.0;
  }

  private determinarTipoContenido(data: any): string {
    if (data.pdfBuffer) return 'pdf';
    if (data.imagenBuffer) return 'imagen';
    if (data.texto) return 'texto';
    return 'mixto';
  }

  private async registrarLogModeracion(log: any): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO logs_moderacion 
         (tipo_contenido, contenido_texto, resultado_moderacion, accion, motivo, ip_usuario, hash_navegador)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          log.tipoContenido,
          log.contenidoTexto?.substring(0, 500),
          JSON.stringify(log.resultadoModeracion),
          log.accion,
          log.motivo,
          log.ipUsuario,
          log.hashNavegador
        ]
      );
    } catch (error) {
      console.error('Error registrando log de moderación:', error);
    }
  }
}