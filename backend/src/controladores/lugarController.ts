// controladores/lugarController.ts - VERSIÓN CORREGIDA Y UNIFICADA
import { Request, Response } from 'express';
import { pool } from '../utils/baseDeDatos';
import fs from 'fs';
import sharp from 'sharp';

export const lugarController = {
  // Obtener todos los lugares (público) - SIN CAMBIOS
  async obtenerLugares(req: Request, res: Response) {
    try {
      const { categoria, pagina = 1, limite = 20 } = req.query;
      const offset = (Number(pagina) - 1) * Number(limite);

      let query = `
        SELECT l.*, 
               COUNT(DISTINCT cl.id) as total_calificaciones,
               COUNT(DISTINCT e.id) as total_experiencias
        FROM lugares l
        LEFT JOIN calificaciones_lugares cl ON l.id = cl.lugar_id
        LEFT JOIN experiencias e ON l.id = e.lugar_id AND e.estado = 'aprobado'
      `;
      
      let countQuery = 'SELECT COUNT(*) FROM lugares';
      const queryParams: any[] = [];
      const countParams: any[] = [];

      if (categoria) {
        query += ' WHERE l.categoria = $1';
        countQuery += ' WHERE categoria = $1';
        queryParams.push(categoria);
        countParams.push(categoria);
      }

      query += ` 
        GROUP BY l.id
        ORDER BY l.puntuacion_promedio DESC, l.total_calificaciones DESC
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;
      
      queryParams.push(limite, offset);

      const result = await pool.query(query, queryParams);
      const countResult = await pool.query(countQuery, countParams);

      res.json({
        lugares: result.rows,
        total: parseInt(countResult.rows[0].count),
        pagina: Number(pagina),
        totalPaginas: Math.ceil(parseInt(countResult.rows[0].count) / Number(limite))
      });
    } catch (error) {
      console.error('Error obteniendo lugares:', error);
      res.status(500).json({ error: 'Error al obtener lugares' });
    }
  },

  // Obtener lugar por ID (público) - SIN CAMBIOS
  async obtenerLugarPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const lugarResult = await pool.query(
        `SELECT l.*, 
                COUNT(DISTINCT e.id) as total_experiencias
         FROM lugares l
         LEFT JOIN experiencias e ON l.id = e.lugar_id AND e.estado = 'aprobado'
         WHERE l.id = $1
         GROUP BY l.id`,
        [id]
      );

      if (lugarResult.rows.length === 0) {
        return res.status(404).json({ error: 'Lugar no encontrado' });
      }

      const fotosResult = await pool.query(
        'SELECT * FROM fotos_lugares WHERE lugar_id = $1 ORDER BY es_principal DESC, orden ASC',
        [id]
      );

      const experienciasResult = await pool.query(
        `SELECT e.* 
         FROM experiencias e 
         WHERE e.lugar_id = $1 AND e.estado = 'aprobado'
         ORDER BY e.creado_en DESC
         LIMIT 10`,
        [id]
      );

      res.json({
        lugar: lugarResult.rows[0],
        fotos: fotosResult.rows,
        experiencias: experienciasResult.rows
      });
    } catch (error) {
      console.error('Error obteniendo lugar:', error);
      res.status(500).json({ error: 'Error al obtener lugar' });
    }
  },

  // Crear lugar (admin only) - SIN CAMBIOS
  async crearLugar(req: Request, res: Response) {
    try {
      const { nombre, descripcion, ubicacion, categoria, foto_principal_url, pdf_url } = req.body;

      const result = await pool.query(
        `INSERT INTO lugares 
         (nombre, descripcion, ubicacion, categoria, foto_principal_url, pdf_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [nombre, descripcion, ubicacion, categoria, foto_principal_url, pdf_url]
      );

      res.status(201).json({
        mensaje: 'Lugar creado exitosamente',
        lugar: result.rows[0]
      });
    } catch (error) {
      console.error('Error creando lugar:', error);
      res.status(500).json({ error: 'Error al crear lugar' });
    }
  },

  // Actualizar lugar (admin only) - SIN CAMBIOS
  async actualizarLugar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nombre, descripcion, ubicacion, categoria, foto_principal_url, pdf_url } = req.body;

      const result = await pool.query(
        `UPDATE lugares 
         SET nombre = $1, descripcion = $2, ubicacion = $3, categoria = $4, 
             foto_principal_url = $5, pdf_url = $6, actualizado_en = NOW()
         WHERE id = $7
         RETURNING *`,
        [nombre, descripcion, ubicacion, categoria, foto_principal_url, pdf_url, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lugar no encontrado' });
      }

      res.json({
        mensaje: 'Lugar actualizado exitosamente',
        lugar: result.rows[0]
      });
    } catch (error) {
      console.error('Error actualizando lugar:', error);
      res.status(500).json({ error: 'Error al actualizar lugar' });
    }
  },

  // Eliminar lugar (admin only) - SIN CAMBIOS
  async eliminarLugar(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM lugares WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lugar no encontrado' });
      }

      res.json({ mensaje: 'Lugar eliminado exitosamente' });
    } catch (error) {
      console.error('Error eliminando lugar:', error);
      res.status(500).json({ error: 'Error al eliminar lugar' });
    }
  },

  // Obtener categorías únicas (público) - SIN CAMBIOS
  async obtenerCategorias(req: Request, res: Response) {
    try {
      const result = await pool.query(
        'SELECT DISTINCT categoria FROM lugares WHERE categoria IS NOT NULL ORDER BY categoria'
      );

      res.json({
        categorias: result.rows.map(row => row.categoria)
      });
    } catch (error) {
      console.error('Error obteniendo categorías:', error);
      res.status(500).json({ error: 'Error al obtener categorías' });
    }
  },

  // Subir imagen principal - VERSIÓN CORREGIDA
  async subirImagenLugar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
      }

      // Verificar que el lugar existe
      const lugarResult = await pool.query(
        'SELECT id FROM lugares WHERE id = $1',
        [id]
      );

      if (lugarResult.rows.length === 0) {
        if (req.file.path) fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Lugar no encontrado' });
      }

      // ✅ CORREGIDO: Usar misma ruta que cargaArchivosController
      const rutaImagen = `/uploads/images/lugares/${req.file.filename}`;

      // Verificar si ya existe una imagen principal
      const imagenPrincipalExistente = await pool.query(
        'SELECT id FROM fotos_lugares WHERE lugar_id = $1 AND es_principal = true',
        [id]
      );

      let result;
      
      if (imagenPrincipalExistente.rows.length > 0) {
        // Actualizar la imagen principal existente
        const imagenId = imagenPrincipalExistente.rows[0].id;
        
        // Eliminar archivo anterior si existe
        const imagenAnterior = await pool.query(
          'SELECT ruta_almacenamiento FROM fotos_lugares WHERE id = $1',
          [imagenId]
        );
        
        if (imagenAnterior.rows[0]?.ruta_almacenamiento && 
            fs.existsSync(imagenAnterior.rows[0].ruta_almacenamiento)) {
          fs.unlinkSync(imagenAnterior.rows[0].ruta_almacenamiento);
        }

        result = await pool.query(
          `UPDATE fotos_lugares 
           SET url_foto = $1, ruta_almacenamiento = $2, tamaño_archivo = $3, 
               tipo_archivo = $4, actualizado_en = NOW()
           WHERE id = $5
           RETURNING id`,
          [rutaImagen, req.file.path, req.file.size, req.file.mimetype, imagenId]
        );
      } else {
        // Insertar nueva imagen principal
        result = await pool.query(
          `INSERT INTO fotos_lugares (lugar_id, url_foto, es_principal, descripcion, orden, 
           ruta_almacenamiento, tamaño_archivo, tipo_archivo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id`,
          [
            id,
            rutaImagen,
            true,
            'Imagen principal del lugar',
            1,
            req.file.path,
            req.file.size,
            req.file.mimetype
          ]
        );
      }

      res.json({
        mensaje: 'Imagen subida exitosamente',
        url_imagen: rutaImagen,
        es_principal: true,
        imagen_id: result.rows[0].id,
        archivo: {
          nombre: req.file.filename,
          tamaño: req.file.size,
          tipo: req.file.mimetype
        }
      });

    } catch (error) {
      console.error('Error subiendo imagen:', error);
      
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error eliminando archivo:', unlinkError);
        }
      }
      
      res.status(500).json({ error: 'Error al subir imagen' });
    }
  },

  // Subir múltiples imágenes para galería del lugar - VERSIÓN CORREGIDA
async subirMultipleImagenesLugar(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron imágenes' });
    }

    console.log('📤 Subiendo múltiples imágenes para galería del lugar:', id);

    await client.query('BEGIN');

    // 1. Verificar que el lugar existe
    const lugarResult = await client.query(
      'SELECT id, nombre, foto_principal_url FROM lugares WHERE id = $1',
      [id]
    );

    if (lugarResult.rows.length === 0) {
      await client.query('ROLLBACK');
      req.files.forEach(file => { if (file.path) fs.unlinkSync(file.path); });
      return res.status(404).json({ error: 'Lugar no encontrado' });
    }

    const lugar = lugarResult.rows[0];
    const tieneImagenPrincipal = !!lugar.foto_principal_url;
    
    console.log('📍 Lugar:', lugar.nombre, '| ¿Tiene imagen principal?:', tieneImagenPrincipal);

    // 2. Obtener el máximo orden actual
    const maxOrdenResult = await client.query(
      'SELECT COALESCE(MAX(orden), 0) as max_orden FROM fotos_lugares WHERE lugar_id = $1',
      [id]
    );
    
    let orden = maxOrdenResult.rows[0].max_orden + 1;
    const imagenesSubidas = [];

    // 3. Insertar cada imagen como NO principal
    for (const file of req.files) {
      const rutaImagen = `/uploads/images/lugares/${file.filename}`;
      
      console.log('💾 Guardando imagen de galería:', {
        nombre: file.filename,
        orden: orden,
        es_principal: false // ← EXPLÍCITAMENTE NO principal
      });

      // Obtener dimensiones
      let anchoImagen: number | null = null;
      let altoImagen: number | null = null;
      
      try {
        const metadata = await sharp(file.path).metadata();
        anchoImagen = metadata.width || null;
        altoImagen = metadata.height || null;
      } catch (sharpError) {
        console.warn('⚠️ No se pudieron obtener dimensiones:', sharpError);
      }

      // Insertar imagen EXPLÍCITAMENTE como no principal
      const result = await client.query(
        `INSERT INTO fotos_lugares 
         (lugar_id, url_foto, ruta_almacenamiento, descripcion, es_principal, orden,
          ancho_imagen, alto_imagen, tamaño_archivo, tipo_archivo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, url_foto, es_principal, orden`,
        [
          id,
          rutaImagen,
          file.path,
          `Imagen ${orden} - ${lugar.nombre}`,
          false, // ← CRÍTICO: Siempre false para imágenes de galería
          orden,
          anchoImagen,
          altoImagen,
          file.size,
          file.mimetype
        ]
      );

      const imagenInsertada = result.rows[0];
      console.log('✅ Imagen de galería insertada:', {
        id: imagenInsertada.id, 
        es_principal: imagenInsertada.es_principal
      });

      imagenesSubidas.push({
        id: imagenInsertada.id,
        url: imagenInsertada.url_foto,
        es_principal: imagenInsertada.es_principal,
        orden: imagenInsertada.orden,
        nombre: file.filename
      });

      orden++;
    }

    await client.query('COMMIT');
    console.log('✅ Galería actualizada - Imágenes agregadas:', imagenesSubidas.length);

    res.json({
      mensaje: `${req.files.length} imágenes agregadas a la galería`,
      imagenes: imagenesSubidas,
      total: imagenesSubidas.length,
      nota: 'Las imágenes se agregaron a la galería sin establecer como principal'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error subiendo imágenes a galería:', error);
    
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach(file => {
        if (file.path) {
          try { fs.unlinkSync(file.path); } catch (unlinkError) { /* ignore */ }
        }
      });
    }
    
    res.status(500).json({ 
      error: 'Error al agregar imágenes a la galería',
      detalle: error instanceof Error ? error.message : 'Error desconocido'
    });
  } finally {
    client.release();
  }
},

  // Subir PDF de lugar - VERSIÓN CORREGIDA
  async subirPDFLugar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ningún PDF' });
      }

      // Verificar que el lugar existe
      const lugarResult = await pool.query(
        'SELECT id FROM lugares WHERE id = $1',
        [id]
      );

      if (lugarResult.rows.length === 0) {
        // Eliminar el archivo subido si el lugar no existe
        if (req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ error: 'Lugar no encontrado' });
      }

      // ✅ CORREGIDO: Usar misma ruta que cargaArchivosController
      const rutaPDF = `/uploads/pdfs/${req.file.filename}`;

      // Actualizar el PDF en la tabla lugares
      await pool.query(
        'UPDATE lugares SET pdf_url = $1, actualizado_en = NOW() WHERE id = $2',
        [rutaPDF, id]
      );

      res.json({
        mensaje: 'PDF subido exitosamente',
        url_pdf: rutaPDF,
        archivo: {
          nombre: req.file.filename,
          tamaño: req.file.size,
          tipo: req.file.mimetype
        }
      });
    } catch (error) {
      console.error('Error subiendo PDF:', error);
      
      // Eliminar archivo en caso de error
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error eliminando archivo:', unlinkError);
        }
      }
      
      res.status(500).json({ error: 'Error al subir PDF' });
    }
  },

  // Obtener galería de imágenes de un lugar - SIN CAMBIOS
  async obtenerGaleriaLugar(req: Request, res: Response) {
    try {
      const { id } = req.params;

      console.log('📸 Obteniendo galería para lugar:', id);

      // Verificar que el lugar existe
      const lugarExists = await pool.query(
        'SELECT id, nombre FROM lugares WHERE id = $1',
        [id]
      );

      if (lugarExists.rows.length === 0) {
        return res.status(404).json({ error: 'Lugar no encontrado' });
      }

      const lugar = lugarExists.rows[0];

      // Obtener imágenes de la galería
      const result = await pool.query(
        `SELECT 
          id, 
          url_foto, 
          descripcion, 
          es_principal, 
          orden, 
          creado_en
         FROM fotos_lugares 
         WHERE lugar_id = $1 
         ORDER BY es_principal DESC, orden ASC`,
        [id]
      );

      console.log(`🖼️ Encontradas ${result.rows.length} imágenes para ${lugar.nombre}`);

      res.json({
        lugar_id: id,
        lugar_nombre: lugar.nombre,
        imagenes: result.rows,
        total: result.rows.length
      });
    } catch (error) {
      console.error('Error obteniendo galería:', error);
      res.status(500).json({ error: 'Error al obtener galería de imágenes' });
    }
  },

  // Eliminar imagen de la galería - SIN CAMBIOS
  async eliminarImagenGaleria(req: Request, res: Response) {
    try {
      const { id, imagenId } = req.params;

      // Verificar que la imagen pertenece al lugar
      const imagenResult = await pool.query(
        'SELECT * FROM fotos_lugares WHERE id = $1 AND lugar_id = $2',
        [imagenId, id]
      );

      if (imagenResult.rows.length === 0) {
        return res.status(404).json({ error: 'Imagen no encontrada o no pertenece al lugar' });
      }

      const imagen = imagenResult.rows[0];

      // No permitir eliminar la imagen principal
      if (imagen.es_principal) {
        return res.status(400).json({ error: 'No se puede eliminar la imagen principal' });
      }

      // Eliminar el archivo físico
      if (imagen.ruta_almacenamiento && fs.existsSync(imagen.ruta_almacenamiento)) {
        fs.unlinkSync(imagen.ruta_almacenamiento);
      }

      // Eliminar de la base de datos
      await pool.query(
        'DELETE FROM fotos_lugares WHERE id = $1',
        [imagenId]
      );

      res.json({ mensaje: 'Imagen eliminada exitosamente' });
    } catch (error) {
      console.error('Error eliminando imagen:', error);
      res.status(500).json({ error: 'Error al eliminar imagen' });
    }
  },

  // Establecer imagen como principal - SIN CAMBIOS
  async establecerImagenPrincipal(req: Request, res: Response) {
    try {
      const { id, imagenId } = req.params;

      // Iniciar transacción para asegurar consistencia
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        // 1. Verificar que la imagen pertenece al lugar
        const imagenResult = await client.query(
          'SELECT * FROM fotos_lugares WHERE id = $1 AND lugar_id = $2',
          [imagenId, id]
        );

        if (imagenResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Imagen no encontrada o no pertenece al lugar' });
        }

        // 2. Actualizar todas las imágenes del lugar a no principales
        await client.query(
          'UPDATE fotos_lugares SET es_principal = false WHERE lugar_id = $1',
          [id]
        );

        // 3. Establecer la imagen seleccionada como principal
        await client.query(
          'UPDATE fotos_lugares SET es_principal = true WHERE id = $1',
          [imagenId]
        );

        // 4. Obtener la URL de la nueva imagen principal
        const nuevaPrincipalResult = await client.query(
          'SELECT url_foto FROM fotos_lugares WHERE id = $1',
          [imagenId]
        );

        const nuevaUrl = nuevaPrincipalResult.rows[0].url_foto;

        // 5. Actualizar también la foto_principal_url en la tabla lugares
        await client.query(
          'UPDATE lugares SET foto_principal_url = $1 WHERE id = $2',
          [nuevaUrl, id]
        );

        await client.query('COMMIT');

        res.json({ 
          mensaje: 'Imagen establecida como principal exitosamente',
          nueva_imagen_principal: nuevaUrl
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error estableciendo imagen principal:', error);
      res.status(500).json({ error: 'Error al establecer imagen principal' });
    }
  },

  // Actualizar descripción de imagen - SIN CAMBIOS
  async actualizarDescripcionImagen(req: Request, res: Response) {
    try {
      const { id, imagenId } = req.params;
      const { descripcion } = req.body;

      if (!descripcion || descripcion.trim().length === 0) {
        return res.status(400).json({ error: 'La descripción es requerida' });
      }

      // Verificar que la imagen pertenece al lugar
      const imagenResult = await pool.query(
        'SELECT * FROM fotos_lugares WHERE id = $1 AND lugar_id = $2',
        [imagenId, id]
      );

      if (imagenResult.rows.length === 0) {
        return res.status(404).json({ error: 'Imagen no encontrada' });
      }

      // Actualizar descripción
      await pool.query(
        'UPDATE fotos_lugares SET descripcion = $1 WHERE id = $2',
        [descripcion.trim(), imagenId]
      );

      res.json({ 
        mensaje: 'Descripción actualizada exitosamente',
        imagen: {
          id: imagenId,
          descripcion: descripcion.trim()
        }
      });
    } catch (error) {
      console.error('Error actualizando descripción:', error);
      res.status(500).json({ error: 'Error al actualizar descripción' });
    }
  },

  // Eliminar imagen principal (con lógica de reemplazo) - SIN CAMBIOS
  async eliminarImagenPrincipal(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Obtener la imagen principal actual
      const imagenPrincipalResult = await pool.query(
        'SELECT * FROM fotos_lugares WHERE lugar_id = $1 AND es_principal = true',
        [id]
      );

      if (imagenPrincipalResult.rows.length === 0) {
        return res.status(404).json({ error: 'No se encontró imagen principal' });
      }

      const imagenPrincipal = imagenPrincipalResult.rows[0];

      // Buscar una imagen alternativa para establecer como principal
      const imagenesAlternativas = await pool.query(
        'SELECT * FROM fotos_lugares WHERE lugar_id = $1 AND es_principal = false ORDER BY orden ASC LIMIT 1',
        [id]
      );

      let nuevaImagenPrincipal = null;

      if (imagenesAlternativas.rows.length > 0) {
        // Establecer la primera imagen alternativa como principal
        nuevaImagenPrincipal = imagenesAlternativas.rows[0];
        
        await pool.query(
          'UPDATE fotos_lugares SET es_principal = true WHERE id = $1',
          [nuevaImagenPrincipal.id]
        );

        // Actualizar la foto_principal_url en la tabla lugares
        await pool.query(
          'UPDATE lugares SET foto_principal_url = $1 WHERE id = $2',
          [nuevaImagenPrincipal.url_foto, id]
        );
      } else {
        // No hay imágenes alternativas, dejar sin imagen principal
        await pool.query(
          'UPDATE lugares SET foto_principal_url = NULL WHERE id = $1',
          [id]
        );
      }

      // Eliminar el archivo físico de la imagen principal
      if (imagenPrincipal.ruta_almacenamiento && fs.existsSync(imagenPrincipal.ruta_almacenamiento)) {
        fs.unlinkSync(imagenPrincipal.ruta_almacenamiento);
      }

      // Eliminar de la base de datos
      await pool.query(
        'DELETE FROM fotos_lugares WHERE id = $1',
        [imagenPrincipal.id]
      );

      res.json({
        mensaje: 'Imagen principal eliminada exitosamente',
        nueva_imagen_principal: nuevaImagenPrincipal ? {
          id: nuevaImagenPrincipal.id,
          url_foto: nuevaImagenPrincipal.url_foto
        } : null
      });
    } catch (error) {
      console.error('Error eliminando imagen principal:', error);
      res.status(500).json({ error: 'Error al eliminar imagen principal' });
    }
  },

  // Reemplazar imagen principal - VERSIÓN CORREGIDA
async reemplazarImagenPrincipal(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    console.log('🔄 Reemplazando imagen principal para lugar:', id);

    if (!req.file) {
      return res.status(400).json({ error: 'Archivo es requerido' });
    }

    await client.query('BEGIN');

    // 1. Verificar que el lugar existe
    const lugarResult = await client.query(
      'SELECT id, nombre FROM lugares WHERE id = $1',
      [id]
    );

    if (lugarResult.rows.length === 0) {
      if (req.file.path) fs.unlinkSync(req.file.path);
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lugar no encontrado' });
    }

    const lugar = lugarResult.rows[0];
    const rutaRelativa = `/uploads/images/lugares/${req.file.filename}`;
    
    console.log('📍 Reemplazando imagen principal para:', lugar.nombre);

    // 2. Obtener la imagen principal actual
    const imagenPrincipalActual = await client.query(
      'SELECT id, ruta_almacenamiento FROM fotos_lugares WHERE lugar_id = $1 AND es_principal = true',
      [id]
    );

    let imagenActualId: string | null = null;

    if (imagenPrincipalActual.rows.length > 0) {
      // 3. Reemplazar imagen principal existente
      const imagenActual = imagenPrincipalActual.rows[0];
      imagenActualId = imagenActual.id;
      
      console.log('📸 Imagen principal actual encontrada:', imagenActualId);

      // Eliminar archivo anterior
      if (imagenActual.ruta_almacenamiento && fs.existsSync(imagenActual.ruta_almacenamiento)) {
        fs.unlinkSync(imagenActual.ruta_almacenamiento);
      }

      // Obtener dimensiones
      let anchoImagen: number | null = null;
      let altoImagen: number | null = null;
      
      try {
        const metadata = await sharp(req.file.path).metadata();
        anchoImagen = metadata.width || null;
        altoImagen = metadata.height || null;
      } catch (sharpError) {
        console.warn('⚠️ No se pudieron obtener dimensiones:', sharpError);
      }

      // Actualizar la imagen existente (manteniendo es_principal = true)
      await client.query(
        `UPDATE fotos_lugares 
         SET url_foto = $1, 
             ruta_almacenamiento = $2, 
             tamaño_archivo = $3, 
             tipo_archivo = $4,
             ancho_imagen = $5,
             alto_imagen = $6,
             actualizado_en = NOW()
         WHERE id = $7`,
        [
          rutaRelativa, 
          req.file.path, 
          req.file.size, 
          req.file.mimetype,
          anchoImagen,
          altoImagen,
          imagenActualId
        ]
      );
      
    } else {
      // 4. Crear nueva imagen principal si no existe
      console.log('➕ Creando nueva imagen principal...');
      
      let anchoImagen: number | null = null;
      let altoImagen: number | null = null;
      
      try {
        const metadata = await sharp(req.file.path).metadata();
        anchoImagen = metadata.width || null;
        altoImagen = metadata.height || null;
      } catch (sharpError) {
        console.warn('⚠️ No se pudieron obtener dimensiones:', sharpError);
      }

      const result = await client.query(
        `INSERT INTO fotos_lugares 
         (lugar_id, url_foto, es_principal, descripcion, orden, 
          ruta_almacenamiento, tamaño_archivo, tipo_archivo, ancho_imagen, alto_imagen)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          id,
          rutaRelativa,
          true, // ← CRÍTICO: Esta es la imagen principal
          'Imagen principal del lugar',
          1,
          req.file.path,
          req.file.size,
          req.file.mimetype,
          anchoImagen,
          altoImagen
        ]
      );
      
      imagenActualId = result.rows[0].id;
    }

    // 5. Actualizar la foto_principal_url en la tabla lugares
    await client.query(
      'UPDATE lugares SET foto_principal_url = $1, actualizado_en = NOW() WHERE id = $2',
      [rutaRelativa, id]
    );

    await client.query('COMMIT');
    console.log('✅ Imagen principal reemplazada exitosamente');

    res.json({
      mensaje: 'Imagen principal reemplazada exitosamente',
      url_imagen: rutaRelativa,
      imagen_id: imagenActualId,
      es_principal: true,
      archivo: {
        nombre: req.file.filename,
        tamaño: req.file.size,
        tipo: req.file.mimetype
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error reemplazando imagen principal:', error);
    
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch (unlinkError) { /* ignore */ }
    }
    
    res.status(500).json({ 
      error: 'Error al reemplazar imagen principal',
      detalle: error instanceof Error ? error.message : 'Error desconocido'
    });
  } finally {
    client.release();
  }
}
};