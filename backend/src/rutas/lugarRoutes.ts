// rutas/lugarRoutes.ts - VERSIÓN COMPLETA CON TODAS LAS RUTAS DE MODERACIÓN
import { Router } from 'express';
import { lugarController } from '../controladores/lugarController';
import { autenticarAdmin } from '../middleware/autenticacion';
import { validacion } from '../middleware/validacion';
import { uploadImage, uploadPDF, uploadMultipleImages } from '../utils/multerConfig';

const router = Router();

// ==================== RUTAS PÚBLICAS ====================
router.get('/', lugarController.obtenerLugares);
router.get('/categorias', lugarController.obtenerCategorias);
router.get('/:id', lugarController.obtenerLugarPorId);
router.get('/:id/galeria', lugarController.obtenerGaleriaLugar);

// ==================== RUTAS DE MODERACIÓN (PÚBLICAS/PROTEGIDAS) ====================
// ✅ EXISTENTES: Moderación general para lugares
router.post('/moderacion/validar-texto', lugarController.validarTextoPrev);
router.get('/moderacion/motivos-rechazo', lugarController.obtenerMotivosRechazo);
router.post('/moderacion/analizar-texto', lugarController.analizarTexto);

// ✅ NUEVAS: Rutas específicas para moderación de descripciones de fotos
router.post('/moderacion/validar-descripcion-foto', 
  // autenticarAdmin, // Opcional: proteger si es necesario
  lugarController.validarDescripcionFotoPrev
);

router.post('/moderacion/analizar-descripcion-foto', 
  // autenticarAdmin, // Opcional: proteger si es necesario
  lugarController.analizarDescripcionFoto
);

// ==================== RUTAS PROTEGIDAS (ADMIN ONLY) ====================
// Crear lugar (admin)
router.post('/', 
  autenticarAdmin, 
  validacion.validarCrearLugar, 
  lugarController.crearLugar
);

// Actualizar lugar (admin)
router.put('/:id', 
  autenticarAdmin, 
  validacion.validarCrearLugar, 
  lugarController.actualizarLugar
);

// Eliminar lugar (admin)
router.delete('/:id', 
  autenticarAdmin, 
  lugarController.eliminarLugar
);

// Subir imagen principal (admin)
router.post('/:id/imagen', 
  autenticarAdmin, 
  uploadImage.single('imagen'),
  validacion.validarArchivoImagen,
  lugarController.subirImagenLugar
);

// Subir múltiples imágenes (admin)
router.post('/:id/imagenes', 
  autenticarAdmin, 
  uploadMultipleImages,
  lugarController.subirMultipleImagenesLugar
);

// Subir PDF (admin)
router.post('/:id/pdf', 
  autenticarAdmin, 
  uploadPDF.single('pdf'),
  validacion.validarArchivoPDF,
  lugarController.subirPDFLugar
);

// Eliminar imagen de galería (admin)
router.delete('/:id/galeria/:imagenId', 
  autenticarAdmin, 
  lugarController.eliminarImagenGaleria
);

// Establecer imagen como principal (admin)
router.put('/:id/galeria/:imagenId/principal', 
  autenticarAdmin, 
  lugarController.establecerImagenPrincipal
);

// ✅ ACTUALIZADA: Actualizar descripción de imagen CON moderación
router.put('/:id/galeria/:imagenId/descripcion', 
  autenticarAdmin, 
  lugarController.actualizarDescripcionImagen
);

// Eliminar imagen principal (con reemplazo)
router.delete('/:id/imagen-principal', 
  autenticarAdmin, 
  lugarController.eliminarImagenPrincipal
);

router.delete('/:id/pdf',
  autenticarAdmin,
  lugarController.eliminarPDFLugar
);

// Reemplazar imagen principal (admin)
router.put('/:id/imagen-principal', 
  autenticarAdmin,
  uploadImage.single('imagen'),
  validacion.validarArchivoImagen,
  lugarController.reemplazarImagenPrincipal
);

export default router;