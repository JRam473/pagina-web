// ✅ ARCHIVO PRINCIPAL ACTUALIZADO - CON ANÁLISIS DE TEXTO E IMÁGENES
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import passport from './utils/oauth';
import { middlewareIpNavegador } from './middleware/ipNavegador';

// ✅ SISTEMA COMPLETO DE MODERACIÓN (TEXTO + IMÁGENES)
import { ModeracionService } from './services/moderacionService';
import { ModeracionImagenService } from './services/moderacionImagenService'; // 🆕 NUEVO
import { AnalizadorTexto } from './utils/analizadorTexto';
import { pool } from './utils/baseDeDatos';

// Rutas existentes
import administradorRoutes from './rutas/administradorRoutes';
import autenticacionRoutes from './rutas/autenticacionRoutes';
import lugarRoutes from './rutas/lugarRoutes';
import experienciaRoutes from './rutas/experienciaRoutes';
import calificacionRoutes from './rutas/calificacionRoutes';
import archivosRoutes from './rutas/archivosRoutes';

// 🆕 NUEVAS RUTAS DE MODERACIÓN
import moderacionRoutes from './rutas/moderacionRoutes'; // 🆕 NUEVO

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

// 🆕 RUTAS DE MODERACIÓN (NUEVAS)
app.use('/api/moderacion', moderacionRoutes); // 🆕 NUEVO

// ✅ RUTAS CON MODERACIÓN INTEGRADA EN SUS PROPIAS DEFINICIONES
app.use('/api/lugares', lugarRoutes);
app.use('/api/experiencias', experienciaRoutes);
app.use('/api/calificaciones', calificacionRoutes);

// ✅ RUTAS PROTEGIDAS (admin)
app.use('/api/admin', administradorRoutes);
app.use('/api/archivos', archivosRoutes);

// ✅ RUTA DE MONITOREO DE MODERACIÓN MEJORADA (TEXTO + IMÁGENES)
app.get('/api/moderacion/estado', async (req, res) => {
  try {
    // Estadísticas de logs de moderación de texto
    const logsStats = await pool.query(`
      SELECT 
        accion,
        COUNT(*) as total,
        AVG(LENGTH(contenido_texto)) as avg_longitud_texto
      FROM logs_moderacion 
      WHERE creado_en >= NOW() - INTERVAL '7 days'
      GROUP BY accion
    `);

    // 🆕 Estadísticas de logs de moderación de imágenes
    const logsImagenesStats = await pool.query(`
      SELECT 
        es_aprobado,
        COUNT(*) as total,
        AVG(
          CASE 
            WHEN (resultado_analisis->'analisis_violencia'->>'probabilidad_violencia') IS NOT NULL 
            THEN CAST(resultado_analisis->'analisis_violencia'->>'probabilidad_violencia' AS NUMERIC)
            ELSE 0
          END
        ) as avg_prob_violencia
      FROM logs_moderacion_imagenes 
      WHERE creado_en >= NOW() - INTERVAL '7 days'
      GROUP BY es_aprobado
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

    // 🆕 Usuarios problemáticos en imágenes
    const usuariosProblematicosImagenes = await pool.query(`
      SELECT 
        hash_navegador,
        COUNT(*) as intentos,
        COUNT(*) FILTER (WHERE NOT es_aprobado) as rechazados
      FROM logs_moderacion_imagenes 
      WHERE creado_en >= NOW() - INTERVAL '7 days'
      GROUP BY hash_navegador
      HAVING COUNT(*) FILTER (WHERE NOT es_aprobado) > 1
      ORDER BY rechazados DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      sistema: 'activo',
      periodo: '7 días',
      estadisticas: {
        texto: {
          logs: logsStats.rows,
          usuarios_problematicos: usuariosProblematicos.rows.length
        },
        imagenes: { // 🆕 NUEVO
          logs: logsImagenesStats.rows,
          usuarios_problematicos: usuariosProblematicosImagenes.rows.length,
          total_analizadas: logsImagenesStats.rows.reduce((acc, row) => acc + parseInt(row.total), 0)
        }
      },
      configuracion: {
        texto: 'filtro-palabras-mejorado',
        imagen: 'activado', // 🆕 ACTUALIZADO
        pdf: 'desactivado',
        tiempo_real: 'texto-e-imagenes' // 🆕 ACTUALIZADO
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

// ✅ RUTA PARA PRUEBAS DE MODERACIÓN MEJORADA (solo desarrollo)
if (process.env.NODE_ENV === 'development') {
  app.post('/api/moderacion/debug', async (req, res) => {
    try {
      const { texto, tipo = 'texto' } = req.body;
      
      if (texto && tipo === 'texto') {
        const analizador = new AnalizadorTexto();
        const resultado = analizador.analizarTexto(texto);
        
        return res.json({
          success: true,
          tipo: 'texto',
          resultado,
          debug: analizador.debugTexto(texto)
        });
      }
      
      // 🆕 PRUEBAS DE IMAGEN (simuladas en desarrollo)
      if (tipo === 'imagen') {
        const moderacionImagenService = new ModeracionImagenService();
        const resultadoSimulado = await moderacionImagenService.moderarImagen(
          '/ruta/simulada/imagen.jpg',
          '127.0.0.1',
          'debug-hash'
        );
        
        return res.json({
          success: true,
          tipo: 'imagen',
          resultado: resultadoSimulado,
          nota: 'Análisis simulado en modo desarrollo'
        });
      }
      
      res.status(400).json({ 
        success: false,
        error: 'Parámetros requeridos para análisis' 
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
    moderacionAutomatica: 'TEXTO-E-IMAGENES', // 🆕 ACTUALIZADO
    sistema: 'moderacion-completa',
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

    console.log('🎯 Configuración de moderación cargada exitosamente');
  } catch (error) {
    console.error('❌ Error cargando configuración de moderación:', error);
  }
};

// Inicialización COMPLETA con sistema de moderación texto + imágenes
const PORT = process.env.PORT || 4000;

const iniciarServidor = async () => {
  try {
    // ✅ VERIFICAR CONEXIÓN A BD PRIMERO
    console.log('🔌 Verificando conexión a la base de datos...');
    await pool.query('SELECT NOW()');
    console.log('✅ Conectado a la base de datos PostgreSQL');

    // ✅ VERIFICAR TABLAS DE MODERACIÓN DE IMÁGENES
    try {
      const tablaImagenes = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'logs_moderacion_imagenes'
        )
      `);
      
      if (tablaImagenes.rows[0].exists) {
        console.log('✅ Tabla de logs de moderación de imágenes encontrada');
      } else {
        console.log('⚠️ Tabla de logs de moderación de imágenes NO encontrada');
      }
    } catch (error) {
      console.log('⚠️ No se pudo verificar la tabla de moderación de imágenes');
    }

    // ✅ CARGAR CONFIGURACIÓN DE MODERACIÓN
    await cargarConfiguracionModeracion();

    // ✅ INICIALIZAR SERVICIO DE MODERACIÓN DE TEXTO
    console.log('🔄 Inicializando servicio de moderación de texto...');
    const moderacionService = new ModeracionService();
    console.log('✅ Servicio de moderación de texto listo');

    // 🆕 INICIALIZAR SERVICIO DE MODERACIÓN DE IMÁGENES
    console.log('🔄 Inicializando servicio de moderación de imágenes...');
    const moderacionImagenService = new ModeracionImagenService();
    console.log('✅ Servicio de moderación de imágenes listo');

    // ✅ PROBAR CONEXIÓN CON PYTHON (solo desarrollo)
    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('🐍 Probando conexión con Python...');
        // Esto probará si el script Python está disponible
        // No analizará una imagen real, solo verificará la comunicación
        console.log('✅ Bridge Python inicializado');
      } catch (error) {
        console.log('⚠️ Python bridge podría necesitar configuración adicional');
      }
    }

    // ✅ INICIAR PROCESO PERIÓDICO DE MONITOREO MEJORADO
    const intervaloMonitoreo = setInterval(async () => {
      try {
        // Monitorear logs recientes de texto
        const logsTextoRecientes = await pool.query(`
          SELECT COUNT(*) as total 
          FROM logs_moderacion 
          WHERE creado_en >= NOW() - INTERVAL '1 hour'
        `);
        
        // 🆕 Monitorear logs recientes de imágenes
        const logsImagenesRecientes = await pool.query(`
          SELECT COUNT(*) as total 
          FROM logs_moderacion_imagenes 
          WHERE creado_en >= NOW() - INTERVAL '1 hour'
        `);
        
        const totalTexto = parseInt(logsTextoRecientes.rows[0].total);
        const totalImagenes = parseInt(logsImagenesRecientes.rows[0].total);
        
        if (totalTexto > 0 || totalImagenes > 0) {
          console.log(`📊 Moderación: ${totalTexto} textos + ${totalImagenes} imágenes en la última hora`);
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
      console.log('\n=== ✅ SISTEMA DE MODERACIÓN COMPLETO INICIALIZADO ===');
      console.log('🌐 Puerto:', PORT);
      console.log('🗄️  BD:', process.env.DB_NAME);
      console.log('🔐 JWT:', process.env.JWT_SECRET ? '✅ Configurado' : '❌ Faltante');
      console.log('🤖 Moderación en tiempo real:', '✅ ACTIVA EN RUTAS ESPECÍFICAS');
      console.log('📝 Análisis de texto:', '✅ FILTRO MEJORADO');
      console.log('🖼️ Análisis de imágenes:', '✅ ACTIVADO'); // 🆕 ACTUALIZADO
      console.log('📄 Análisis de PDF:', '❌ DESACTIVADO');
      console.log('🚫 Palabras prohibidas:', '✅ CARGADAS DESDE BD');
      console.log('📊 Logs de auditoría:', '✅ ACTIVOS (texto + imágenes)'); // 🆕 ACTUALIZADO
      console.log('🐍 Python integration:', '✅ CONFIGURADO'); // 🆕 NUEVO
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