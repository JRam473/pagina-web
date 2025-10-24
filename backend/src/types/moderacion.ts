// backend/src/types/moderacion.ts - VERSIÓN CORREGIDA
export interface AnalisisTexto {
  esAprobado: boolean;
  puntuacion: number;
  palabrasOfensivas: string[];
  razon: string;
  detalles: {
    metodo: string;
    intencion: string;
    calidadTexto: any;
    longitud: number;
    tienePatronesSpam?: boolean;
  };
}

export interface ResultadoModeracion {
  esAprobado: boolean;
  puntuacionGeneral: number;
  motivoRechazo?: string | undefined;
  detalles: {
    texto?: AnalisisTexto | undefined; // ✅ CORREGIDO: ahora es opcional
  };
}