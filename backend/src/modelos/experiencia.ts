// modelos/experiencia.ts
export interface Experiencia {
  id: string;
  url_foto: string;
  descripcion?: string;
  creado_en: Date;
  ruta_almacenamiento: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  
  // ✅ NUEVOS CAMPOS DE MODERACIÓN
  moderado: boolean;
  puntuacion_texto: number;
  puntuacion_imagen: number;
  palabras_prohibidas_encontradas: string[];
  categorias_imagen: any;
  confianza_usuario: number;
  aprobado_automatico: boolean;
  motivo_rechazo?: string;
  procesado_en?: Date;
  
  // Campos existentes
  contador_vistas: number;
  lugar_id?: string;
  ancho_imagen?: number;
  alto_imagen?: number;
  tamaño_archivo?: number;
  tipo_archivo?: string;
  ip_usuario: string;
  hash_navegador: string;
  actualizado_en: Date;
}

export interface ExperienciaRequest {
  descripcion?: string;
  lugarId?: string;
}

export interface ExperienciaConLugar extends Experiencia {
  lugar_nombre?: string;
  lugar_ubicacion?: string;
}

export interface EstadisticasExperiencias {
  por_estado: Array<{
    estado: string;
    cantidad: number;
    total_vistas: number;
  }>;
  total: number;
  total_vistas: number;
}