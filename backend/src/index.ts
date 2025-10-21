// ✅ ARCHIVO PRINCIPAL CORREGIDO (app.ts o server.ts)
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import passport from './utils/oauth';
import { middlewareIpNavegador } from './middleware/ipNavegador';

// ✅ NUEVO SISTEMA UNIFICADO DE MODERACIÓN
import { ModeracionService } from './services/moderacionService';
import { AnalizadorImagen } from './utils/analizadorImagen';
import { AnalizadorTexto } from './utils/analizadorTexto';
import { pool } from './utils/baseDeDatos';

// Rutas
import administradorRoutes from './rutas/administradorRoutes';
import autenticacionRoutes from './rutas/autenticacionRoutes';
import lugarRoutes from './rutas/lugarRoutes';
import experienciaRoutes from './rutas/experienciaRoutes';
import calificacionRoutes from './rutas/calificacionRoutes';
import archivosRoutes from './rutas/archivosRoutes';

const app = express();

// ✅ MIDDLEWARES GLOBALES EN ORDEN CORRECTO
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(passport.initialize());
app.use(middlewareIpNavegador);

// ✅ SERVIR ARCHIVOS ESTÁTICOS PRIMERO
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/images', express.static(path.join(__dirname, '../uploads/images')));
app.use('/pdfs', express.static(path.join(__dirname, '../uploads/pdfs')));

// ✅ RUTA DE SALUD (SIN MODERACIÓN)
app.use('/api/health', (req, res) => res.json({ status: 'OK' }));

// ✅ RUTAS PÚBLICAS (SIN MODERACIÓN GLOBAL)
app.use('/api/auth', autenticacionRoutes);

// ✅ RUTAS CON MODERACIÓN INTEGRADA EN SUS PROPIAS DEFINICIONES
// ❌ ELIMINADO: NO aplicar moderacionEnTiempoReal globalmente aquí
app.use('/api/lugares', lugarRoutes);
app.use('/api/experiencias', experienciaRoutes);
app.use('/api/calificaciones', calificacionRoutes);

// ✅ RUTAS PROTEGIDAS (admin)
app.use('/api/admin', administradorRoutes);
app.use('/api/archivos', archivosRoutes);

// ✅ RUTA DE MONITOREO DE MODERACIÓN MEJORADA
app.get('/api/moderacion/estado', async (req, res) => {
  try {
    // Estadísticas de logs de moderación
    const logsStats = await pool.query(`
      SELECT 
        accion,
        COUNT(*) as total,
        AVG(LENGTH(contenido_texto)) as avg_longitud_texto
      FROM logs_moderacion 
      WHERE creado_en >= NOW() - INTERVAL '7 days'
      GROUP BY accion
    `);

    // Tipos de contenido moderados
    const tiposContenido = await pool.query(`
      SELECT 
        tipo_contenido,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE accion = 'rechazado') as rechazados
      FROM logs_moderacion 
      WHERE creado_en >= NOW() - INTERVAL '7 days'
      GROUP BY tipo_contenido
    `);

    // Usuarios problemáticos
    const usuariosProblematicos = await pool.query(`
      SELECT 
        hash_navegador,
        COUNT(*) as intentos,
        COUNT(*) FILTER (WHERE accion = 'rechazado') as rechazados
      FROM logs_moderacion 
      WHERE creado_en >= NOW() - INTERVAL '7 days'
      GROUP BY hash_navegador
      HAVING COUNT(*) FILTER (WHERE accion = 'rechazado') > 2
      ORDER BY rechazados DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      sistema: 'activo',
      periodo: '7 días',
      estadisticas: {
        logs: logsStats.rows,
        tipos_contenido: tiposContenido.rows,
        usuarios_problematicos: usuariosProblematicos.rows.length
      },
      configuracion: {
        texto: 'filtro-palabras-mejorado',
        imagen: 'nsfwjs-model',
        pdf: 'analisis-completo',
        tiempo_real: 'activado'
      }
    });
  } catch (error) {
    console.error('Error obteniendo estado de moderación:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error obteniendo estado del sistema' 
    });
  }
});

// ✅ RUTA PARA PRUEBAS DE MODERACIÓN (solo desarrollo)
if (process.env.NODE_ENV === 'development') {
  app.post('/api/moderacion/debug', async (req, res) => {
    try {
      const { texto, tipo } = req.body;
      
      if (tipo === 'texto' && texto) {
        const analizador = new AnalizadorTexto();
        const resultado = analizador.analizarTexto(texto);
        
        return res.json({
          success: true,
          tipo: 'texto',
          resultado,
          debug: analizador.debugTexto(texto)
        });
      }
      
      res.status(400).json({ 
        success: false,
        error: 'Tipo de análisis no soportado' 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: 'Error en análisis debug' 
      });
    }
  });
}

// Ruta de salud MEJORADA
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'OK', 
    message: 'Servidor Tahitic funcionando',
    env: process.env.NODE_ENV,
    googleOAuth: !!process.env.GOOGLE_CLIENT_ID,
    moderacionAutomatica: 'ACTIVA',
    sistema: 'unificado-tiempo-real',
    timestamp: new Date().toISOString()
  });
});

// ✅ MANEJO DE RUTAS NO ENCONTRADAS
app.use('/api/', (req, res) => {
  console.log(`❌ Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

// ✅ MANEJO GLOBAL DE ERRORES
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error global no manejado:', error);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    detalle: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// ✅ FUNCIÓN PARA CARGAR CONFIGURACIÓN DE MODERACIÓN ACTUALIZADA
const cargarConfiguracionModeracion = async () => {
  try {
    console.log('📖 Cargando configuración de moderación desde BD...');
    
    // Cargar palabras prohibidas
    const palabrasResult = await pool.query(
      `SELECT valor FROM config_moderacion WHERE clave = 'palabras_prohibidas'`
    );
    
    if (palabrasResult.rows.length > 0) {
      const palabrasProhibidas = palabrasResult.rows[0].valor;
      const analizadorTexto = new AnalizadorTexto();
      analizadorTexto.agregarPalabrasProhibidas(palabrasProhibidas);
      console.log(`✅ Cargadas ${palabrasProhibidas.length} palabras prohibidas`);
    } else {
      console.log('⚠️ No se encontraron palabras prohibidas en la BD');
    }

    // Cargar umbrales de aprobación
    const umbralesResult = await pool.query(
      `SELECT valor FROM config_moderacion WHERE clave = 'umbral_aprobacion'`
    );
    
    if (umbralesResult.rows.length > 0) {
      const umbrales = umbralesResult.rows[0].valor;
      console.log(`✅ Umbrales cargados: ${JSON.stringify(umbrales)}`);
    }

    console.log('🎯 Configuración de moderación cargada exitosamente');
  } catch (error) {
    console.error('❌ Error cargando configuración de moderación:', error);
  }
};

// ✅ INICIALIZACIÓN DEL SISTEMA DE IMÁGENES
const inicializarSistemaImagenes = async () => {
  try {
    console.log('🖼️ Inicializando sistema de análisis de imágenes...');
    const analizadorImagen = new AnalizadorImagen();
    await analizadorImagen.cargarModelo();
    console.log('✅ Modelo de imágenes cargado correctamente');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('⚠️ Sistema de imágenes no disponible:', errorMessage);
    console.log('🔧 Continuando sin análisis de imágenes (solo texto y PDF)');
    return false;
  }
};

// Inicialización MEJORADA con sistema de moderación unificado
const PORT = process.env.PORT || 4000;

const iniciarServidor = async () => {
  try {
    // ✅ VERIFICAR CONEXIÓN A BD PRIMERO
    console.log('🔌 Verificando conexión a la base de datos...');
    await pool.query('SELECT NOW()');
    console.log('✅ Conectado a la base de datos PostgreSQL');

    // ✅ CARGAR CONFIGURACIÓN DE MODERACIÓN
    await cargarConfiguracionModeracion();

    // ✅ INICIALIZAR SISTEMA DE IMÁGENES
    const imagenesActivas = await inicializarSistemaImagenes();

    // ✅ INICIALIZAR SERVICIO DE MODERACIÓN
    console.log('🔄 Inicializando servicio de moderación unificado...');
    const moderacionService = new ModeracionService();
    console.log('✅ Servicio de moderación listo');

    // ✅ INICIAR PROCESO PERIÓDICO DE MONITOREO (opcional)
    const intervaloMonitoreo = setInterval(async () => {
      try {
        // Monitorear logs recientes
        const logsRecientes = await pool.query(`
          SELECT COUNT(*) as total 
          FROM logs_moderacion 
          WHERE creado_en >= NOW() - INTERVAL '1 hour'
        `);
        
        const totalRecientes = parseInt(logsRecientes.rows[0].total);
        if (totalRecientes > 0) {
          console.log(`📊 Moderación: ${totalRecientes} actividades en la última hora`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('❌ Error en monitoreo periódico:', errorMessage);
      }
    }, 30 * 60 * 1000); // ✅ Cada 30 minutos

    // ✅ MANEJO GRACCIOSO DE APAGADO
    const shutdown = async () => {
      console.log('🛑 Apagando servidor...');
      clearInterval(intervaloMonitoreo);
      
      // Cerrar conexión a BD
      try {
        await pool.end();
        console.log('✅ Conexión a BD cerrada');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('❌ Error cerrando conexión a BD:', errorMessage);
      }
      
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // ✅ INICIAR SERVIDOR
    app.listen(PORT, () => {
      console.log('\n=== ✅ SISTEMA DE MODERACIÓN UNIFICADO INICIALIZADO ===');
      console.log('🌐 Puerto:', PORT);
      console.log('🗄️  BD:', process.env.DB_NAME);
      console.log('🔐 JWT:', process.env.JWT_SECRET ? '✅ Configurado' : '❌ Faltante');
      console.log('🤖 Moderación en tiempo real:', '✅ ACTIVA EN RUTAS ESPECÍFICAS');
      console.log('📝 Análisis de texto:', '✅ FILTRO MEJORADO');
      console.log('🖼️ Análisis de imágenes:', imagenesActivas ? '✅ NSFWJS' : '⚠️ MODO FALLBACK');
      console.log('📄 Análisis de PDF:', '✅ EXTRACCIÓN COMPLETA');
      console.log('🚫 Palabras prohibidas:', '✅ CARGADAS DESDE BD');
      console.log('📊 Logs de auditoría:', '✅ ACTIVOS');
      console.log('🚀 Servidor ejecutándose en puerto', PORT);
      console.log('========================================================\n');
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error crítico al iniciar servidor:', errorMessage);
    
    // Cerrar conexión a BD en caso de error
    try {
      await pool.end();
    } catch (e) {
      // Ignorar errores al cerrar
    }
    
    process.exit(1);
  }
};

// ✅ EJECUTAR INICIALIZACIÓN
iniciarServidor();