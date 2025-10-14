// controladores/experienciaController.ts
import { pool } from '../utils/baseDeDatos';
import { generarHashNavegador } from '../utils/hashNavegador';
import { ModeracionService } from '../services/moderacionService';
import { Request, Response } from 'express';

export const experienciaController = {
  /**
   * Crear experiencia con moderación automática
   */
  async crearExperiencia(req: Request, res: Response) {
    try {
      const file = req.file;
      const { descripcion, lugar_id } = req.body;

      // Validaciones básicas
      if (!file || !descripcion?.trim()) {
        return res.status(400).json({ 
          error: 'Imagen y descripción son requeridos' 
        });
      }

      // Validar longitud de descripción
      if (descripcion.trim().length > 500) {
        return res.status(400).json({
          error: 'La descripción no puede exceder los 500 caracteres'
        });
      }

      const hashNavegador = generarHashNavegador(req);
      const ipUsuario = req.ip || req.connection.remoteAddress;

      console.log('📱 Nueva experiencia desde:', {
        hashNavegador: hashNavegador.substring(0, 10) + '...',
        ip: ipUsuario
      });

      // Verificar límites de usuario por IP y hash
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
          error: `Límite diario alcanzado: máximo ${limiteDiario} experiencias por día`,
          detalles: `Has subido ${experienciasHoy} experiencias hoy`
        });
      }

      // Construir URLs de imagen
      const imageUrl = `/uploads/images/experiencias/${file.filename}`;
      const fullImageUrl = `${process.env.BASE_URL || 'http://localhost:4000'}${imageUrl}`;

      // Insertar experiencia con información del usuario
      const result = await pool.query(
        `INSERT INTO experiencias (
          lugar_id, url_foto, descripcion, ruta_almacenamiento,
          tamaño_archivo, tipo_archivo,
          ip_usuario, hash_navegador, estado
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING *`,
        [
          lugar_id || null,
          fullImageUrl,
          descripcion.trim(),
          file.path,
          file.size,
          file.mimetype,
          ipUsuario,
          hashNavegador,
          'pendiente'
        ]
      );

      const experiencia = result.rows[0];

      // Iniciar moderación automática en segundo plano
      ModeracionService.moderarExperiencia(experiencia.id)
        .then(resultado => {
          console.log(`🎯 Moderación automática completada para ${experiencia.id}: ${resultado.estado}`);
        })
        .catch(error => {
          console.error(`❌ Error en moderación automática para ${experiencia.id}:`, error);
        });

      // Respuesta inmediata al usuario
      res.status(201).json({
        mensaje: 'Experiencia creada exitosamente. Está siendo procesada para publicación.',
        experiencia: {
          id: experiencia.id,
          estado: 'procesando',
          limite_restante: limiteDiario - experienciasHoy - 1
        }
      });

    } catch (error) {
      console.error('❌ Error creando experiencia:', error);
      res.status(500).json({ error: 'Error al crear experiencia' });
    }
  },

  /**
   * Editar experiencia
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
          error: 'Experiencia no encontrada o no tienes permisos para editarla' 
        });
      }

      const actual = experienciaActual.rows[0];

      // Actualizar solo la descripción
      const result = await pool.query(
        `UPDATE experiencias 
         SET descripcion = $1, 
             actualizado_en = NOW(),
             estado = 'pendiente' -- Vuelve a pendiente al editar
         WHERE id = $2 AND hash_navegador = $3 
         RETURNING *`,
        [
          descripcion !== undefined ? descripcion : actual.descripcion,
          id,
          hashNavegador
        ]
      );

      res.json({
        mensaje: 'Experiencia actualizada exitosamente. Debe ser revisada nuevamente por moderación.',
        experiencia: result.rows[0]
      });

    } catch (error) {
      console.error('Error editando experiencia:', error);
      res.status(500).json({ error: 'Error al editar experiencia' });
    }
  },

  /**
   * Eliminar experiencia
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
          error: 'Experiencia no encontrada o no tienes permisos para eliminarla' 
        });
      }

      res.json({ 
        mensaje: 'Experiencia eliminada exitosamente',
        experiencia: result.rows[0]
      });

    } catch (error) {
      console.error('Error eliminando experiencia:', error);
      res.status(500).json({ error: 'Error al eliminar experiencia' });
    }
  },

  /**
   * Obtener experiencias del usuario actual
   */
  async obtenerMisExperiencias(req: Request, res: Response) {
    try {
      const hashNavegador = generarHashNavegador(req);
      const ipUsuario = req.ip;

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
        experiencias: result.rows,
        total: result.rows.length
      });

    } catch (error) {
      console.error('Error obteniendo mis experiencias:', error);
      res.status(500).json({ error: 'Error al obtener experiencias' });
    }
  },

  /**
   * Obtener todas las experiencias aprobadas (público)
   */
  async obtenerExperiencias(req: Request, res: Response) {
    try {
      const { pagina = 1, limite = 20 } = req.query;
      const offset = (Number(pagina) - 1) * Number(limite);

      const result = await pool.query(
        `SELECT e.*, l.nombre as lugar_nombre, l.ubicacion as lugar_ubicacion
         FROM experiencias e
         LEFT JOIN lugares l ON e.lugar_id = l.id
         WHERE e.estado = 'aprobado'
         ORDER BY e.creado_en DESC
         LIMIT $1 OFFSET $2`,
        [limite, offset]
      );

      const countResult = await pool.query(
        'SELECT COUNT(*) FROM experiencias WHERE estado = $1',
        ['aprobado']
      );

      res.json({
        experiencias: result.rows,
        total: parseInt(countResult.rows[0].count),
        pagina: Number(pagina),
        totalPaginas: Math.ceil(parseInt(countResult.rows[0].count) / Number(limite))
      });
    } catch (error) {
      console.error('Error obteniendo experiencias:', error);
      res.status(500).json({ error: 'Error al obtener experiencias' });
    }
  },

  /**
   * Obtener experiencia por ID (público)
   */
  async obtenerExperienciaPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT e.*, l.nombre as lugar_nombre, l.ubicacion as lugar_ubicacion
         FROM experiencias e
         LEFT JOIN lugares l ON e.lugar_id = l.id
         WHERE e.id = $1 AND e.estado = 'aprobado'`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Experiencia no encontrada' });
      }

      // Incrementar contador de vistas
      await pool.query(
        'UPDATE experiencias SET contador_vistas = contador_vistas + 1 WHERE id = $1',
        [id]
      );

      res.json({ experiencia: result.rows[0] });
    } catch (error) {
      console.error('Error obteniendo experiencia:', error);
      res.status(500).json({ error: 'Error al obtener experiencia' });
    }
  },

  /**
   * Obtener experiencias pendientes (admin only)
   */
  async obtenerExperienciasPendientes(req: Request, res: Response) {
    try {
      const { pagina = 1, limite = 20 } = req.query;
      const offset = (Number(pagina) - 1) * Number(limite);

      const result = await pool.query(
        `SELECT e.*, l.nombre as lugar_nombre
         FROM experiencias e
         LEFT JOIN lugares l ON e.lugar_id = l.id
         WHERE e.estado = 'pendiente'
         ORDER BY e.creado_en DESC
         LIMIT $1 OFFSET $2`,
        [limite, offset]
      );

      const countResult = await pool.query(
        'SELECT COUNT(*) FROM experiencias WHERE estado = $1',
        ['pendiente']
      );

      res.json({
        experiencias: result.rows,
        total: parseInt(countResult.rows[0].count),
        pagina: Number(pagina)
      });
    } catch (error) {
      console.error('Error obteniendo experiencias pendientes:', error);
      res.status(500).json({ error: 'Error al obtener experiencias pendientes' });
    }
  },

  /**
   * Aprobar/rechazar experiencia (admin only)
   */
  async moderarExperiencia(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { accion, razon } = req.body;

      if (!['aprobar', 'rechazar'].includes(accion)) {
        return res.status(400).json({ error: 'Acción no válida' });
      }

      const estado = accion === 'aprobar' ? 'aprobado' : 'rechazado';

      const result = await pool.query(
        'UPDATE experiencias SET estado = $1 WHERE id = $2 RETURNING *',
        [estado, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Experiencia no encontrada' });
      }

      res.json({
        mensaje: `Experiencia ${estado} exitosamente`,
        experiencia: result.rows[0]
      });
    } catch (error) {
      console.error('Error moderando experiencia:', error);
      res.status(500).json({ error: 'Error al moderar experiencia' });
    }
  },

  /**
   * Estadísticas de experiencias (admin only)
   */
  async obtenerEstadisticas(req: Request, res: Response) {
    try {
      const result = await pool.query(`
        SELECT 
          estado,
          COUNT(*) as cantidad,
          SUM(contador_vistas) as total_vistas
        FROM experiencias 
        GROUP BY estado
      `);

      const totalResult = await pool.query('SELECT COUNT(*) FROM experiencias');
      const vistasResult = await pool.query('SELECT SUM(contador_vistas) FROM experiencias');

      res.json({
        por_estado: result.rows,
        total: parseInt(totalResult.rows[0].count),
        total_vistas: parseInt(vistasResult.rows[0].sum || '0')
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
  },
/**
 * Registrar vista de experiencia
 */
async registrarVista(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const ipUsuario = req.ip || req.connection.remoteAddress;
    const agenteUsuario = req.get('User-Agent') || '';

    console.log('👀 Registrando vista para experiencia:', { id, ip: ipUsuario });

    // 1. Verificar que la experiencia existe y está aprobada
    const expResult = await pool.query(
      'SELECT id FROM experiencias WHERE id = $1 AND estado = $2',
      [id, 'aprobado']
    );

    if (expResult.rows.length === 0) {
      return res.status(404).json({ error: 'Experiencia no encontrada' });
    }

    // 2. Verificar si ya existe una vista desde esta IP/User-Agent en las últimas 24 horas
    const vistaExistente = await pool.query(
      `SELECT id FROM vistas_experiencias 
       WHERE experiencia_id = $1 AND ip_usuario = $2 
       AND visto_en >= NOW() - INTERVAL '24 hours'
       LIMIT 1`,
      [id, ipUsuario]
    );

    if (vistaExistente.rows.length === 0) {
      // 3. Insertar nueva vista
      await pool.query(
        `INSERT INTO vistas_experiencias 
         (experiencia_id, ip_usuario, agente_usuario) 
         VALUES ($1, $2, $3)`,
        [id, ipUsuario, agenteUsuario]
      );

      console.log('✅ Nueva vista registrada para experiencia:', id);
    } else {
      console.log('⏭️ Vista duplicada ignorada para experiencia:', id);
    }

    // 4. Actualizar contador en la tabla experiencias (siempre)
    await pool.query(
      'UPDATE experiencias SET contador_vistas = contador_vistas + 1 WHERE id = $1',
      [id]
    );

    res.json({ 
      mensaje: 'Vista registrada exitosamente',
      experiencia_id: id
    });

  } catch (error) {
    console.error('❌ Error registrando vista:', error);
    res.status(500).json({ error: 'Error al registrar vista' });
  }
}
};