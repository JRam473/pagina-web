// utils/moderacionTexto.ts (FILTRO PERSONALIZADO)
class FiltroPalabras {
  private palabrasProhibidas: Set<string>;

  constructor() {
    // Lista de palabras prohibidas (puedes expandir esta lista)
    this.palabrasProhibidas = new Set([
      'spam', 'publicidad', 'comprar', 'vender', 'oferta', 'promoción',
      'marketing', 'seguidores', 'visitas', 'click', 'ganardinero',
      'comercial', 'anuncio', 'publicitario', 'promocionar', 'venta',
      'compra', 'descuento', 'gratis', 'barato', 'ofertón', 'liquidación'
    ]);
  }

  /**
   * Escanear texto en busca de palabras prohibidas
   */
  scan(texto: string): string[] {
    if (!texto) return [];
    
    const palabrasEncontradas: string[] = [];
    const palabras = texto.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remover puntuación
      .split(/\s+/)
      .filter(palabra => palabra.length > 2); // Ignorar palabras muy cortas

    for (const palabra of palabras) {
      if (this.palabrasProhibidas.has(palabra)) {
        palabrasEncontradas.push(palabra);
      }
    }

    return [...new Set(palabrasEncontradas)]; // Eliminar duplicados
  }

  /**
   * Censurar palabras prohibidas
   */
  censor(texto: string): string {
    const palabras = texto.split(/\s+/);
    
    return palabras.map(palabra => {
      const palabraLimpia = palabra.toLowerCase().replace(/[^\w]/g, '');
      if (this.palabrasProhibidas.has(palabraLimpia) && palabraLimpia.length > 2) {
        return '*'.repeat(palabra.length);
      }
      return palabra;
    }).join(' ');
  }

  /**
   * Agregar palabras personalizadas al filtro
   */
  addWords(palabras: string[]): void {
    palabras.forEach(palabra => {
      this.palabrasProhibidas.add(palabra.toLowerCase());
    });
  }
}

// Instancia global del filtro
const filtroPalabras = new FiltroPalabras();

export class ModeradorTexto {
  static analizarTexto(texto: string): {
    puntuacion: number;
    esAprobado: boolean;
    palabrasProhibidas: string[];
    razon?: string;
  } {
    if (!texto?.trim()) {
      return {
        puntuacion: 0,
        esAprobado: false,
        palabrasProhibidas: [],
        razon: 'Texto vacío'
      };
    }

    console.log(`📝 Analizando texto: "${texto.substring(0, 50)}..."`);

    // Verificar palabras prohibidas
    const palabrasProhibidas: string[] = filtroPalabras.scan(texto);
    console.log(`🔍 Palabras prohibidas encontradas: ${palabrasProhibidas.length}`, palabrasProhibidas);
    
    // Calcular puntuación basada en múltiples factores
    const longitudPuntuacion = Math.min(texto.length / 50, 1.0);
    const palabrasProhibidasPuntuacion = Math.max(0, 1 - (palabrasProhibidas.length * 0.3));
    
    const palabras = texto.toLowerCase().split(/\s+/);
    const diversidadPuntuacion = new Set(palabras).size / Math.max(palabras.length, 1);

    const puntuacionTotal = (
      longitudPuntuacion * 0.4 +
      palabrasProhibidasPuntuacion * 0.4 + 
      diversidadPuntuacion * 0.2
    );

    const puntuacionFinal = Math.round(puntuacionTotal * 100) / 100;
    const esAprobado = puntuacionFinal >= 0.7 && palabrasProhibidas.length === 0;

    console.log(`📊 Puntuación texto: ${puntuacionFinal}, Aprobado: ${esAprobado}`);

    // Construir resultado
    if (palabrasProhibidas.length > 0) {
      return {
        puntuacion: puntuacionFinal,
        esAprobado,
        palabrasProhibidas,
        razon: `Contiene palabras no permitidas: ${palabrasProhibidas.join(', ')}`
      };
    } else {
      return {
        puntuacion: puntuacionFinal,
        esAprobado,
        palabrasProhibidas
      };
    }
  }

  static limpiarTexto(texto: string): string {
    return filtroPalabras.censor(texto);
  }

  /**
   * Método para agregar palabras personalizadas al filtro
   */
  static agregarPalabrasProhibidas(palabras: string[]): void {
    filtroPalabras.addWords(palabras);
  }
}