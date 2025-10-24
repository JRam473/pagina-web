// backend/src/services/moderacionService.ts - VERSIÓN CORREGIDA
import { AnalizadorTexto } from '../utils/analizadorTexto';
import { pool } from '../utils/baseDeDatos';
import { ResultadoModeracion, AnalisisTexto } from '../types/moderacion';

export class ModeracionService {
  private analizadorTexto: AnalizadorTexto;

  constructor() {
    this.analizadorTexto = new AnalizadorTexto();
  }

  /**
   * Moderación en tiempo real solo para texto
   */
  async moderarContenidoEnTiempoReal(data: {
    texto?: string;
    ipUsuario: string;
    hashNavegador: string;
  }): Promise<ResultadoModeracion> {
    
    console.log('🛡️ Iniciando moderación en tiempo real (solo texto)...');

    // Solo analizar texto
    let analisisTexto: AnalisisTexto | undefined;

    if (data.texto) {
      analisisTexto = this.analizadorTexto.analizarTexto(data.texto);
    }

    // Evaluar resultado general
    const esAprobado = this.evaluarAprobacionGeneral(analisisTexto);
    const motivoRechazo = this.generarMotivoRechazo(analisisTexto);
    const puntuacionGeneral = this.calcularPuntuacionGeneral(analisisTexto);

    // Log de moderación para contenido rechazado
    if (!esAprobado) {
      await this.registrarLogModeracion({
        tipoConttenido: 'texto',
        contenidoTexto: data.texto,
        resultadoModeracion: { analisisTexto },
        accion: 'rechazado',
        motivo: motivoRechazo,
        ipUsuario: data.ipUsuario,
        hashNavegador: data.hashNavegador
      });
    }

    console.log(`🎯 Resultado moderación: ${esAprobado ? '✅ APROBADO' : '❌ RECHAZADO'}`);

    // ✅ CORREGIDO: Crear objeto con detalles opcionales
    const resultado: ResultadoModeracion = {
      esAprobado,
      puntuacionGeneral,
      motivoRechazo: esAprobado ? undefined : motivoRechazo,
      detalles: {
        texto: analisisTexto || undefined // ✅ Asegurar que sea undefined si no existe
      }
    };

    return resultado;
  }

  private evaluarAprobacionGeneral(texto: AnalisisTexto | undefined): boolean {
    // ✅ REGLAS PARA TEXTO SOLAMENTE

    // 1. Cualquier contenido de texto no aprobado = RECHAZADO
    if (texto && !texto.esAprobado) {
      console.log('❌ Rechazado: Texto no aprobado');
      return false;
    }

    // 2. Puntuaciones bajas en texto = RECHAZADO
    if (texto && texto.puntuacion < 0.7) {
      console.log('❌ Rechazado: Puntuación de texto muy baja');
      return false;
    }

    console.log('✅ Aprobado: Texto cumple las reglas');
    return true;
  }

  private generarMotivoRechazo(texto: AnalisisTexto | undefined): string {
    const motivos: string[] = [];

    if (texto && !texto.esAprobado) {
      motivos.push(`Texto: ${texto.razon}`);
    }

    return motivos.join('; ') || 'Contenido no aprobado por los filtros automáticos';
  }

  private calcularPuntuacionGeneral(texto: AnalisisTexto | undefined): number {
    return texto ? texto.puntuacion : 1.0;
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

  /**
   * Método específico para moderar solo texto
   */
  async moderarTexto(texto: string, ipUsuario: string, hashNavegador: string): Promise<ResultadoModeracion> {
    return this.moderarContenidoEnTiempoReal({
      texto,
      ipUsuario,
      hashNavegador
    });
  }
}