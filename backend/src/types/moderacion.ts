// backend/src/types/moderacion.ts
export interface ResultadoModeracion {
  esAprobado: boolean;
  puntuacionGeneral: number;
  motivoRechazo?: string | undefined;  // Permitir explícitamente undefined
  detalles: {
    texto?: AnalisisTexto | undefined;
    imagen?: AnalisisImagen | undefined;
    pdf?: AnalisisPDF | undefined;
  };
}

export interface AnalisisImagen {
  esAprobado: boolean;
  puntuacion: number;
  contenidoPeligroso: boolean;
  categorias: Array<{
    clase: string;
    probabilidad: number;
  }>;
  detalles: {
    probabilidadPeligrosa: number;
    categoriaPeligrosa: string | null;
    categoriaPrincipal: string;
    error?: string | undefined;  // Permitir explícitamente undefined
  };
}

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
    tienePatronesSpam?: boolean | undefined;
  };
}

export interface AnalisisPDF {
  esAprobado: boolean;
  puntuacion: number;
  textoExtraido: string;
  imagenesAnalizadas: number;
  imagenesPeligrosas: number;
  paginas: number;
  detalles: {
    analisisTexto?: AnalisisTexto | undefined;  // Permitir explícitamente undefined
    errores?: string[] | undefined;             // Permitir explícitamente undefined
    tieneImagenes: boolean;
  };
}