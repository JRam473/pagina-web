#!/usr/bin/env python3
import sys
import json
import logging
from PIL import Image
import numpy as np

# Configurar logging SIN EMOJIS para evitar errores de encoding
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('moderacion_imagen.log')
    ]
)
logger = logging.getLogger(__name__)

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.bool_, np.bool8)):
            return bool(obj)
        elif isinstance(obj, (np.integer, np.int8, np.int16, np.int32, np.int64)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float16, np.float32, np.float64)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, np.str_):
            return str(obj)
        return super().default(obj)

class ImageModerator:
    def __init__(self):
        self.models = {}
        self.models_cargados = False
        self.load_models()
    
    def load_models(self):
        """Cargar múltiples modelos especializados"""
        try:
            logger.info("Cargando modelos especializados para moderacion...")
            
            try:
                from transformers import AutoImageProcessor, AutoModelForImageClassification
                import torch
            except ImportError as e:
                logger.error(f"Error importando dependencias: {e}")
                self.models_cargados = False
                return
            
            # MODELOS ESPECIALIZADOS PARA DIFERENTES TIPOS DE CONTENIDO
            modelos_config = [
                {
                    'nombre': 'microsoft/resnet-50',
                    'tipo': 'general',
                    'clases_peligrosas': ['assault_rifle', 'revolver', 'switchblade', 'knife']
                },
                {
                    'nombre': 'Falconsai/nsfw_image_detection', 
                    'tipo': 'nsfw',
                    'clases_peligrosas': ['nsfw']
                },
                {
                    'nombre': 'dima806/deepfake_vs_real_image_detection',
                    'tipo': 'manipulacion',
                    'clases_peligrosas': ['deepfake']
                }
            ]
            
            modelos_cargados = 0
            for config in modelos_config:
                try:
                    logger.info(f"Cargando modelo: {config['nombre']}")
                    
                    processor = AutoImageProcessor.from_pretrained(
                        config['nombre'],
                        local_files_only=False
                    )
                    
                    model = AutoModelForImageClassification.from_pretrained(
                        config['nombre'], 
                        local_files_only=False
                    )
                    
                    model.eval()
                    
                    self.models[config['nombre']] = {
                        'model': model,
                        'processor': processor,
                        'tipo': config['tipo'],
                        'clases_peligrosas': config['clases_peligrosas']
                    }
                    
                    modelos_cargados += 1
                    logger.info(f"Modelo cargado: {config['nombre']}")
                    
                except Exception as e:
                    logger.warning(f"No se pudo cargar {config['nombre']}: {e}")
                    continue
            
            self.models_cargados = modelos_cargados > 0
            logger.info(f"Modelos cargados exitosamente: {modelos_cargados}")
            
        except Exception as e:
            logger.error(f"Error critico cargando modelos: {e}")
            self.models_cargados = False
    
    def analizar_con_modelo(self, image, modelo_info):
        """Analizar imagen con un modelo específico"""
        try:
            import torch
            
            processor = modelo_info['processor']
            model = modelo_info['model']
            tipo = modelo_info['tipo']
            
            # Preprocesar imagen
            inputs = processor(image, return_tensors="pt")
            
            # Realizar predicción
            with torch.no_grad():
                outputs = model(**inputs)
            
            # Obtener probabilidades
            probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)[0]
            
            resultado = {
                'tipo': tipo,
                'probabilidades': probabilities.tolist(),
                'clase_principal': int(torch.argmax(probabilities).item()),
                'confianza_principal': float(torch.max(probabilities).item())
            }
            
            # Obtener etiquetas si están disponibles
            if hasattr(model.config, 'id2label'):
                resultado['etiquetas'] = model.config.id2label
                clase_nombre = model.config.id2label.get(resultado['clase_principal'], 'desconocido')
                resultado['nombre_clase_principal'] = clase_nombre
                
                # Buscar clases peligrosas
                clases_peligrosas = modelo_info['clases_peligrosas']
                probabilidad_peligrosa = 0.0
                
                for idx, label in model.config.id2label.items():
                    label_lower = label.lower()
                    if any(peligro in label_lower for peligro in clases_peligrosas):
                        prob = float(probabilities[int(idx)].item())
                        probabilidad_peligrosa = max(probabilidad_peligrosa, prob)
                        logger.info(f"Clase peligrosa detectada: {label} = {prob:.4f}")
                
                resultado['probabilidad_peligrosa'] = probabilidad_peligrosa
            
            return resultado
            
        except Exception as e:
            logger.error(f"Error analizando con modelo {modelo_info.get('nombre', 'desconocido')}: {e}")
            return None
    
    def analyze_violence(self, image_path):
        """Analizar imagen con múltiples modelos"""
        try:
            if not self.models_cargados:
                logger.warning("Modelos no cargados, rechazando por seguridad")
                return {
                    'es_violento': True,
                    'probabilidad_violencia': 0.8,
                    'probabilidad_no_violencia': 0.2,
                    'error': 'Modelos no disponibles - Rechazado por seguridad'
                }
            
            import os
            if not os.path.exists(image_path):
                return {
                    'es_violento': True,
                    'probabilidad_violencia': 1.0,
                    'probabilidad_no_violencia': 0.0,
                    'error': 'Archivo no encontrado'
                }
            
            # Abrir imagen
            image = Image.open(image_path).convert('RGB')
            
            # Analizar características
            caracteristicas = self.analyze_image_characteristics(image)
            logger.info(f"Caracteristicas de la imagen: {caracteristicas}")
            
            # Ejecutar análisis con todos los modelos
            resultados_modelos = []
            probabilidad_total_peligrosa = 0.0
            modelos_usados = 0
            
            for nombre_modelo, modelo_info in self.models.items():
                resultado = self.analizar_con_modelo(image, modelo_info)
                if resultado:
                    resultados_modelos.append(resultado)
                    
                    # Acumular probabilidad peligrosa
                    prob_peligrosa = resultado.get('probabilidad_peligrosa', 0.0)
                    if prob_peligrosa > 0:
                        probabilidad_total_peligrosa += prob_peligrosa
                        modelos_usados += 1
            
            # Calcular probabilidad promedio de peligro
            if modelos_usados > 0:
                probabilidad_promedio_peligrosa = probabilidad_total_peligrosa / modelos_usados
            else:
                probabilidad_promedio_peligrosa = 0.0
            
            # UMBRALES ESTRICTOS para contenido peligroso
            umbral_peligro = 0.3  # Muy sensible - 30% de probabilidad es suficiente para rechazar
            
            # Si cualquier modelo detecta alto peligro, rechazar inmediatamente
            peligro_alto = any(
                r.get('probabilidad_peligrosa', 0) > 0.7 for r in resultados_modelos
            )
            
            # Si la probabilidad promedio es significativa, rechazar
            peligro_moderado = probabilidad_promedio_peligrosa > umbral_peligro
            
            es_peligroso = peligro_alto or peligro_moderado
            
            # REGLAS ESPECIALES DE SEGURIDAD
            # Si es un paisaje claro, ser un poco más permisivo pero no demasiado
            if caracteristicas['es_paisaje']:
                if probabilidad_promedio_peligrosa < 0.5:  # Aún así rechazar si >50%
                    es_peligroso = False
                    logger.info("Paisaje detectado - criterio mas permisivo aplicado")
                else:
                    logger.info("Paisaje con alta probabilidad de peligro - rechazando")
            
            logger.info(f"Analisis completo - Peligroso: {es_peligroso}, Probabilidad: {probabilidad_promedio_peligrosa:.4f}")
            
            return {
                'es_violento': bool(es_peligroso),
                'probabilidad_violencia': float(probabilidad_promedio_peligrosa),
                'probabilidad_no_violencia': float(1.0 - probabilidad_promedio_peligrosa),
                'umbral': float(umbral_peligro),
                'caracteristicas': caracteristicas,
                'modelos_utilizados': [r['tipo'] for r in resultados_modelos],
                'detalles_modelos': resultados_modelos
            }
            
        except Exception as e:
            logger.error(f"Error en analisis de violencia: {e}")
            # En error, RECHAZAR por seguridad
            return {
                'es_violento': True,
                'probabilidad_violencia': 0.9,
                'probabilidad_no_violencia': 0.1,
                'error': f'Error en analisis: {str(e)} - Rechazado por seguridad'
            }
    
    def analyze_image_characteristics(self, image):
        """Analizar características básicas de la imagen"""
        try:
            width, height = image.size
            aspect_ratio = width / height
            
            img_array = np.array(image)
            color_variance = np.var(img_array, axis=(0, 1))
            avg_color_variance = float(np.mean(color_variance))
            
            # Detección conservadora de paisajes
            es_paisaje = bool(
                (aspect_ratio >= 1.3 and aspect_ratio <= 2.3) and
                (avg_color_variance > 500) and
                (width >= 600 and height >= 400)
            )
            
            # Detección de retratos
            es_retrato = bool(
                (aspect_ratio >= 0.4 and aspect_ratio <= 0.9) and
                (height > width)
            )
            
            return {
                'es_paisaje': es_paisaje,
                'es_retrato': es_retrato,
                'ancho': int(width),
                'alto': int(height),
                'relacion_aspecto': float(aspect_ratio),
                'variacion_color': float(avg_color_variance)
            }
            
        except Exception as e:
            logger.error(f"Error analizando caracteristicas: {e}")
            return {'es_paisaje': False, 'es_retrato': False}
    
    def analyze_weapons(self, image_path):
        """Detección básica de armas"""
        try:
            # Usar el modelo ResNet para detección de objetos peligrosos
            if 'microsoft/resnet-50' in self.models:
                image = Image.open(image_path).convert('RGB')
                modelo_info = self.models['microsoft/resnet-50']
                resultado = self.analizar_con_modelo(image, modelo_info)
                
                if resultado and 'nombre_clase_principal' in resultado:
                    clase_principal = resultado['nombre_clase_principal'].lower()
                    armas_keywords = ['gun', 'rifle', 'pistol', 'knife', 'weapon', 'revolver']
                    
                    tiene_arma = any(arma in clase_principal for arma in armas_keywords)
                    confianza = resultado['confianza_principal'] if tiene_arma else 0.0
                    
                    return {
                        'armas_detectadas': bool(tiene_arma),
                        'confianza': float(confianza),
                        'clase_detectada': clase_principal
                    }
            
            return {
                'armas_detectadas': False,
                'confianza': 0.0,
                'nota': 'Analisis de armas basico completado'
            }
            
        except Exception as e:
            logger.error(f"Error analizando armas: {e}")
            return {
                'armas_detectadas': False,
                'confianza': 0.0,
                'error': str(e)
            }

def main():
    if len(sys.argv) != 2:
        error_result = {
            'error': 'Se requiere exactamente un argumento: path de imagen',
            'es_apto': False,
            'puntuacion_riesgo': 1.0
        }
        print(json.dumps(error_result, cls=CustomJSONEncoder))
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    import os
    if not os.path.isabs(image_path):
        base_dirs = [
            os.getcwd(),
            os.path.dirname(__file__),
            os.path.join(os.path.dirname(__file__), '..', '..'),
        ]
        
        for base_dir in base_dirs:
            possible_path = os.path.join(base_dir, image_path)
            if os.path.exists(possible_path):
                image_path = possible_path
                logger.info(f"Imagen encontrada en: {image_path}")
                break
        else:
            error_result = {
                'es_apto': False,
                'analisis_violencia': {'error': f'Archivo no encontrado: {sys.argv[1]}'},
                'analisis_armas': {'error': 'Imagen no disponible'},
                'puntuacion_riesgo': 1.0
            }
            print(json.dumps(error_result, cls=CustomJSONEncoder))
            return
    
    if not os.path.exists(image_path):
        error_result = {
            'es_apto': False,
            'analisis_violencia': {'error': f'Archivo no existe: {image_path}'},
            'analisis_armas': {'error': 'Imagen no disponible'},
            'puntuacion_riesgo': 1.0
        }
        print(json.dumps(error_result, cls=CustomJSONEncoder))
        return
    
    logger.info(f"Iniciando analisis de imagen: {image_path}")
    
    try:
        moderator = ImageModerator()
        
        logger.info("Analizando contenido peligroso...")
        violence_result = moderator.analyze_violence(image_path)
        
        logger.info("Analizando deteccion de armas...")
        weapons_result = moderator.analyze_weapons(image_path)
        
        # CRITERIO MUY ESTRICTO
        es_violento = violence_result.get('es_violento', True)  # Por defecto True para seguridad
        tiene_armas = weapons_result.get('armas_detectadas', False)
        prob_violencia = violence_result.get('probabilidad_violencia', 1.0)
        
        # RECHAZAR SI:
        # 1. Es violento O
        # 2. Tiene armas O  
        # 3. Probabilidad > 30% O
        # 4. Hay algún error en el análisis
        es_apto = not (es_violento or tiene_armas or prob_violencia > 0.3)
        
        # EXCEPCIÓN: solo paisajes muy claros con probabilidad muy baja
        if (violence_result.get('caracteristicas', {}).get('es_paisaje', False) and 
            prob_violencia < 0.2):
            es_apto = True
            logger.info("Paisaje muy claro con baja probabilidad - aprobado")
        
        puntuacion_riesgo = prob_violencia
        
        resultado_final = {
            'es_apto': bool(es_apto),
            'analisis_violencia': violence_result,
            'analisis_armas': weapons_result,
            'puntuacion_riesgo': float(puntuacion_riesgo)
        }
        
        logger.info(f"Analisis completado: Apto={es_apto}, Riesgo={puntuacion_riesgo:.3f}")
        print(json.dumps(resultado_final, cls=CustomJSONEncoder))
        
    except Exception as e:
        logger.error(f"Error critico en analisis: {e}")
        # En error, RECHAZAR por seguridad absoluta
        error_result = {
            'error': str(e),
            'es_apto': False,  # Rechazar por defecto en caso de error
            'puntuacion_riesgo': 1.0
        }
        print(json.dumps(error_result, cls=CustomJSONEncoder))
        sys.exit(1)

if __name__ == "__main__":
    main()