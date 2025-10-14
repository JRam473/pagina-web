// ✅ ESTO DEBE SER LO PRIMERO EN EL ARCHIVO
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import passport from './utils/oauth';
import { middlewareIpNavegador } from './middleware/ipNavegador';

// ✅ NUEVOS IMPORTS PARA MODERACIÓN AUTOMÁTICA
import { ModeradorImagen } from './utils/moderacionImagen';
import { ModeracionService } from './services/moderacionService';
import { ModeradorTexto } from './utils/moderacionTexto'; // ✅ FALTABA ESTE IMPORT
import { pool } from './utils/baseDeDatos'; // ✅ IMPORT DIRECTA MEJOR

// Rutas
import administradorRoutes from './rutas/administradorRoutes';
import autenticacionRoutes from './rutas/autenticacionRoutes';
import lugarRoutes from './rutas/lugarRoutes';
import experienciaRoutes from './rutas/experienciaRoutes';
import calificacionRoutes from './rutas/calificacionRoutes';
import archivosRoutes from './rutas/archivosRoutes';
import { DebugModeracion } from './utils/debugModeracion';

const app = express();

// ✅ MIDDLEWARES GLOBALES ACTUALIZADOS
app.use(cors());
app.use(express.json({ limit: '50mb' })); // ✅ Aumentar límite para imágenes
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // ✅ AGREGAR ESTO
app.use(passport.initialize());
app.use(middlewareIpNavegador);

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/images', express.static(path.join(__dirname, '../uploads/images')));
app.use('/pdfs', express.static(path.join(__dirname, '../uploads/pdfs')));

// Rutas públicas
app.use('/api/auth', autenticacionRoutes);
app.use('/api/lugares', lugarRoutes);
app.use('/api/experiencias', experienciaRoutes);
app.use('/api/calificaciones', calificacionRoutes);

// Rutas protegidas (admin)
app.use('/api/admin', administradorRoutes);
app.use('/api/archivos', archivosRoutes);

// ✅ RUTA DE MONITOREO DE MODERACIÓN (opcional, para debugging)
app.get('/api/moderacion/estado', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        estado,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE moderado = true) as moderadas,
        COUNT(*) FILTER (WHERE aprobado_automatico = true) as aprobadas_auto,
        AVG(puntuacion_texto) as avg_texto,
        AVG(puntuacion_imagen) as avg_imagen
      FROM experiencias 
      GROUP BY estado
    `);

    const pendientes = await pool.query(`
      SELECT COUNT(*) as count 
      FROM experiencias 
      WHERE moderado = false AND estado = 'pendiente'
    `);

    res.json({
      estadisticas: stats.rows,
      pendientes_por_moderar: parseInt(pendientes.rows[0].count),
      sistema_moderacion: 'activo'
    });
  } catch (error) {
    console.error('Error obteniendo estado de moderación:', error);
    res.status(500).json({ error: 'Error obteniendo estado del sistema' });
  }
});

// Ruta de salud MEJORADA
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor Tahitic funcionando',
    env: process.env.NODE_ENV,
    googleOAuth: !!process.env.GOOGLE_CLIENT_ID,
    moderacionAutomatica: 'ACTIVA',
    timestamp: new Date().toISOString()
  });
});

// ✅ FUNCIÓN PARA CARGAR CONFIGURACIÓN DE MODERACIÓN
const cargarConfiguracionModeracion = async () => {
  try {
    console.log('📖 Cargando configuración de moderación desde BD...');
    
    // Cargar palabras prohibidas
    const palabrasResult = await pool.query(
      `SELECT valor FROM config_moderacion WHERE clave = 'palabras_prohibidas'`
    );
    
    if (palabrasResult.rows.length > 0) {
      const palabrasProhibidas = palabrasResult.rows[0].valor;
      ModeradorTexto.agregarPalabrasProhibidas(palabrasProhibidas);
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

// Inicialización MEJORADA con sistema de moderación
const PORT = process.env.PORT || 4000;

const iniciarServidor = async () => {
  try {
    // ✅ VERIFICAR CONEXIÓN A BD PRIMERO
    console.log('🔌 Verificando conexión a la base de datos...');
    await pool.query('SELECT NOW()');
    console.log('✅ Conectado a la base de datos PostgreSQL');

    // ✅ CARGAR CONFIGURACIÓN DE MODERACIÓN
    await cargarConfiguracionModeracion();

    // ✅ INICIALIZAR SISTEMA DE MODERACIÓN AUTOMÁTICA
    console.log('🔄 Inicializando sistema de moderación automática...');
    
    // Inicializar modelo de IA para imágenes (manejar error sin bloquear servidor)
    ModeradorImagen.inicializarModelo()
      .then(() => {
        console.log('✅ Modelo de moderación de imágenes inicializado');
      })
      .catch(error => {
        console.warn('⚠️ Modelo de imágenes no disponible, usando modo fallback:', error.message);
      });

    // ✅ INICIAR PROCESO PERIÓDICO DE MODERACIÓN
    const intervaloModeracion = setInterval(async () => {
      try {
        const resultado = await ModeracionService.procesarPendientes();
        if (resultado.procesadas > 0) {
          console.log(`🔄 Moderación automática: ${resultado.procesadas} procesadas, ${resultado.aprobadas} aprobadas`);
        }
      } catch (error) {
        console.error('❌ Error en proceso de moderación periódica:', error);
      }
    }, 2 * 60 * 1000); // ✅ Cada 2 minutos

    // ✅ PROCESAR PENDIENTES EXISTENTES AL INICIAR
    setTimeout(async () => {
      try {
        console.log('🎯 Ejecutando moderación inicial de experiencias pendientes...');
        const resultadoInicial = await ModeracionService.procesarPendientes();
        if (resultadoInicial.procesadas > 0) {
          console.log(`🎯 Moderación inicial: ${resultadoInicial.procesadas} experiencias pendientes procesadas, ${resultadoInicial.aprobadas} aprobadas`);
        } else {
          console.log('✅ No hay experiencias pendientes por moderar');
        }
      } catch (error) {
        console.error('❌ Error en moderación inicial:', error);
      }
    }, 3000); // ✅ Esperar 3 segundos después del inicio

    // ✅ MANEJO GRACCIOSO DE APAGADO
    const shutdown = async () => {
      console.log('🛑 Apagando servidor...');
      clearInterval(intervaloModeracion);
      
      // Cerrar conexión a BD
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
      console.log('\n=== ✅ SISTEMA INICIALIZADO ===');
      console.log('🌐 Puerto:', PORT);
      console.log('🗄️  BD:', process.env.DB_NAME);
      console.log('🔐 JWT:', process.env.JWT_SECRET ? '✅ Configurado' : '❌ Faltante');
      console.log('📧 Admin:', process.env.ADMIN_EMAIL);
      console.log('🔑 Google Client ID:', process.env.GOOGLE_CLIENT_ID ? '✅' : '❌ Faltante');
      console.log('🤖 Moderación automática:', '✅ ACTIVA');
      console.log('🔄 Proceso periódico:', '✅ CADA 2 MINUTOS');
      console.log('📖 Palabras prohibidas:', '✅ CARGADAS DESDE BD');
      console.log('🚀 Servidor ejecutándose en puerto', PORT);
      console.log('================================\n');
    });

  } catch (error) {
    console.error('❌ Error crítico al iniciar servidor:', error);
    
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