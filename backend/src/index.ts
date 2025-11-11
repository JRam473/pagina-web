// ✅ ARCHIVO PRINCIPAL SIMPLIFICADO
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import passport from './utils/oauth';
import { middlewareIpNavegador } from './middleware/ipNavegador';

// ✅ SISTEMA ESENCIAL DE MODERACIÓN
import { ModeracionService } from './services/moderacionService';
import { ModeracionImagenService } from './services/moderacionImagenService';
import { AnalizadorTexto } from './utils/analizadorTexto';
import { pool } from './utils/baseDeDatos';

// Rutas existentes
import administradorRoutes from './rutas/administradorRoutes';
import autenticacionRoutes from './rutas/autenticacionRoutes';
import lugarRoutes from './rutas/lugarRoutes';
import experienciaRoutes from './rutas/experienciaRoutes';
import calificacionRoutes from './rutas/calificacionRoutes';
import archivosRoutes from './rutas/archivosRoutes';

// RUTAS DE MODERACIÓN
import moderacionRoutes from './rutas/moderacionRoutes';

const app = express();

// ✅ MIDDLEWARES GLOBALES
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(passport.initialize());
app.use(middlewareIpNavegador);

// ✅ SERVIR ARCHIVOS ESTÁTICOS
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/images', express.static(path.join(__dirname, '../uploads/images')));
app.use('/pdfs', express.static(path.join(__dirname, '../uploads/pdfs')));

// ✅ RUTA DE SALUD BÁSICA
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'OK', 
    message: 'Servidor Tahitic funcionando',
    timestamp: new Date().toISOString()
  });
});

// ✅ RUTAS PÚBLICAS
app.use('/api/auth', autenticacionRoutes);

// ✅ RUTAS DE MODERACIÓN
app.use('/api/moderacion', moderacionRoutes);

// ✅ RUTAS CON MODERACIÓN INTEGRADA
app.use('/api/lugares', lugarRoutes);
app.use('/api/experiencias', experienciaRoutes);
app.use('/api/calificaciones', calificacionRoutes);

// ✅ RUTAS PROTEGIDAS (admin)
app.use('/api/admin', administradorRoutes);
app.use('/api/archivos', archivosRoutes);

// ✅ RUTA DE ESTADO DE MODERACIÓN
app.get('/api/moderacion/estado', async (req, res) => {
  try {
    const logsStats = await pool.query(`
      SELECT 
        accion,
        COUNT(*) as total,
        AVG(LENGTH(contenido_texto)) as avg_longitud_texto
      FROM logs_moderacion 
      WHERE creado_en >= NOW() - INTERVAL '7 days'
      GROUP BY accion
    `);

    const logsImagenesStats = await pool.query(`
      SELECT 
        es_aprobado,
        COUNT(*) as total
      FROM logs_moderacion_imagenes 
      WHERE creado_en >= NOW() - INTERVAL '7 days'
      GROUP BY es_aprobado
    `);

    res.json({
      success: true,
      sistema: 'activo',
      periodo: '7 días',
      estadisticas: {
        texto: {
          logs: logsStats.rows
        },
        imagenes: {
          logs: logsImagenesStats.rows,
          total_analizadas: logsImagenesStats.rows.reduce((acc, row) => acc + parseInt(row.total), 0)
        }
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

// ✅ INICIALIZACIÓN DEL SERVIDOR
const PORT = process.env.PORT || 4000;

const iniciarServidor = async () => {
  try {
    // ✅ VERIFICAR CONEXIÓN A BD
    console.log('🔌 Verificando conexión a la base de datos...');
    await pool.query('SELECT NOW()');
    console.log('✅ Conectado a la base de datos PostgreSQL');

    // ✅ INICIALIZAR SERVICIOS DE MODERACIÓN
    console.log('🔄 Inicializando servicios de moderación...');
    const moderacionService = new ModeracionService();
    const moderacionImagenService = new ModeracionImagenService();
    console.log('✅ Servicios de moderación listos');

    // ✅ MONITOREO PERIÓDICO SIMPLE
    const intervaloMonitoreo = setInterval(async () => {
      try {
        const logsTextoRecientes = await pool.query(`
          SELECT COUNT(*) as total 
          FROM logs_moderacion 
          WHERE creado_en >= NOW() - INTERVAL '1 hour'
        `);
        
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
        console.error('❌ Error en monitoreo periódico:', error);
      }
    }, 30 * 60 * 1000); // Cada 30 minutos

    // ✅ MANEJO GRACCIOSO DE APAGADO
    const shutdown = async () => {
      console.log('🛑 Apagando servidor...');
      clearInterval(intervaloMonitoreo);
      
      try {
        await pool.end();
        console.log('✅ Conexión a BD cerrada');
      } catch (error) {
        console.error('❌ Error cerrando conexión a BD:', error);
      }
      
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // ✅ INICIAR SERVIDOR
    app.listen(PORT, () => {
      console.log('\n=== ✅ SISTEMA DE MODERACIÓN INICIALIZADO ===');
      console.log('🌐 Puerto:', PORT);
      console.log('🗄️  BD:', process.env.DB_NAME);
      console.log('🔐 JWT:', process.env.JWT_SECRET ? '✅ Configurado' : '❌ Faltante');
      console.log('📝 Análisis de texto:', '✅ ACTIVO');
      console.log('🖼️ Análisis de imágenes:', '✅ ACTIVO');
      console.log('🚀 Servidor ejecutándose en puerto', PORT);
      console.log('============================================\n');
    });

  } catch (error) {
    console.error('❌ Error crítico al iniciar servidor:', error);
    
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