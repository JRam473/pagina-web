// controladores/experienciaController.ts - VERSIÓN SOLO ANÁLISIS DE TEXTO
import { pool } from '../utils/baseDeDatos';
import { generarHashNavegador } from '../utils/hashNavegador';
import { ModeracionService } from '../services/moderacionService';
import { Request, Response } from 'express';

export const experienciaController = {
  /**
   * Crear experiencia con moderación SOLO DE TEXTO - SOLO ALMACENA APROBADAS
   */
  async crearExperiencia(req: Request, res: Response) {
    try {
      const file = req.file;
      const { descripcion, lugar_id } = req.body;

      // ✅ VERIFICAR QUE LOS DATOS LLEGUEN CORRECTAMENTE
      console.log('📦 Datos recibidos:', {
        tieneArchivo: !!file,
        descripcion: descripcion ? `"${descripcion.substring(0, 50)}..."` : 'undefined',
        lugar_id: lugar_id || 'undefined'
      });

      // Validaciones básicas
      if (!file || !descripcion?.trim()) {
        return res.status(400).json({ 
          success: false,
          error: 'Imagen y descripción son requeridos' 
        });
      }

      // Validar longitud de descripción
      if (descripcion.trim().length > 500) {
        return res.status(400).json({
          success: false,
          error: 'La descripción no puede exceder los 500 caracteres'
        });
      }

      const hashNavegador = generarHashNavegador(req);
      const ipUsuario = req.ip || req.connection.remoteAddress || 'unknown';

      console.log('📱 Nueva experiencia desde:', {
        hashNavegador: hashNavegador.substring(0, 10) + '...',
        ip: ipUsuario
      });

      // ✅ MODIFICADO: Moderación SOLO DE TEXTO antes de guardar en BD
      const moderacionService = new ModeracionService();
      const resultadoModeracion = await moderacionService.moderarContenidoEnTiempoReal({
        texto: descripcion,
        ipUsuario,
        hashNavegador
      });

      // ✅ SI ES RECHAZADO: Responder inmediatamente con motivo específico - NO GUARDAR EN BD
      if (!resultadoModeracion.esAprobado) {
        console.log('❌ Contenido rechazado por moderación:', resultadoModeracion.motivoRechazo);
        
        const { mensajeUsuario, tipoProblema, detallesEspecificos } = this.analizarMotivoRechazo(resultadoModeracion);
        
        return res.status(400).json({
          success: false,
          error: 'CONTENIDO_RECHAZADO',
          message: mensajeUsuario,
          motivo: resultadoModeracion.motivoRechazo,
          tipo: tipoProblema,
          detalles: {
            puntuacion: resultadoModeracion.puntuacionGeneral,
            problemas: detallesEspecificos,
            sugerencias: this.generarSugerencias(tipoProblema),
            timestamp: new Date().toISOString()
          }
        });
      }

      // ✅ SI ES APROBADO: Verificar límites de usuario
      const limitesResult = await pool.query(
        `SELECT COUNT(*) as count 
         FROM experiencias 
         WHERE (hash_navegador = $1 OR ip_usuario = $2)
         AND creado_en >= CURRENT_DATE`,
        [hashNavegador, ipUsuario]
      );

      const experienciasHoy = parseInt(limitesResult.rows[0].count);
      const limiteDiario = 5;

      if (experienciasHoy >= limiteDiario) {
        return res.status(429).json({ 
          success: false,
          error: `Límite diario alcanzado: máximo ${limiteDiario} experiencias por día`,
          detalles: `Has subido ${experienciasHoy} experiencias hoy`
        });
      }

      // Construir URLs de imagen
      const imageUrl = `/uploads/images/experiencias/${file.filename}`;
      const fullImageUrl = `${process.env.BASE_URL || 'http://localhost:4000'}${imageUrl}`;

      // ✅ Insertar experiencia APROBADA directamente (sin campo estado)
      const result = await pool.query(
        `INSERT INTO experiencias (
          lugar_id, url_foto, descripcion, ruta_almacenamiento,
          tamaño_archivo, tipo_archivo,
          ip_usuario, hash_navegador
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *`,
        [
          lugar_id || null,
          fullImageUrl,
          descripcion.trim(),
          file.path,
          file.size,
          file.mimetype,
          ipUsuario,
          hashNavegador
        ]
      );

      const experiencia = result.rows[0];

      console.log('✅ Experiencia creada y publicada:', experiencia.id);

      // Respuesta al usuario
      res.status(201).json({
        success: true,
        mensaje: 'Experiencia creada y publicada exitosamente.',
        experiencia: {
          id: experiencia.id,
          url_foto: experiencia.url_foto,
          descripcion: experiencia.descripcion,
          creado_en: experiencia.creado_en,
          limite_restante: limiteDiario - experienciasHoy - 1
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Error creando experiencia:', errorMessage);
      res.status(500).json({ 
        success: false,
        error: 'Error al crear experiencia' 
      });
    }
  },

  /**
   * Editar experiencia con moderación SOLO DE TEXTO
   */
  async editarExperiencia(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { descripcion } = req.body;

      const hashNavegador = generarHashNavegador(req);

      // Verificar que la experiencia existe y pertenece al usuario
      const experienciaActual = await pool.query(
        'SELECT * FROM experiencias WHERE id = $1 AND hash_navegador = $2',
        [id, hashNavegador]
      );

      if (experienciaActual.rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Experiencia no encontrada o no tienes permisos para editarla' 
        });
      }

      const actual = experienciaActual.rows[0];

      // ✅ MODIFICADO: Moderación SOLO DE TEXTO de la nueva descripción
      if (descripcion !== undefined && descripcion !== actual.descripcion) {
        const moderacionService = new ModeracionService();
        const resultadoModeracion = await moderacionService.moderarContenidoEnTiempoReal({
          texto: descripcion,
          ipUsuario: actual.ip_usuario,
          hashNavegador
        });

        // ✅ SI ES RECHAZADO: Responder inmediatamente con motivo específico
        if (!resultadoModeracion.esAprobado) {
          const { mensajeUsuario, tipoProblema, detallesEspecificos } = this.analizarMotivoRechazo(resultadoModeracion);
          
          return res.status(400).json({
            success: false,
            error: 'CONTENIDO_RECHAZADO',
            message: mensajeUsuario,
            motivo: resultadoModeracion.motivoRechazo,
            tipo: tipoProblema,
            detalles: {
              puntuacion: resultadoModeracion.puntuacionGeneral,
              problemas: detallesEspecificos,
              sugerencias: this.generarSugerencias(tipoProblema)
            }
          });
        }
      }

      // Actualizar experiencia
      const result = await pool.query(
        `UPDATE experiencias 
         SET descripcion = $1, 
             actualizado_en = NOW()
         WHERE id = $2 AND hash_navegador = $3 
         RETURNING *`,
        [
          descripcion !== undefined ? descripcion : actual.descripcion,
          id,
          hashNavegador
        ]
      );

      res.json({
        success: true,
        mensaje: 'Experiencia actualizada exitosamente.',
        experiencia: result.rows[0]
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error editando experiencia:', errorMessage);
      res.status(500).json({ 
        success: false,
        error: 'Error al editar experiencia' 
      });
    }
  },

  /**
   * Eliminar experiencia - SIN CAMBIOS
   */
  async eliminarExperiencia(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const hashNavegador = generarHashNavegador(req);

      const result = await pool.query(
        'DELETE FROM experiencias WHERE id = $1 AND hash_navegador = $2 RETURNING *',
        [id, hashNavegador]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Experiencia no encontrada o no tienes permisos para eliminarla' 
        });
      }

      res.json({ 
        success: true,
        mensaje: 'Experiencia eliminada exitosamente',
        experiencia: result.rows[0]
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error eliminando experiencia:', errorMessage);
      res.status(500).json({ 
        success: false,
        error: 'Error al eliminar experiencia' 
      });
    }
  },

  /**
   * Obtener experiencias del usuario actual - SIN CAMBIOS
   */
  async obtenerMisExperiencias(req: Request, res: Response) {
    try {
      const hashNavegador = generarHashNavegador(req);
      const ipUsuario = req.ip || 'unknown';

      console.log('🔍 Obteniendo experiencias para:', {
        hash: hashNavegador.substring(0, 10) + '...',
        ip: ipUsuario
      });

      const result = await pool.query(
        `SELECT e.*, l.nombre as lugar_nombre, l.ubicacion as lugar_ubicacion
         FROM experiencias e
         LEFT JOIN lugares l ON e.lugar_id = l.id
         WHERE e.hash_navegador = $1 OR e.ip_usuario = $2
         ORDER BY e.creado_en DESC`,
        [hashNavegador, ipUsuario]
      );

      console.log(`📊 Encontradas ${result.rows.length} experiencias para el usuario`);

      res.json({
        success: true,
        experiencias: result.rows,
        total: result.rows.length
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error obteniendo mis experiencias:', errorMessage);
      res.status(500).json({ 
        success: false,
        error: 'Error al obtener experiencias' 
      });
    }
  },

  /**
   * Obtener todas las experiencias (público) - TODAS SON APROBADAS - SIN CAMBIOS
   */
  async obtenerExperiencias(req: Request, res: Response) {
    try {
      const { pagina = 1, limite = 20 } = req.query;
      const offset = (Number(pagina) - 1) * Number(limite);

      const result = await pool.query(
        `SELECT e.*, l.nombre as lugar_nombre, l.ubicacion as lugar_ubicacion
         FROM experiencias e
         LEFT JOIN lugares l ON e.lugar_id = l.id
         ORDER BY e.creado_en DESC
         LIMIT $1 OFFSET $2`,
        [limite, offset]
      );

      const countResult = await pool.query('SELECT COUNT(*) FROM experiencias');

      res.json({
        success: true,
        experiencias: result.rows,
        total: parseInt(countResult.rows[0].count),
        pagina: Number(pagina),
        totalPaginas: Math.ceil(parseInt(countResult.rows[0].count) / Number(limite))
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error obteniendo experiencias:', errorMessage);
      res.status(500).json({ 
        success: false,
        error: 'Error al obtener experiencias' 
      });
    }
  },

  /**
   * Obtener experiencia por ID (público) - SIN CAMBIOS
   */
  async obtenerExperienciaPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT e.*, l.nombre as lugar_nombre, l.ubicacion as lugar_ubicacion
         FROM experiencias e
         LEFT JOIN lugares l ON e.lugar_id = l.id
         WHERE e.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Experiencia no encontrada' 
        });
      }

      // Incrementar contador de vistas
      await pool.query(
        'UPDATE experiencias SET contador_vistas = contador_vistas + 1 WHERE id = $1',
        [id]
      );

      res.json({ 
        success: true,
        experiencia: result.rows[0] 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error obteniendo experiencia:', errorMessage);
      res.status(500).json({ 
        success: false,
        error: 'Error al obtener experiencia' 
      });
    }
  },

  /**
   * Registrar vista de experiencia - CON CONTROL DE UNICIDAD MEJORADO - SIN CAMBIOS
   */
  async registrarVista(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const ipUsuario = req.ip || req.connection.remoteAddress || 'unknown';
      const agenteUsuario = req.get('User-Agent') || '';
      const hashNavegador = generarHashNavegador(req);

      console.log('👀 Registrando vista para experiencia:', { 
        id, 
        ip: ipUsuario,
        hash: hashNavegador.substring(0, 10) + '...'
      });

      // Verificar que la experiencia existe
      const expResult = await pool.query(
        'SELECT id FROM experiencias WHERE id = $1',
        [id]
      );

      if (expResult.rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Experiencia no encontrada' 
        });
      }

      // ✅ NUEVO: Verificar si ya existe una vista desde esta combinación IP/Hash en las últimas 24 horas
      const vistaExistente = await pool.query(
        `SELECT id FROM vistas_experiencias 
         WHERE experiencia_id = $1 
         AND (
           (ip_usuario = $2 AND agente_usuario = $3) 
           OR hash_navegador = $4
         )
         AND visto_en >= NOW() - INTERVAL '24 hours'
         LIMIT 1`,
        [id, ipUsuario, agenteUsuario, hashNavegador]
      );

      if (vistaExistente.rows.length === 0) {
        // Insertar nueva vista
        await pool.query(
          `INSERT INTO vistas_experiencias 
           (experiencia_id, ip_usuario, agente_usuario, hash_navegador) 
           VALUES ($1, $2, $3, $4)`,
          [id, ipUsuario, agenteUsuario, hashNavegador]
        );

        // Actualizar contador en la tabla experiencias
        await pool.query(
          'UPDATE experiencias SET contador_vistas = contador_vistas + 1 WHERE id = $1',
          [id]
        );

        console.log('✅ Nueva vista registrada para experiencia:', id);
        
        res.json({ 
          success: true,
          mensaje: 'Vista registrada exitosamente',
          experiencia_id: id,
          tipo: 'nueva_vista'
        });
      } else {
        console.log('⏭️ Vista duplicada ignorada para experiencia:', id);
        
        res.json({ 
          success: true,
          mensaje: 'Vista ya registrada anteriormente',
          experiencia_id: id,
          tipo: 'vista_duplicada'
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Error registrando vista:', errorMessage);
      res.status(500).json({ 
        success: false,
        error: 'Error al registrar vista' 
      });
    }
  },

  /**
   * Obtener estadísticas generales (admin only) - SIN CAMBIOS
   */
  async obtenerEstadisticas(req: Request, res: Response) {
    try {
      // Estadísticas básicas
      const totalResult = await pool.query('SELECT COUNT(*) FROM experiencias');
      const vistasResult = await pool.query('SELECT SUM(contador_vistas) FROM experiencias');
      
      // Experiencias por día (últimos 7 días)
      const tendenciasResult = await pool.query(`
        SELECT 
          DATE(creado_en) as fecha,
          COUNT(*) as cantidad
        FROM experiencias 
        WHERE creado_en >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(creado_en)
        ORDER BY fecha DESC
      `);

      // Top experiencias más vistas
      const topVistasResult = await pool.query(`
        SELECT id, descripcion, contador_vistas as vistas
        FROM experiencias 
        ORDER BY contador_vistas DESC 
        LIMIT 10
      `);

      // Estadísticas de uso por usuario (basado en hash_navegador)
      const usuariosResult = await pool.query(`
        SELECT 
          COUNT(DISTINCT hash_navegador) as usuarios_unicos,
          COUNT(*) as total_experiencias,
          AVG(contador_vistas) as promedio_vistas_por_experiencia
        FROM experiencias
      `);

      res.json({
        success: true,
        estadisticas: {
          total_experiencias: parseInt(totalResult.rows[0].count),
          total_vistas: parseInt(vistasResult.rows[0].sum || '0'),
          usuarios_unicos: parseInt(usuariosResult.rows[0].usuarios_unicos),
          total_experiencias_subidas: parseInt(usuariosResult.rows[0].total_experiencias),
          promedio_vistas_por_experiencia: parseFloat(usuariosResult.rows[0].promedio_vistas_por_experiencia || '0')
        },
        tendencias: tendenciasResult.rows,
        top_vistas: topVistasResult.rows
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error obteniendo estadísticas:', errorMessage);
      res.status(500).json({ 
        success: false,
        error: 'Error al obtener estadísticas' 
      });
    }
  },

  /**
   * Obtener estadísticas de vistas únicas - SIN CAMBIOS
   */
  async obtenerEstadisticasVistasUnicas(req: Request, res: Response) {
    try {
      const { experiencia_id } = req.params;
      
      const result = await pool.query(`
        SELECT 
          COUNT(DISTINCT ip_usuario) as vistas_unicas_ip,
          COUNT(DISTINCT hash_navegador) as vistas_unicas_hash,
          COUNT(*) as vistas_totales
        FROM vistas_experiencias 
        WHERE experiencia_id = $1
        AND visto_en >= NOW() - INTERVAL '30 days'
      `, [experiencia_id]);

      res.json({
        success: true,
        estadisticas: result.rows[0]
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error obteniendo estadísticas de vistas:', errorMessage);
      res.status(500).json({ 
        success: false,
        error: 'Error al obtener estadísticas' 
      });
    }
  },

  // 🔒 MÉTODOS PRIVADOS - Actualizados para solo texto

  /**
   * Analizar motivo de rechazo para mensajes específicos al usuario (SOLO TEXTO)
   */
  analizarMotivoRechazo(resultadoModeracion: any): { 
    mensajeUsuario: string; 
    tipoProblema: string; 
    detallesEspecificos: string[] 
  } {
    const detallesEspecificos: string[] = [];
    let mensajeUsuario = 'El contenido no cumple con nuestras políticas';
    let tipoProblema = 'general';

    // ✅ MODIFICADO: Solo analizar problemas de texto
    if (resultadoModeracion.detalles?.texto && !resultadoModeracion.detalles.texto.esAprobado) {
      tipoProblema = 'texto';
      const texto = resultadoModeracion.detalles.texto;
      
      if (texto.razon.includes('ofensivo')) {
        mensajeUsuario = 'El texto contiene lenguaje ofensivo o inapropiado';
        detallesEspecificos.push('Se detectaron palabras ofensivas');
        if (texto.palabrasOfensivas.length > 0) {
          detallesEspecificos.push(`Palabras problemáticas: ${texto.palabrasOfensivas.slice(0, 3).join(', ')}`);
        }
      } else if (texto.razon.includes('spam')) {
        mensajeUsuario = 'El texto contiene contenido comercial no permitido';
        detallesEspecificos.push('Se detectó contenido promocional o spam');
      } else if (texto.razon.includes('sin sentido')) {
        mensajeUsuario = 'El texto no tiene sentido o es muy corto';
        detallesEspecificos.push('El texto debe ser coherente y tener al menos algunas palabras con sentido');
      } else if (texto.razon.includes('URL') || texto.razon.includes('email') || texto.razon.includes('teléfono')) {
        mensajeUsuario = 'El texto contiene enlaces o información de contacto';
        detallesEspecificos.push('No se permiten URLs, emails o números de teléfono');
      }
    }

    return { mensajeUsuario, tipoProblema, detallesEspecificos };
  },

  /**
   * Generar sugerencias según el tipo de problema (SOLO TEXTO)
   */
  generarSugerencias(tipoProblema: string): string[] {
    const sugerencias: string[] = [];
    
    // ✅ MODIFICADO: Solo sugerencias para texto
    if (tipoProblema === 'texto') {
      sugerencias.push('Evita lenguaje ofensivo, insultos o palabras vulgares');
      sugerencias.push('No incluyas contenido comercial, promociones o spam');
      sugerencias.push('Asegúrate de que el texto sea coherente y tenga sentido');
      sugerencias.push('No incluyas enlaces, emails o números de teléfono');
      sugerencias.push('Usa un lenguaje respetuoso y apropiado para la comunidad');
    } else {
      sugerencias.push('Revisa el contenido antes de publicarlo');
      sugerencias.push('Asegúrate de que cumpla con las políticas de la comunidad');
    }
    
    return sugerencias;
  }
};