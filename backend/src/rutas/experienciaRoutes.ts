// ✅ rutas/experienciaRoutes.ts (VERSIÓN CORREGIDA)
import { Router } from 'express';
import { experienciaController } from '../controladores/experienciaController';
import { uploadExperienciaMiddleware } from '../utils/multerExperiencias';
import { moderacionEnTiempoReal } from '../middleware/moderacionEnTiempoReal';

const router = Router();

// ✅ RUTAS PÚBLICAS (SIN MODERACIÓN)
router.get('/', experienciaController.obtenerExperiencias);
router.get('/:id', experienciaController.obtenerExperienciaPorId);
router.post('/:id/vista', experienciaController.registrarVista);
router.get('/usuario/mis-experiencias', experienciaController.obtenerMisExperiencias);

// ✅ RUTAS QUE CREAN CONTENIDO (CON MODERACIÓN)
router.post('/',  // ✅ CAMBIAR de '/subir' a '/'
  uploadExperienciaMiddleware, // Multer primero
  moderacionEnTiempoReal,      // Luego moderación
  experienciaController.crearExperiencia // Finalmente el controlador
);

// Para edición (con moderación)
router.put('/:id',  // ✅ CAMBIAR de '/:id/editar' a '/:id'
  moderacionEnTiempoReal,
  experienciaController.editarExperiencia
);

router.delete('/:id', experienciaController.eliminarExperiencia); // ✅ CAMBIAR ruta

// Rutas protegidas (admin only)
router.get('/admin/estadisticas', experienciaController.obtenerEstadisticas);

export default router;