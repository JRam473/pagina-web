// services/moderacionService.ts (VERSIÓN COMPLETAMENTE CORREGIDA)
import { pool } from '../utils/baseDeDatos';
import { ModeradorTexto } from '../utils/moderacionTexto';
import { ModeradorImagen } from '../utils/moderacionImagen';

interface ResultadoModeracion {
  estado: 'aprobado' | 'rechazado' | 'pendiente';
  motivo?: string;
  puntuacionGeneral: number;
}


export class ModeracionService {
  static async moderarExperiencia(experienciaId: string): Promise<ResultadoModeracion> {
    try {
      console.log(`🔍 Iniciando moderación para experiencia: ${experienciaId}`);
      
      const expResult = await pool.query(
        `SELECT * FROM experiencias WHERE id = $1`,
        [experienciaId]
      );

      if (expResult.rows.length === 0) {
        throw new Error(`Experiencia ${experienciaId} no encontrada`);
      }

      const experiencia = expResult.rows[0];
      console.log(`📝 Experiencia encontrada: "${experiencia.descripcion?.substring(0, 50)}..."`);

      if (experiencia.moderado) {
        console.log(`✅ Experiencia ya moderada, estado: ${experiencia.estado}`);
        return {
          estado: experiencia.estado as 'aprobado' | 'rechazado' | 'pendiente',
          puntuacionGeneral: (experiencia.puntuacion_texto + experiencia.puntuacion_imagen) / 2,
          motivo: experiencia.motivo_rechazo
        };
      }

      // 1. Moderación de texto (MEJORADA)
      console.log('📖 Analizando texto...');
      const resultadoTexto = ModeradorTexto.analizarTexto(experiencia.descripcion || '');
      console.log(`📖 Resultado texto: ${resultadoTexto.puntuacion} - Intención: ${resultadoTexto.intencion}`);

      // 2. Moderación de imagen
      console.log('🖼️ Analizando imagen...');
      const resultadoImagen = await ModeradorImagen.analizarImagenMulter(experiencia.ruta_almacenamiento);
      console.log(`🖼️ Resultado imagen: ${resultadoImagen.puntuacion} - Aprobado: ${resultadoImagen.esAprobado}`);

      // 3. Calcular confianza del usuario (MÁS GENEROSO)
      console.log('👤 Calculando confianza usuario...');
      const confianzaUsuario = await this.calcularConfianzaUsuario(experiencia.hash_navegador);
      console.log(`👤 Confianza usuario: ${confianzaUsuario}`);

      // 4. Calcular puntuación general (PESOS ACTUALIZADOS)
      let puntuacionGeneral = 0;
      try {
        // ✅ NUEVOS PESOS - Texto menos determinante
        puntuacionGeneral = (
          resultadoTexto.puntuacion * 0.3 +      // Texto menos importante
          resultadoImagen.puntuacion * 0.6 +     // Imagen más importante  
          confianzaUsuario * 0.1                // Confianza mínima
        );
        
        if (isNaN(puntuacionGeneral) || !isFinite(puntuacionGeneral)) {
          puntuacionGeneral = resultadoImagen.puntuacion; // Priorizar imagen
        }
      } catch (error) {
        console.error('❌ Error calculando puntuación general:', error);
        puntuacionGeneral = resultadoImagen.puntuacion; // Fallback a imagen
      }

      const puntuacionFinal = Math.round(puntuacionGeneral * 100) / 100;
      console.log(`📊 Puntuación general: ${puntuacionFinal}`);

      // 5. ✅ NUEVA LÓGICA DE DECISIÓN MÁS INTELIGENTE
      let estado: 'aprobado' | 'rechazado' | 'pendiente' = 'pendiente';
      let motivo: string = this.generarMotivoRechazo(resultadoTexto, resultadoImagen);

      const umbralAprobacion = 0.60;  // ✅ MUCHO MÁS BAJO
      const umbralRechazo = 0.30;     // ✅ SOLO RECHAZAR CONTENIDO MUY MALO

      console.log(`⚖️ Umbrales: Aprobación=${umbralAprobacion}, Rechazo=${umbralRechazo}`);

      // ✅ REGLA 1: Imagen aprobada + texto no spam = APROBADO
      if (resultadoImagen.esAprobado && resultadoTexto.intencion !== 'spam') {
        estado = 'aprobado';
        console.log('🎉 EXPERIENCIA APROBADA - Imagen buena + texto no spam');
      }
      // ✅ REGLA 2: Puntuación alta = APROBADO
      else if (puntuacionFinal >= umbralAprobacion) {
        estado = 'aprobado';
        console.log('🎉 EXPERIENCIA APROBADA - Puntuación general alta');
      }
      // ✅ REGLA 3: Spam claro = RECHAZADO
     if (resultadoTexto.intencion === 'spam' || !resultadoTexto.esAprobado) {
  estado = 'rechazado';
  motivo = resultadoTexto.razon || 'Contenido ofensivo detectado';
  console.log(`❌ EXPERIENCIA RECHAZADA: Texto ofensivo - ${motivo}`);
}
      // ✅ REGLA 4: Imagen rechazada = RECHAZADO
      else if (!resultadoImagen.esAprobado) {
        estado = 'rechazado';
        motivo = resultadoImagen.razon || 'La imagen no cumple con los criterios de calidad';
        console.log(`❌ EXPERIENCIA RECHAZADA: Imagen inapropiada`);
      }
      // ✅ REGLA 5: Puntuación muy baja = RECHAZADO
      else if (puntuacionFinal <= umbralRechazo) {
        estado = 'rechazado';
        motivo = 'No cumple con los criterios mínimos de calidad';
        console.log(`❌ EXPERIENCIA RECHAZADA: Puntuación muy baja`);
      }
      // ✅ REGLA 6: Todo lo demás = APROBADO (ser más permisivos)
      else {
        estado = 'aprobado';
        console.log('🎉 EXPERIENCIA APROBADA - Regla permisiva aplicada');
      }

      // 6. Actualizar experiencia en BD
      console.log('💾 Guardando resultado en BD...');
      await pool.query(
        `UPDATE experiencias SET
          estado = $1,
          moderado = $2,
          puntuacion_texto = $3,
          puntuacion_imagen = $4,
          palabras_prohibidas_encontradas = $5,
          categorias_imagen = $6,
          confianza_usuario = $7,
          aprobado_automatico = $8,
          motivo_rechazo = $9,
          procesado_en = NOW(),
          actualizado_en = NOW()
        WHERE id = $10`,
        [
          estado,
          true,
          resultadoTexto.puntuacion,
          resultadoImagen.puntuacion,
          resultadoTexto.palabrasProhibidas,
          JSON.stringify(resultadoImagen.categorias),
          confianzaUsuario,
          estado !== 'rechazado',
          motivo,
          experienciaId
        ]
      );

      console.log(`✅ Experiencia ${experienciaId} moderada: ${estado} (Puntuación: ${puntuacionFinal})`);

      return {
        estado,
        puntuacionGeneral: puntuacionFinal,
        motivo
      };

    } catch (error) {
      console.error(`❌ Error moderando experiencia ${experienciaId}:`, error);
      
      // ✅ EN CASO DE ERROR, SER MÁS PERMISIVOS
      await pool.query(
        `UPDATE experiencias SET 
          estado = 'aprobado', 
          moderado = true,
          aprobado_automatico = false,
          motivo_rechazo = 'Aprobado por fallo en moderación automática',
          procesado_en = NOW(), 
          actualizado_en = NOW() 
         WHERE id = $1`,
        [experienciaId]
      );

      return {
        estado: 'aprobado',
        puntuacionGeneral: 0.7,
        motivo: 'Aprobado por fallo en moderación automática'
      };
    }
  }

  

  private static async calcularConfianzaUsuario(hashNavegador: string): Promise<number> {
    try {
      const result = await pool.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE estado = 'aprobado') as aprobadas,
          COUNT(*) FILTER (WHERE estado = 'rechazado') as rechazadas
         FROM experiencias 
         WHERE hash_navegador = $1 AND moderado = true`,
        [hashNavegador]
      );

      const { total, aprobadas, rechazadas } = result.rows[0];
      
      // ✅ CONVERSIÓN SEGURA A NÚMEROS
      const totalNum = parseInt(total) || 0;
      const aprobadasNum = parseInt(aprobadas) || 0;
      const rechazadasNum = parseInt(rechazadas) || 0;

      console.log(`👤 Historial usuario: total=${totalNum}, aprobadas=${aprobadasNum}, rechazadas=${rechazadasNum}`);

      // ✅ USUARIO NUEVO: CONFIANZA MÁXIMA
      if (totalNum === 0) {
        console.log('✅ Usuario nuevo - Confianza inicial: 1.0');
        return 1.0;
      }

      // ✅ CÁLCULO MÁS JUSTO PARA USUARIOS EXISTENTES
      const ratioAprobacion = aprobadasNum / totalNum;
      
      // Confianza basada principalmente en aprobaciones
      let confianza = ratioAprobacion;
      
      // Penalización MUY SUAVE por rechazos
      if (rechazadasNum > 0) {
        const ratioRechazo = rechazadasNum / totalNum;
        confianza = confianza * (1 - (ratioRechazo * 0.2)); // Solo 20% de penalización
      }
      
      // ✅ BONUS POR BUEN COMPORTAMIENTO (más generoso)
      if (aprobadasNum >= 2) confianza = Math.min(1.0, confianza + 0.3);
      if (aprobadasNum >= 5) confianza = Math.min(1.0, confianza + 0.2);
      
      // ✅ MÍNIMO MÁS ALTO - Nunca menos de 0.5
      confianza = Math.max(0.5, Math.min(1.0, confianza));
      
      // ✅ VALIDACIÓN FINAL CONTRA NaN
      if (isNaN(confianza) || !isFinite(confianza)) {
        console.warn('⚠️ Confianza inválida, usando valor por defecto: 0.8');
        return 0.8;
      }
      
      const confianzaFinal = Math.round(confianza * 100) / 100;
      console.log(`✅ Confianza final calculada: ${confianzaFinal}`);
      
      return confianzaFinal;
    } catch (error) {
      console.error('❌ Error calculando confianza:', error);
      return 0.8; // Valor seguro y generoso por defecto
    }
  }

  private static generarMotivoRechazo(texto: any, imagen: any): string {
    const motivos: string[] = [];

    if (!texto.esAprobado && texto.razon) {
      motivos.push(texto.razon);
    }

    if (!imagen.esAprobado && 'razon' in imagen && imagen.razon) {
      motivos.push(imagen.razon);
    }

    // Si no hay motivos específicos, dar uno genérico
    if (motivos.length === 0) {
      return 'No cumple con los criterios de calidad automáticos';
    }

    return motivos.join('; ');
  }

  static async procesarPendientes(): Promise<{ procesadas: number; aprobadas: number }> {
    try {
      const result = await pool.query(
        `SELECT id FROM experiencias 
         WHERE moderado = false 
         AND estado = 'pendiente'
         AND creado_en < NOW() - INTERVAL '5 minutes'
         ORDER BY creado_en ASC
         LIMIT 10` // Reducir límite para debugging
      );

      console.log(`🔄 Encontradas ${result.rows.length} experiencias pendientes por moderar`);

      let aprobadas = 0;
      for (const row of result.rows) {
        try {
          const resultado = await this.moderarExperiencia(row.id);
          if (resultado.estado === 'aprobado') {
            aprobadas++;
          }
        } catch (error) {
          console.error(`Error procesando experiencia ${row.id}:`, error);
        }
      }

      console.log(`📊 Moderación completada: ${result.rows.length} procesadas, ${aprobadas} aprobadas`);
      return { procesadas: result.rows.length, aprobadas };
    } catch (error) {
      console.error('Error en procesarPendientes:', error);
      return { procesadas: 0, aprobadas: 0 };
    }
  }
}