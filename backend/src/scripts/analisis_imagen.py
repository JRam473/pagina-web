#!/usr/bin/env python3
import sys
import json
import logging
import os
from PIL import Image
import numpy as np

# Configurar logging básico (sin emojis)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("moderacion_armas.log")]
)
logger = logging.getLogger(__name__)

class CustomJSONEncoder(json.JSONEncoder):
    """Maneja correctamente tipos de numpy"""
    def default(self, obj):
        import numpy as np
        if isinstance(obj, (np.bool_,)):
            return bool(obj)
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        return super().default(obj)

class WeaponDetector:
    def __init__(self):
        self.model = None
        self.processor = None
        self.labels = {}
        self.cargado = False
        self.load_model()

    def load_model(self):
        """Carga un modelo liviano para detección de objetos/armas"""
        try:
            from transformers import AutoImageProcessor, AutoModelForImageClassification
            import torch

            modelo = "microsoft/resnet-50"  # Alternativa ligera y estable
            logger.info(f"Cargando modelo {modelo}...")

            self.processor = AutoImageProcessor.from_pretrained(modelo)
            self.model = AutoModelForImageClassification.from_pretrained(modelo)
            self.model.eval()
            self.labels = self.model.config.id2label
            self.cargado = True
            logger.info("Modelo cargado correctamente.")

        except Exception as e:
            logger.error(f"Error cargando modelo: {e}")
            self.cargado = False

    def analyze_weapons(self, image_path: str):
        """Analiza una imagen y detecta armas (gun, knife, rifle, pistol...)"""
        if not self.cargado:
            return {"armas_detectadas": False, "confianza": 0.0, "error": "Modelo no cargado"}

        try:
            import torch
            image = Image.open(image_path).convert("RGB")
            inputs = self.processor(image, return_tensors="pt")

            with torch.no_grad():
                outputs = self.model(**inputs)
                probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)[0]

            pred_idx = int(torch.argmax(probabilities).item())
            confianza = float(torch.max(probabilities).item())
            clase = self.labels.get(pred_idx, "desconocido").lower()

            # Lista de palabras clave relacionadas con armas
            armas_keywords = ["gun", "pistol", "rifle", "weapon", "knife", "revolver"]

            armas_detectadas = any(p in clase for p in armas_keywords)
            logger.info(f"Predicción principal: {clase} ({confianza:.4f})")

            # Revisar otras clases con confianza significativa
            armas_adicionales = []
            for idx, label in self.labels.items():
                label_lower = label.lower()
                if any(p in label_lower for p in armas_keywords):
                    prob = float(probabilities[int(idx)].item())
                    if prob > 0.25:  # Umbral moderado
                        armas_adicionales.append({"clase": label, "probabilidad": prob})

            if armas_adicionales:
                armas_detectadas = True
                confianza = max(a["probabilidad"] for a in armas_adicionales)

            return {
                "armas_detectadas": bool(armas_detectadas),
                "confianza": float(confianza),
                "clases_detectadas": armas_adicionales or [{"clase": clase, "probabilidad": confianza}],
            }

        except Exception as e:
            logger.error(f"Error analizando imagen: {e}")
            return {"armas_detectadas": False, "confianza": 0.0, "error": str(e)}

def main():
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Uso: analisis_armas.py <imagen>"}))
        sys.exit(1)

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(json.dumps({"error": "Archivo no encontrado", "armas_detectadas": False}))
        sys.exit(1)

    detector = WeaponDetector()
    result = detector.analyze_weapons(image_path)

    # Resultado final
    result_final = {
        "es_apto": not result.get("armas_detectadas", False),
        "analisis_armas": result,
        "puntuacion_riesgo": result.get("confianza", 0.0),
    }

    print(json.dumps(result_final, cls=CustomJSONEncoder))

if __name__ == "__main__":
    main()
