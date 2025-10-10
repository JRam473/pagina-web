// rutas/experienciaRoutes.ts
import { Router } from 'express';
import { experienciaController } from '../controladores/experienciaController';
import { autenticarAdmin } from '../middleware/autenticacion';
import { verificarPropiedadExperiencia } from '../middleware/verificarPropiedadExperiencia';
import { uploadExperienciaMiddleware } from '../utils/multerExperiencias'; // ✅ NUEVO

// rutas/experienciaRoutes.ts
// ... imports anteriores

const router = Router();

// Rutas públicas
router.get('/', experienciaController.obtenerExperiencias);
router.get('/:id', experienciaController.obtenerExperienciaPorId);

// ✅ NUEVAS RUTAS para usuario anónimo
router.post('/subir', uploadExperienciaMiddleware, experienciaController.crearExperiencia);
router.get('/usuario/mis-experiencias', experienciaController.obtenerMisExperiencias);
router.put('/:id/editar', verificarPropiedadExperiencia, experienciaController.editarExperiencia);
router.delete('/:id/eliminar', verificarPropiedadExperiencia, experienciaController.eliminarExperiencia);

// Rutas protegidas (admin only)
router.get('/admin/pendientes', autenticarAdmin, experienciaController.obtenerExperienciasPendientes);
router.get('/admin/estadisticas', autenticarAdmin, experienciaController.obtenerEstadisticas);
router.patch('/:id/moderar', autenticarAdmin, experienciaController.moderarExperiencia);

export default router;