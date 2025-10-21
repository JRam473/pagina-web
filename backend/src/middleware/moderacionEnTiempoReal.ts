// backend/src/middleware/moderacionEnTiempoReal.ts (VERSIÓN CORREGIDA)
import { Request, Response, NextFunction } from 'express';
import { ModeracionService } from '../services/moderacionService';

const moderacionService = new ModeracionService();

declare global {
  namespace Express {
    interface Request {
      moderacionResultado?: any;
    }
  }
}

// ✅ middleware/moderacionEnTiempoReal.ts - VERSIÓN MEJORADA
export const moderacionEnTiempoReal = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Solo aplicar a métodos que crean contenido
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next();
    }

    console.log('🛡️ Aplicando moderación en tiempo real...');
    console.log('📦 Body disponible:', !!req.body);
    console.log('📁 Files disponibles:', !!req.files || !!req.file);

    // ✅ MANEJO SEGURO DE ARCHIVOS
    let archivos: Express.Multer.File[] = [];
    
    if (req.files) {
      if (Array.isArray(req.files)) {
        archivos = req.files;
      } else if (typeof req.files === 'object') {
        archivos = Object.values(req.files).flat();
      }
    } else if (req.file) {
      archivos = [req.file];
    }

    // ✅ EXTRAER TEXTO DE FORMA SEGURA
    const texto = req.body?.descripcion || req.body?.comentario || req.body?.contenido || '';
    
    const ipUsuario = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const hashNavegador = Buffer.from(userAgent).toString('base64').substring(0, 32);

    // Si no hay contenido para moderar, continuar
    if ((!texto || texto.trim() === '') && archivos.length === 0) {
      console.log('ℹ️ No hay contenido para moderar, continuando...');
      return next();
    }

    console.log(`📝 Texto a moderar: ${texto ? 'Sí (' + texto.length + ' chars)' : 'No'}`);
    console.log(`📁 Archivos a moderar: ${archivos.length}`);

    // Preparar datos para moderación
    const datosModeracion: any = {
      ipUsuario,
      hashNavegador
    };

    if (texto && texto.trim() !== '') {
      datosModeracion.texto = texto.trim();
    }

    // Procesar archivos
    for (const archivo of archivos) {
      if (archivo.mimetype.startsWith('image/')) {
        datosModeracion.imagenBuffer = archivo.buffer;
        datosModeracion.imagenMimeType = archivo.mimetype;
        console.log(`🖼️ Imagen detectada: ${archivo.originalname}`);
      } else if (archivo.mimetype === 'application/pdf') {
        datosModeracion.pdfBuffer = archivo.buffer;
        console.log(`📄 PDF detectado: ${archivo.originalname}`);
      }
    }

    // ✅ EJECUTAR MODERACIÓN
    const moderacionService = new ModeracionService();
    const resultado = await moderacionService.moderarContenidoEnTiempoReal(datosModeracion);

    if (!resultado.esAprobado) {
      console.log(`❌ Contenido rechazado: ${resultado.motivoRechazo}`);
      return res.status(400).json({
        success: false,
        error: 'CONTENIDO_RECHAZADO',
        message: 'El contenido no cumple con nuestras políticas',
        motivo: resultado.motivoRechazo,
        detalles: {
          puntuacion: resultado.puntuacionGeneral,
          tipo: 'moderacion_automatica',
          timestamp: new Date().toISOString()
        }
      });
    }

    console.log('✅ Contenido aprobado por moderación automática');
    next();

  } catch (error) {
    console.error('❌ Error en moderación en tiempo real:', error);
    
    // En caso de error, ser permisivo y continuar
    console.log('⚠️ Error en moderación, continuando sin moderación...');
    next();
  }
};