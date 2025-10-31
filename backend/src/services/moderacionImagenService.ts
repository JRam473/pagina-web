import { PythonBridge, AnalisisImagenResultado } from '../utils/pythonBridge';
import { pool } from '../utils/baseDeDatos';

export interface ResultadoModeracionImagen {
  esAprobado: boolean;
  motivoRechazo?: string;
  puntuacionRiesgo: number;
  detalles?: AnalisisImagenResultado;
}

export class ModeracionImagenService {
  private pythonBridge: PythonBridge;

  constructor() {
    this.pythonBridge = new PythonBridge();
  }

  async moderarImagen(imagePath: string, ipUsuario: string, hashNavegador: string): Promise<ResultadoModeracionImagen> {
    try {
      console.log(`🖼️ Iniciando moderación de imagen: ${imagePath}`);
      
      const resultado = await this.pythonBridge.esImagenApta(imagePath);
      
      // Registrar log de moderación
      await this.registrarLogModeracionImagen({
        imagePath,
        ipUsuario,
        hashNavegador,
        resultado: resultado.detalles || null,
        esAprobado: resultado.esApto
      });

      // ✅ CASO 1: Imagen rechazada con detalles
      if (!resultado.esApto && resultado.detalles) {
        const motivo = this.generarMotivoRechazo(resultado.detalles);
        return {
          esAprobado: false,
          motivoRechazo: motivo,
          puntuacionRiesgo: resultado.detalles.puntuacion_riesgo,
          detalles: resultado.detalles
        };
      }

      // ✅ CASO 2: Imagen rechazada sin detalles
      if (!resultado.esApto) {
        return {
          esAprobado: false,
          motivoRechazo: 'Error en el análisis de la imagen',
          puntuacionRiesgo: 1.0
        };
      }

      // ✅ CASO 3: Imagen aprobada con detalles
      if (resultado.detalles) {
        return {
          esAprobado: true,
          puntuacionRiesgo: resultado.detalles.puntuacion_riesgo,
          detalles: resultado.detalles
        };
      }

      // ✅ CASO 4: Imagen aprobada sin detalles (fallback)
      return {
        esAprobado: true,
        puntuacionRiesgo: 0.1,
      };

    } catch (error) {
      console.error('❌ Error en moderación de imagen:', error);
      
      await this.registrarLogModeracionImagen({
        imagePath,
        ipUsuario,
        hashNavegador,
        resultado: null,
        esAprobado: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });

      // ✅ CASO 5: Error en el proceso
      return {
        esAprobado: false,
        motivoRechazo: 'Error técnico en el análisis de la imagen',
        puntuacionRiesgo: 1.0
      };
    }
  }

  private generarMotivoRechazo(detalles: AnalisisImagenResultado): string {
    const motivos: string[] = [];

    // ✅ MEJORADO: Mostrar sugerencias más específicas
    if (detalles.analisis_violencia?.es_violento) {
      const prob = Math.round(detalles.analisis_violencia.probabilidad_violencia * 100);
      motivos.push(`Contenido inapropiado detectado (${prob}% de confianza)`);
    }

    if (detalles.analisis_armas?.armas_detectadas) {
      const conf = Math.round(detalles.analisis_armas.confianza * 100);
      motivos.push(`Elementos prohibidos detectados (${conf}% de confianza)`);
    }

    // ✅ NUEVO: Manejar errores de análisis
    if (detalles.analisis_violencia?.error) {
      motivos.push(`Problema técnico: ${detalles.analisis_violencia.error}`);
    }

    if (detalles.analisis_armas?.error) {
      motivos.push(`Problema técnico: ${detalles.analisis_armas.error}`);
    }

    if (detalles.error) {
      motivos.push(`Error del sistema: ${detalles.error}`);
    }

    return motivos.join('; ') || 'La imagen no cumple con las políticas de contenido';
  }

  private async registrarLogModeracionImagen(log: {
    imagePath: string;
    ipUsuario: string;
    hashNavegador: string;
    resultado: AnalisisImagenResultado | null;
    esAprobado: boolean;
    error?: string;
  }): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO logs_moderacion_imagenes 
         (ruta_imagen, ip_usuario, hash_navegador, resultado_analisis, es_aprobado, error, creado_en)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          log.imagePath,
          log.ipUsuario,
          log.hashNavegador,
          log.resultado ? JSON.stringify(log.resultado) : null,
          log.esAprobado,
          log.error || null
        ]
      );
      console.log('✅ Log de moderación de imagen registrado');
    } catch (error) {
      console.error('❌ Error registrando log de moderación de imagen:', error);
    }
  }
}