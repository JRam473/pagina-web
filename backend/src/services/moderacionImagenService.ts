// backend/src/services/moderacionImagenService.ts
import { ModeloClient } from './modeloClient';
import { pool } from '../utils/baseDeDatos';

export class ModeracionImagenService {
  private modeloClient: ModeloClient;

  constructor() {
    this.modeloClient = new ModeloClient();
  }

  async moderarImagen(imagePath: string, ipUsuario: string, hashNavegador: string) {
    console.log(`🖼️ Iniciando moderación optimizada de: ${imagePath}`);
    
    try {
      // Esperar a que el servidor esté listo
      const servidorListo = await this.modeloClient.waitForServerReady(10);
      
      if (!servidorListo) {
        console.warn('⚠️ Servidor de modelos no disponible, usando fallback...');
        return await this.usarMetodoOriginal(imagePath, ipUsuario, hashNavegador);
      }

      const resultado = await this.modeloClient.analizarImagen(imagePath);

      // Registrar log (sin tiempo_procesamiento)
      await this.registrarLogModeracionImagen({
        imagePath,
        ipUsuario,
        hashNavegador,
        resultado,
        esAprobado: resultado.es_apto
      });

      if (!resultado.es_apto) {
        const motivo = this.generarMotivoRechazo(resultado);
        return {
          esAprobado: false,
          motivoRechazo: motivo,
          puntuacionRiesgo: resultado.puntuacion_riesgo,
          detalles: resultado
        };
      }

      return {
        esAprobado: true,
        puntuacionRiesgo: resultado.puntuacion_riesgo,
        detalles: resultado
      };

    } catch (error) {
      console.error('❌ Error en moderación de imagen:', error);
      return await this.usarMetodoOriginal(imagePath, ipUsuario, hashNavegador);
    }
  }

  private async usarMetodoOriginal(imagePath: string, ipUsuario: string, hashNavegador: string) {
    console.log('🔄 Usando método PythonBridge como fallback...');
    const { PythonBridge } = await import('../utils/pythonBridge');
    const bridge = new PythonBridge();
    const resultado = await bridge.esImagenApta(imagePath);

    await this.registrarLogModeracionImagen({
      imagePath,
      ipUsuario,
      hashNavegador,
      resultado: resultado.detalles || null,
      esAprobado: resultado.esApto
    });

    if (!resultado.esApto) {
      return {
        esAprobado: false,
        motivoRechazo: resultado.detalles?.error || 'Contenido inapropiado',
        puntuacionRiesgo: resultado.detalles?.puntuacion_riesgo || 1.0,
        detalles: resultado.detalles
      };
    }

    return {
      esAprobado: true,
      puntuacionRiesgo: resultado.detalles?.puntuacion_riesgo || 0.1,
      detalles: resultado.detalles
    };
  }

  private generarMotivoRechazo(detalles: any): string {
    const motivos: string[] = [];

    if (detalles.analisis_violencia?.es_violento) {
      const prob = Math.round(detalles.analisis_violencia.probabilidad_violencia * 100);
      motivos.push(`Contenido inapropiado (${prob}% confianza)`);
    }

    if (detalles.analisis_armas?.armas_detectadas) {
      const conf = Math.round(detalles.analisis_armas.confianza * 100);
      motivos.push(`Elementos prohibidos (${conf}% confianza)`);
    }

    return motivos.join('; ') || 'La imagen no cumple con las políticas de contenido';
  }

  private async registrarLogModeracionImagen(log: {
    imagePath: string;
    ipUsuario: string;
    hashNavegador: string;
    resultado: any;
    esAprobado: boolean;
  }): Promise<void> {
    try {
      // ✅ CORREGIDO: Sin tiempo_procesamiento
      await pool.query(
        `INSERT INTO logs_moderacion_imagenes 
         (ruta_imagen, ip_usuario, hash_navegador, resultado_analisis, es_aprobado, creado_en)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          log.imagePath,
          log.ipUsuario,
          log.hashNavegador,
          log.resultado ? JSON.stringify(log.resultado) : null,
          log.esAprobado
        ]
      );
      console.log('✅ Log de moderación registrado');
    } catch (error) {
      console.error('❌ Error registrando log de moderación:', error);
    }
  }
}