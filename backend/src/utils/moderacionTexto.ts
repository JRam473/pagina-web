// utils/moderacionTexto.ts (VERSIÓN CON DETECCIÓN DE TEXTO SIN SENTIDO)
class FiltroPalabras {
  private palabrasProhibidas: Set<string>;
  private palabrasSospechosas: Set<string>;
  private contextoProhibido: string[];
  private patronesEvasion: RegExp[];
  private diccionarioEspanol: Set<string>;

  constructor() {
    // 🚫 PALABRAS ALTAMENTE PROHIBIDAS (insultos, lenguaje explícito)
    this.palabrasProhibidas = new Set([
      // Español - Insultos y lenguaje ofensivo
      'puta', 'puto', 'putita', 'putazo', 'putona', 'prostituta', 'zorra',
      'perra', 'perro', 'perrito', 'perrón',
      'mierda', 'mierdas', 'cagada', 'cagado',
      'cabron', 'cabrona', 'cabrones', 'imbecil', 'imbécil', 
      'estupido', 'estúpido', 'pendejo', 'pendeja',
      'maricon', 'maricón', 'marica', 'joto',
      'verga', 'vergas', 'pito', 'polla', 'pichula',
      'coño', 'chocha', 'vagina', 'pene', 'falo', 'poronga',
      'malparido', 'malparida', 'hijueputa', 'hijodeputa',
      'gonorrea', 'careverga', 'come mierda', 'culero', 'culera',

      // Inglés
      'fuck', 'shit', 'bitch', 'asshole', 'dick', 'cock', 'cum', 'fag',
      'slut', 'whore', 'retard', 'nazi', 'hitler', 'rapist', 'rape',
    ]);

    // ⚠️ PALABRAS SOSPECHOSAS - SPAM COMERCIAL
    this.palabrasSospechosas = new Set([
      // SPAM COMERCIAL - VENTAS
      'vendo', 'vender', 'venta', 'compro', 'comprar', 'compra',
      'barato', 'barata', 'baratos', 'ofertas', 'oferta', 'descuento',
      'promoción', 'promocion', 'promociones', 'rebaja', 'rebajas',
      'liquidación', 'liquidacion', 'gangas', 'ganga',
      'precio', 'precios', 'económico', 'economico', 'económicos', 'economicos',
      
      // SPAM COMERCIAL - PRODUCTOS/SERVICIOS
      'producto', 'productos', 'artículo', 'articulo', 'mercancía', 'mercancia',
      'servicio', 'servicios', 'negocio', 'empresa', 'empresarial',
      
      // SPAM COMERCIAL - MARKETING
      'anuncio', 'publicidad', 'comercial', 'marketing', 'promocionar',
      'seguidores', 'visitas', 'click', 'clics', 'tráfico', 'trafico',
      'ganar', 'dinero', 'fácil', 'facil', 'ingresos', 'ganancias',
      'trabajo', 'casa', 'empleo', 'salario',
      
      // SPAM DIGITAL
      'cripto', 'bitcoin', 'ethereum', 'inversión', 'inversion',
      'multinivel', 'piramidal', 'estafa', 'fraude',
      'casino', 'apuesta', 'apuestas', 'juego', 'premio',
      
      // CONTEXTO SENSIBLE
      'sexy', 'sensual', 'hot', 'atractiva', 'atractivo',
      'erotico', 'erótico', 'linda', 'guapa', 'hermosa',
      'papito', 'mamacita', 'violencia', 'arma', 'disparo', 'bala',
      'matar', 'suicidio', 'muerte', 'ahorcar', 'morir',
      'droga', 'marihuana', 'cocaína', 'crack', 'heroína', 'dealer',
    ]);

    // 🧾 FRASES COMPLETAS PROHIBIDAS
    this.contextoProhibido = [
      'te voy a matar', 'te odio', 'muérete', 'te cojo', 'te follo',
      'hazme sexo', 'sexo conmigo', 'quieres sexo',
      'link en bio', 'haz clic aquí', 'sigue mi página',
      'compra ahora', 'vendo rápido', 'oferta limitada',
      'gana dinero', 'trabajo desde casa', 'ingresos extras',
      'criptomonedas gratis', 'bitcoin gratis',
      'ganar dinero fácil', 'dinero fácil', 'trabajo desde casa'
    ];

    // 🔍 PATRONES DE EVASIÓN
    this.patronesEvasion = [
      /[0]/g, /[1!]/g, /[3]/g, /[4@]/g, /[5\$]/g, /[7]/g, /[8]/g,
      /[^\p{L}\s]/gu,
    ];

    // 📚 DICCIONARIO BÁSICO DE ESPAÑOL (palabras comunes)
    this.diccionarioEspanol = new Set([
      // Sustantivos comunes
      'hola', 'buenas', 'mirador', 'puente', 'apolateno', 'paisaje', 'naturaleza',
      'experiencia', 'lugar', 'sitio', 'foto', 'imagen', 'fotografía', 'vista',
      'hermoso', 'bonito', 'lindo', 'increíble', 'maravilloso', 'impresionante',
      'gente', 'personas', 'amigos', 'familia', 'viaje', 'vacaciones', 'aventura',
      'día', 'noche', 'tarde', 'mañana', 'tiempo', 'momento', 'recuerdo',
      'agua', 'río', 'mar', 'montaña', 'bosque', 'árbol', 'flor', 'animal',
      'ciudad', 'pueblo', 'campo', 'playa', 'sol', 'luna', 'estrella',
      
      // Verbos comunes
      'es', 'son', 'era', 'fueron', 'está', 'están', 'estaba', 'estaban',
      'tengo', 'tiene', 'tenía', 'tenían', 'puedo', 'puede', 'podía', 'podían',
      'quiero', 'quiere', 'quería', 'querían', 'voy', 'va', 'iba', 'iban',
      'veo', 've', 'veía', 'veían', 'digo', 'dice', 'decía', 'decían',
      'hago', 'hace', 'hacía', 'hacían', 'sé', 'sabe', 'sabía', 'sabían',
      
      // Adjetivos comunes
      'bueno', 'buena', 'buenos', 'buenas', 'malo', 'mala', 'malos', 'malas',
      'grande', 'pequeño', 'pequeña', 'alto', 'alta', 'bajo', 'baja',
      'nuevo', 'nueva', 'viejos', 'viejas', 'joven', 'jóvenes',
      'feliz', 'triste', 'contento', 'contenta', 'enojado', 'enojada',
      'caliente', 'frío', 'fría', 'cálido', 'cálida', 'fresco', 'fresca',
      
      // Artículos, preposiciones, etc.
      'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
      'de', 'en', 'con', 'por', 'para', 'sin', 'sobre', 'bajo',
      'y', 'o', 'pero', 'porque', 'aunque', 'si', 'no',
      'muy', 'mucho', 'mucha', 'poco', 'poca', 'algo', 'nada',
      'aquí', 'allí', 'ahí', 'cerca', 'lejos', 'dentro', 'fuera'
    ]);
  }

  /**
   * Normaliza el texto MANTENIENDO LOS ESPACIOS para poder detectar palabras
   */
  private normalizarTexto(texto: string): string {
    if (!texto) return '';
    
    let limpio = texto
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // sin acentos
      .replace(/[0]/g, 'o').replace(/[1!]/g, 'i')
      .replace(/[3]/g, 'e').replace(/[4@]/g, 'a')
      .replace(/[5\$]/g, 's').replace(/[7]/g, 't')
      .replace(/[8]/g, 'b')
      .replace(/\s+/g, ' ') // normalizar espacios múltiples a uno solo
      .trim();

    // Eliminar símbolos pero MANTENER ESPACIOS
    limpio = limpio.replace(/[^\w\s]/g, '');

    return limpio;
  }

  /**
   * Analiza si el texto tiene sentido (no es solo caracteres aleatorios)
   */
  private analizarCalidadTexto(texto: string): { 
    tieneSentido: boolean; 
    porcentajePalabrasValidas: number;
    razon: string;
  } {
    if (!texto || texto.length < 3) {
      return { tieneSentido: false, porcentajePalabrasValidas: 0, razon: 'Texto muy corto' };
    }

    const palabras = texto.split(/\s+/).filter(p => p.length > 0);
    if (palabras.length === 0) {
      return { tieneSentido: false, porcentajePalabrasValidas: 0, razon: 'Sin palabras válidas' };
    }

    // 1. Contar palabras que existen en el diccionario
    const palabrasValidas = palabras.filter(palabra => 
      this.diccionarioEspanol.has(palabra) || 
      palabra.length >= 4 // Considerar palabras largas como válidas aunque no estén en diccionario
    );

    const porcentajeValidas = palabrasValidas.length / palabras.length;

    // 2. Detectar patrones de texto sin sentido
    const tienePatronRepetitivo = this.detectarPatronRepetitivo(texto);
    const tieneMuchasConsonantesSeguidas = this.detectarConsonantesSeguidas(texto);
    const tienePalabrasMuyCortas = palabras.filter(p => p.length <= 2).length > palabras.length * 0.5;

    let tieneSentido = true;
    let razon = 'Texto con sentido';

    // REGLAS PARA DETECTAR TEXTO SIN SENTIDO
    if (porcentajeValidas < 0.3 && palabras.length > 2) {
      tieneSentido = false;
      razon = `Muy pocas palabras válidas (${Math.round(porcentajeValidas * 100)}%)`;
    }
    else if (tienePatronRepetitivo) {
      tieneSentido = false;
      razon = 'Patrón repetitivo detectado';
    }
    else if (tieneMuchasConsonantesSeguidas && porcentajeValidas < 0.5) {
      tieneSentido = false;
      razon = 'Demasiadas consonantes seguidas';
    }
    else if (tienePalabrasMuyCortas && palabras.length > 3) {
      tieneSentido = false;
      razon = 'Demasiadas palabras muy cortas';
    }

    console.log(`📊 Calidad texto: ${tieneSentido ? '✅ CON SENTIDO' : '❌ SIN SENTIDO'} (${razon})`);
    console.log(`   Palabras: ${palabras.length}, Válidas: ${palabrasValidas.length} (${Math.round(porcentajeValidas * 100)}%)`);

    return {
      tieneSentido,
      porcentajePalabrasValidas: porcentajeValidas,
      razon
    };
  }

  /**
   * Detecta patrones repetitivos como "asdfasdf" o "lklklk"
   */
  private detectarPatronRepetitivo(texto: string): boolean {
    // Patrones comunes de teclado
    const patronesRepetitivos = [
      /(.)\1{3,}/, // Mismo carácter repetido 4+ veces (aaaa)
      /(..)\1{2,}/, // Patrón de 2 caracteres repetido (ababab)
      /(...)\1{2,}/, // Patrón de 3 caracteres repetido (abcabcabc)
      /^[asdfjkl]+$/i, // Solo teclas de la fila central
      /^[qwertyuiop]+$/i, // Solo teclas de la fila superior
      /^[zxcvbnm]+$/i, // Solo teclas de la fila inferior
    ];

    const textoLimpio = texto.replace(/\s/g, '').toLowerCase();
    
    for (const patron of patronesRepetitivos) {
      if (patron.test(textoLimpio)) {
        console.log(`🔄 Patrón repetitivo detectado: ${patron}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Detecta demasiadas consonantes seguidas (indicativo de texto sin sentido)
   */
  private detectarConsonantesSeguidas(texto: string): boolean {
    const textoLimpio = texto.replace(/\s/g, '').toLowerCase();
    const consonantesSeguidas = textoLimpio.match(/[bcdfghjklmnpqrstvwxyz]{5,}/gi);
    
    if (consonantesSeguidas && consonantesSeguidas.length > 0) {
      console.log(`🔤 Demasiadas consonantes seguidas: ${consonantesSeguidas[0]}`);
      return true;
    }
    
    return false;
  }

  /**
   * Escanea un texto buscando contenido prohibido y sin sentido
   */
  scan(texto: string): { 
    palabras: string[], 
    esOfensivo: boolean, 
    esSpam: boolean,
    esSinsentido: boolean,
    calidadTexto: { tieneSentido: boolean; porcentajePalabrasValidas: number; razon: string }
  } {
    if (!texto) return { 
      palabras: [], 
      esOfensivo: false, 
      esSpam: false,
      esSinsentido: true,
      calidadTexto: { tieneSentido: false, porcentajePalabrasValidas: 0, razon: 'Texto vacío' }
    };
    
    const textoLimpio = this.normalizarTexto(texto);
    const palabrasEncontradas: string[] = [];
    let esOfensivo = false;
    let esSpam = false;

    console.log(`🔍 Texto normalizado: "${textoLimpio}"`);

    // 1️⃣ Analizar calidad del texto (¿tiene sentido?)
    const calidadTexto = this.analizarCalidadTexto(textoLimpio);
    const esSinsentido = !calidadTexto.tieneSentido;

    // 2️⃣ Verificar frases prohibidas completas
    for (const frase of this.contextoProhibido) {
      const fraseNormalizada = this.normalizarTexto(frase);
      if (textoLimpio.includes(fraseNormalizada) || texto.toLowerCase().includes(frase)) {
        palabrasEncontradas.push(`[frase: ${frase}]`);
        esSpam = true;
        console.log(`🚨 Frase prohibida detectada: "${frase}"`);
      }
    }

    // 3️⃣ Verificar palabras individuales
    const palabras = textoLimpio.split(/\s+/).filter(p => p.length > 2);
    
    console.log(`🔍 Palabras separadas:`, palabras);

    for (const palabra of palabras) {
      const palabraLimpia = palabra.trim();
      
      // Palabras prohibidas (ofensivas)
      if (this.palabrasProhibidas.has(palabraLimpia)) {
        palabrasEncontradas.push(palabraLimpia);
        esOfensivo = true;
        console.log(`🚨 Palabra ofensiva detectada: "${palabraLimpia}"`);
      }
      // Palabras sospechosas (spam comercial)
      else if (this.palabrasSospechosas.has(palabraLimpia)) {
        palabrasEncontradas.push(`(spam: ${palabraLimpia})`);
        esSpam = true;
        console.log(`🚨 Palabra spam detectada: "${palabraLimpia}"`);
      }
    }

    // 4️⃣ Detectar patrones de spam comercial
    const tieneVenta = palabras.some(p => ['vendo', 'compro', 'venta'].includes(p));
    const tienePrecio = palabras.some(p => ['barato', 'oferta', 'descuento', 'económico', 'economico'].includes(p));
    const tieneDinero = palabras.some(p => ['ganar', 'dinero', 'ingresos', 'ganancias'].includes(p));
    const tieneTrabajo = palabras.some(p => ['trabajo', 'empleo', 'casa'].includes(p));

    if ((tieneVenta && tienePrecio) || (tieneDinero && tieneTrabajo)) {
      palabrasEncontradas.push('[combinación spam]');
      esSpam = true;
      console.log(`🚨 Combinación spam detectada`);
    }

    return {
      palabras: [...new Set(palabrasEncontradas)],
      esOfensivo,
      esSpam,
      esSinsentido,
      calidadTexto
    };
  }

  /**
   * Evalúa la intención general del texto
   */
  analizarIntencion(texto: string): 'ofensivo' | 'spam' | 'sinsentido' | 'inocente' {
    if (!texto) return 'inocente';
    
    const resultado = this.scan(texto);
    
    if (resultado.esOfensivo) return 'ofensivo';
    if (resultado.esSpam) return 'spam';
    if (resultado.esSinsentido) return 'sinsentido';
    
    return 'inocente';
  }

  addWords(palabras: string[]): void {
    palabras.forEach(p => {
      this.palabrasSospechosas.add(p.toLowerCase());
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
    razon: string;
    intencion: 'spam' | 'inocente' | 'sospechoso' | 'sinsentido';
  } {
    if (!texto?.trim()) {
      return {
        puntuacion: 0.3,
        esAprobado: false,
        palabrasProhibidas: [],
        intencion: 'sinsentido',
        razon: 'Texto vacío o muy corto'
      };
    }

    console.log(`\n📝 Analizando texto: "${texto}"`);

    const intencion = filtroPalabras.analizarIntencion(texto);
    const resultadoScan = filtroPalabras.scan(texto);
    
    console.log(`🔍 Intención detectada: ${intencion}`);
    console.log(`🔍 Palabras encontradas:`, resultadoScan.palabras);
    console.log(`🔍 Ofensivo: ${resultadoScan.esOfensivo}, Spam: ${resultadoScan.esSpam}, Sin sentido: ${resultadoScan.esSinsentido}`);

    // ✅ LÓGICA DE PUNTUACIÓN MEJORADA
    let puntuacionBase = 1.0;
    let esAprobado = true;
    let razon = 'Contenido aprobado automáticamente';

    // PENALIZACIONES SEVERAS
    if (intencion === 'ofensivo') {
      puntuacionBase = 0.1;
      esAprobado = false;
      razon = `Contenido ofensivo detectado: ${resultadoScan.palabras.join(', ')}`;
    } 
    else if (intencion === 'spam') {
      puntuacionBase = 0.1;
      esAprobado = false;
      razon = `Contenido comercial/spam detectado: ${resultadoScan.palabras.join(', ')}`;
    }
    else if (intencion === 'sinsentido') {
      puntuacionBase = 0.2;
      esAprobado = false;
      razon = `Texto sin sentido: ${resultadoScan.calidadTexto.razon}`;
    }

    // Penalización adicional por baja calidad (aunque no sea completamente sin sentido)
    if (resultadoScan.calidadTexto.porcentajePalabrasValidas < 0.5 && resultadoScan.calidadTexto.porcentajePalabrasValidas > 0.3) {
      puntuacionBase = Math.min(puntuacionBase, 0.5);
      if (esAprobado) {
        razon = 'Calidad de texto baja';
      }
    }

    const puntuacionFinal = Math.round(puntuacionBase * 100) / 100;

    console.log(`📊 RESULTADO: Puntuación=${puntuacionFinal}, Aprobado=${esAprobado}, Razón=${razon}`);

    return {
      puntuacion: puntuacionFinal,
      esAprobado,
      palabrasProhibidas: resultadoScan.palabras,
      intencion: intencion as 'spam' | 'inocente' | 'sospechoso' | 'sinsentido',
      razon
    };
  }

  static limpiarTexto(texto: string): string {
    return texto;
  }

  static agregarPalabrasProhibidas(palabras: string[]): void {
    filtroPalabras.addWords(palabras);
  }

  /**
   * Método para analizar ejemplos y ajustar reglas
   */
  static debugTexto(texto: string): any {
    const analisis = this.analizarTexto(texto);
    const resultadoScan = filtroPalabras.scan(texto);
    
    return {
      textoOriginal: texto,
      analisisCompleto: analisis,
      scanResult: resultadoScan
    };
  }
}