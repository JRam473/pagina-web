// backend/src/utils/analizadorTexto.ts
import { AnalisisTexto } from '../types/moderacion';

// 🆕 Definir tipos adicionales para la estructura mejorada
interface CalidadTexto {
  tieneSentido: boolean;
  porcentajePalabrasValidas: number;
  razon: string;
  confianza?: number;
}

interface EstructuraTexto {
  esSinSentido: boolean;
  razon: string;
  confianza: number;
}

interface DetallesAnalisis extends Omit<AnalisisTexto['detalles'], 'calidadTexto'> {
  calidadTexto: CalidadTexto;
  estructuraTexto?: EstructuraTexto;
}

class FiltroPalabras {
  private palabrasProhibidas: Set<string>;
  private palabrasSospechosas: Set<string>;
  private contextoProhibido: string[];
  private patronesEvasion: RegExp[];
  private diccionarioEspanol: Set<string>;
  private patronesSpam: RegExp[];
  private expresionesPermitidas: Set<string>;
  private patronesExpresionesComunes: RegExp[];
  
  // 🆕 NUEVAS PROPIEDADES PARA DETECCIÓN MEJORADA
  private patronesTeclado: RegExp[];
  private secuenciasAleatorias: RegExp[];
  private patronesRepetitivosAvanzados: RegExp[];
  private ejemplosBasuraConocidos: string[];

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

    // ✅ EXPRESIONES PERMITIDAS (comunes en español)
    this.expresionesPermitidas = new Set([
      // Saludos y expresiones comunes
      'hola', 'holaaaa', 'holaaaaa', 'holaaaaaaaa', 'holi', 'holis',
      'buenas', 'buenos', 'buen', 'buenísimo', 'buenísima',
      'gracias', 'graciaaas', 'graciaaaas', 'graciaaaaaas',
      'porfa', 'porfavor', 'porfis', 'plis', 'pls',
      'ok', 'okey', 'okis', 'vale', 'va', 'listo',
      'genial', 'geniaaal', 'geniaaaal', 'increíble', 'increible',
      'hermoso', 'hermosa', 'hermosoo', 'hermosaa',
      'bonito', 'bonita', 'bonitoo', 'bonitaa',
      'lindo', 'linda', 'lindoo', 'lindaa',
      'guapo', 'guapa', 'guapoo', 'guapaa',
      'chido', 'chida', 'padre', 'chévere',
      'wow', 'woow', 'wooow', 'woooow',
      'jeje', 'jaja', 'jajaja', 'jajajaja', 'jajajajaja',
      'jejeje', 'jijiji', 'juas', 'lol',
      'ay', 'ayy', 'ayyy', 'ayyyy',
      'uy', 'uyy', 'uyyy', 'uyyyy',
      'oh', 'ohh', 'ohhh', 'ohhhh',
      'ah', 'ahh', 'ahhh', 'ahhhh',
      'eh', 'ehh', 'ehhh', 'ehhhh',
      'uyy', 'ayy', 'eyy', 'oyy',
      
      // Expresiones de emoción
      'feliz', 'felizz', 'felicidad', 'alegre', 'contento', 'contenta',
      'emocionado', 'emocionada', 'emocionante', 'emocion',
      'increíble', 'increible', 'asombroso', 'asombrosa',
      'maravilloso', 'maravillosa', 'fantástico', 'fantastico',
      'impresionante', 'espectacular', 'magnífico', 'magnifico',
      
      // Expresiones de lugar/turismo
      'mirador', 'vista', 'paisaje', 'naturaleza', 'montaña', 'montañas',
      'río', 'laguna', 'lago', 'playa', 'mar', 'océano', 'oceano',
      'bosque', 'selva', 'jungla', 'cascada', 'caída', 'caida',
      'atardecer', 'amanecer', 'puesta', 'sol', 'luna', 'estrellas',
      'cielo', 'nubes', 'horizonte', 'panorámica', 'panoramica',
      
      // Expresiones de experiencia personal
      'experiencia', 'momento', 'recuerdo', 'viaje', 'aventura',
      'paseo', 'caminata', 'excursión', 'excursion', 'tour',
      'vacaciones', 'descanso', 'relax', 'tranquilo', 'tranquila',
      'divertido', 'divertida', 'entretenido', 'entretenida',
      'inolvidable', 'único', 'unico', 'especial'
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

    // 🚨 PATRONES DE SPAM (URLs, emails, teléfonos)
    this.patronesSpam = [
      /(?:https?:\/\/[^\s]+)/gi, // URLs
      /(?:www\.[^\s]+)/gi, // URLs sin http
      /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, // Emails
      /(?:\+?\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/gi, // Teléfonos
    ];

    // ✅ PATRONES DE EXPRESIONES COMUNES PERMITIDAS
    this.patronesExpresionesComunes = [
      /^hola+$/, // "hola", "holaaaa", etc.
      /^gracias+$/, // "gracias", "graciaaaas", etc.
      /^jaja+$/, // "jaja", "jajaja", etc.
      /^jeje+$/, // "jeje", "jejeje", etc.
      /^[aeiouy]{3,}$/, // "ayyy", "uyyy", etc.
      /^[aeiou]{2,}[aeiou]*$/, // Combinaciones de vocales
      /^[a-z]{2,5}[a-z]{3,}$/, // Palabras con repetición natural
    ];

    // 🆕 PATRONES PARA DETECCIÓN MEJORADA DE TEXTO SIN SENTIDO
    this.patronesTeclado = [
      /^[asdfghjkl]+$/i, // Solo teclas de fila central
      /^[qwertyuiop]+$/i, // Solo teclas de fila superior  
      /^[zxcvbnm]+$/i, // Solo teclas de fila inferior
      /^[poiuytrewq]+$/i, // Fila superior al revés
      /^[lkjhgfdsa]+$/i, // Fila central al revés
      /^[mnbvcxz]+$/i, // Fila inferior al revés
    ];

    // 🛠️ CORREGIDO: Patrones de secuencias aleatorias sin backreferences incorrectos
    this.secuenciasAleatorias = [
      /([a-z])\1{4,}/gi, // Misma letra repetida 5+ veces - CORREGIDO
      /([a-z]{2})\1{3,}/gi, // Patrón de 2 letras repetido - CORREGIDO
      /([a-z]{3})\1{3,}/gi, // Patrón de 3 letras repetido - CORREGIDO
    ];

    this.patronesRepetitivosAvanzados = [
      /(\w)\1{5,}/, // Carácter repetido 6+ veces
      /(\w{2})\1{4,}/, // 2 caracteres repetidos 5+ veces
      /(\w{3})\1{3,}/, // 3 caracteres repetidos 4+ veces
      /^(\w)\1+$/, // Solo un carácter repetido
    ];

    // 🆕 EJEMPLOS CONOCIDOS DE TEXTO BASURA
    this.ejemplosBasuraConocidos = [
      'dsdjkvdjkvndskjvndskjvndsjkvndsvjkdvndsjkvdnvkjdsdvsdvkjdsbvjdsbvkdsb vds sdkvdvndskvndsvds',
      'fghfghfghfghfghfgh',
      'asdfasdfasdfasdf',
      'qwertyqwerty',
      'lkjlkjlkjlkj',
      'zxcvzxcvzxcv',
      'mnbmnbmnbmnb',
      'poiupoiupoiu',
      'vbnmvbnmvbnm',
      'rtyurtyurtyu'
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

    // Agregar expresiones permitidas al diccionario
    this.expresionesPermitidas.forEach(expresion => {
      this.diccionarioEspanol.add(expresion);
    });
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
   * Verifica si una palabra es una expresión común permitida
   */
  private esExpresionPermitida(palabra: string): boolean {
    // Verificar en el set de expresiones permitidas
    if (this.expresionesPermitidas.has(palabra)) {
      return true;
    }

    // Verificar patrones de expresiones comunes
    for (const patron of this.patronesExpresionesComunes) {
      if (patron.test(palabra)) {
        console.log(`✅ Expresión común permitida: "${palabra}" (patrón: ${patron})`);
        return true;
      }
    }

    return false;
  }

  /**
   * 🆕 MÉTODO MEJORADO: Detectar texto sin sentido avanzado
   */
  private analizarEstructuraTexto(texto: string): EstructuraTexto {
    if (!texto || texto.length < 5) {
      return { esSinSentido: false, razon: 'Texto muy corto', confianza: 0.3 };
    }

    const textoLimpio = texto.toLowerCase().replace(/\s+/g, '');
    
    // 1. Verificar contra ejemplos conocidos de basura
    for (const ejemplo of this.ejemplosBasuraConocidos) {
      const ejemplolimpio = ejemplo.toLowerCase().replace(/\s+/g, '');
      if (textoLimpio.includes(ejemplolimpio) || ejemplolimpio.includes(textoLimpio)) {
        return { 
          esSinSentido: true, 
          razon: 'Patrón de texto basura conocido', 
          confianza: 0.95 
        };
      }
    }

    // 2. Verificar si son solo patrones de teclado
    for (const patron of this.patronesTeclado) {
      if (patron.test(textoLimpio)) {
        return { 
          esSinSentido: true, 
          razon: 'Patrón de teclado detectado', 
          confianza: 0.9 
        };
      }
    }

    // 3. Verificar patrones repetitivos avanzados
    for (const patron of this.patronesRepetitivosAvanzados) {
      if (patron.test(textoLimpio)) {
        return { 
          esSinSentido: true, 
          razon: 'Patrón repetitivo avanzado detectado', 
          confianza: 0.85 
        };
      }
    }

    // 4. Verificar secuencias aleatorias
    for (const patron of this.secuenciasAleatorias) {
      const matches = textoLimpio.match(patron);
      if (matches && matches.length > 0) {
        const porcentajeSecuencia = matches.reduce((acc, match) => acc + match.length, 0) / textoLimpio.length;
        if (porcentajeSecuencia > 0.7) {
          return { 
            esSinSentido: true, 
            razon: 'Secuencia aleatoria detectada', 
            confianza: 0.8 
          };
        }
      }
    }

    // 5. Análisis de entropía (caracteres únicos vs repetidos)
    const caracteresUnicos = new Set(textoLimpio);
    const ratioEntropia = caracteresUnicos.size / textoLimpio.length;
    
    if (ratioEntropia < 0.3 && textoLimpio.length > 8) {
      return { 
        esSinSentido: true, 
        razon: 'Baja diversidad de caracteres', 
        confianza: 0.75 
      };
    }

    // 6. Verificar proporción de vocales/consonantes
    const vocales = textoLimpio.match(/[aeiou]/g)?.length || 0;
    const consonantes = textoLimpio.match(/[bcdfghjklmnpqrstvwxyz]/g)?.length || 0;
    const totalLetras = vocales + consonantes;
    
    if (totalLetras > 0) {
      const ratioVocales = vocales / totalLetras;
      if (ratioVocales < 0.1 || ratioVocales > 0.9) {
        return { 
          esSinSentido: true, 
          razon: 'Proporción vocal/consonante anormal', 
          confianza: 0.7 
        };
      }
    }

    return { esSinSentido: false, razon: 'Estructura normal', confianza: 0.1 };
  }

  /**
   * 🆕 MÉTODO MEJORADO: Análisis de calidad de texto más inteligente
   */
  private analizarCalidadTexto(texto: string): CalidadTexto {
    if (!texto || texto.length < 3) {
      return { 
        tieneSentido: false, 
        porcentajePalabrasValidas: 0, 
        razon: 'Texto muy corto',
        confianza: 0.9
      };
    }

    const palabras = texto.split(/\s+/).filter(p => p.length > 0);
    if (palabras.length === 0) {
      return { 
        tieneSentido: false, 
        porcentajePalabrasValidas: 0, 
        razon: 'Sin palabras válidas',
        confianza: 1.0
      };
    }

    // 1. Análisis de estructura (nuevo)
    const analisisEstructura = this.analizarEstructuraTexto(texto);
    if (analisisEstructura.esSinSentido) {
      return {
        tieneSentido: false,
        porcentajePalabrasValidas: 0,
        razon: analisisEstructura.razon,
        confianza: analisisEstructura.confianza
      };
    }

    // 2. Análisis de palabras válidas (existente pero mejorado)
    const palabrasValidas = palabras.filter(palabra => {
      const esEnDiccionario = this.diccionarioEspanol.has(palabra);
      const esExpresionPermitida = this.esExpresionPermitida(palabra);
      const esPalabraLargaValida = palabra.length >= 3 && /[aeiou]{1,}/.test(palabra); // Debe tener al menos una vocal
      
      return esEnDiccionario || esExpresionPermitida || esPalabraLargaValida;
    });

    const porcentajeValidas = palabrasValidas.length / palabras.length;

    // 3. Detección de patrones problemáticos (mejorado)
    const tienePatronRepetitivo = this.detectarPatronRepetitivo(texto);
    const tieneMuchasConsonantesSeguidas = this.detectarConsonantesSeguidas(texto);
    const tienePalabrasMuyCortas = palabras.filter(p => p.length <= 2).length > palabras.length * 0.6;

    let tieneSentido = true;
    let razon = 'Texto con sentido';
    let confianza = 0.1;

    // REGLAS MEJORADAS
    if (porcentajeValidas < 0.15 && palabras.length > 3) {
      tieneSentido = false;
      razon = `Muy pocas palabras válidas (${Math.round(porcentajeValidas * 100)}%)`;
      confianza = 0.8;
    }
    else if (tienePatronRepetitivo && porcentajeValidas < 0.25) {
      tieneSentido = false;
      razon = 'Patrón repetitivo detectado con baja calidad';
      confianza = 0.85;
    }
    else if (tieneMuchasConsonantesSeguidas && porcentajeValidas < 0.25) {
      tieneSentido = false;
      razon = 'Demasiadas consonantes seguidas con baja calidad';
      confianza = 0.8;
    }
    else if (tienePalabrasMuyCortas && palabras.length > 4) {
      tieneSentido = false;
      razon = 'Demasiadas palabras muy cortas';
      confianza = 0.75;
    }
    else if (porcentajeValidas < 0.3) {
      // Texto de baja calidad pero no necesariamente sin sentido
      razon = 'Calidad de texto baja';
      confianza = 0.4;
    }

    console.log(`📊 Calidad texto mejorada: ${tieneSentido ? '✅ CON SENTIDO' : '❌ SIN SENTIDO'} (${razon})`);
    console.log(`   Palabras: ${palabras.length}, Válidas: ${palabrasValidas.length} (${Math.round(porcentajeValidas * 100)}%)`);
    console.log(`   Confianza: ${confianza}`);

    return {
      tieneSentido,
      porcentajePalabrasValidas: porcentajeValidas,
      razon,
      confianza
    };
  }

  /**
   * Detecta patrones repetitivos como "asdfasdf" o "lklklk" (más específico)
   */
  private detectarPatronRepetitivo(texto: string): boolean {
    const patronesRepetitivos = [
      /(.)\1{4,}/, // Mismo carácter repetido 5+ veces (aaaaa) - más estricto
      /(..)\1{3,}/, // Patrón de 2 caracteres repetido (abababab)
      /(...)\1{3,}/, // Patrón de 3 caracteres repetido (abcabcabcabc)
      /^[asdfjkl]{6,}$/i, // Solo teclas de la fila central (6+ caracteres)
      /^[qwertyuiop]{6,}$/i, // Solo teclas de la fila superior (6+ caracteres)
      /^[zxcvbnm]{6,}$/i, // Solo teclas de la fila inferior (6+ caracteres)
    ];

    const textoLimpio = texto.replace(/\s/g, '').toLowerCase();
    
    // EXCEPCIONES: Permitir expresiones comunes repetitivas
    const excepcionesPermitidas = [
      /^hola+$/, /^gracias+$/, /^jaja+$/, /^jeje+$/, /^[aeiouy]{3,}$/
    ];

    for (const excepcion of excepcionesPermitidas) {
      if (excepcion.test(textoLimpio)) {
        return false; // No es patrón repetitivo malicioso
      }
    }
    
    for (const patron of patronesRepetitivos) {
      if (patron.test(textoLimpio)) {
        console.log(`🔄 Patrón repetitivo detectado: ${patron}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Detecta demasiadas consonantes seguidas (más flexible)
   */
  private detectarConsonantesSeguidas(texto: string): boolean {
    const textoLimpio = texto.replace(/\s/g, '').toLowerCase();
    const consonantesSeguidas = textoLimpio.match(/[bcdfghjklmnpqrstvwxyz]{6,}/gi); // 6+ consonantes (más flexible)
    
    if (consonantesSeguidas && consonantesSeguidas.length > 0) {
      console.log(`🔤 Demasiadas consonantes seguidas: ${consonantesSeguidas[0]}`);
      return true;
    }
    
    return false;
  }

  /**
   * 🆕 MÉTODO MEJORADO: Escaneo con detección avanzada
   */
  scan(texto: string): { 
    palabras: string[], 
    esOfensivo: boolean, 
    esSpam: boolean,
    esSinsentido: boolean,
    tienePatronesSpam: boolean,
    calidadTexto: CalidadTexto,
    estructuraTexto: EstructuraTexto
  } {
    if (!texto) return { 
      palabras: [], 
      esOfensivo: false, 
      esSpam: false,
      esSinsentido: true,
      tienePatronesSpam: false,
      calidadTexto: { 
        tieneSentido: false, 
        porcentajePalabrasValidas: 0, 
        razon: 'Texto vacío',
        confianza: 1.0
      },
      estructuraTexto: {
        esSinSentido: true,
        razon: 'Texto vacío',
        confianza: 1.0
      }
    };
    
    const textoLimpio = this.normalizarTexto(texto);
    const palabrasEncontradas: string[] = [];
    let esOfensivo = false;
    let esSpam = false;
    let tienePatronesSpam = false;

    console.log(`🔍 Texto normalizado: "${textoLimpio}"`);

    // 1️⃣ Análisis de estructura (NUEVO)
    const estructuraTexto = this.analizarEstructuraTexto(texto);

    // 2️⃣ Análisis de calidad mejorado
    const calidadTexto = this.analizarCalidadTexto(textoLimpio);

    // 3️⃣ Combinar resultados de estructura y calidad
    const esSinsentido = estructuraTexto.esSinSentido || !calidadTexto.tieneSentido;

    // 4️⃣ Detectar patrones de spam (URLs, emails, teléfonos)
    for (const patron of this.patronesSpam) {
      const coincidencias = texto.match(patron);
      if (coincidencias && coincidencias.length > 0) {
        tienePatronesSpam = true;
        esSpam = true;
        palabrasEncontradas.push(`[spam: ${coincidencias[0]}]`);
        console.log(`🚨 Patrón spam detectado: ${coincidencias[0]}`);
      }
    }

    // 5️⃣ Verificar frases prohibidas completas
    for (const frase of this.contextoProhibido) {
      const fraseNormalizada = this.normalizarTexto(frase);
      if (textoLimpio.includes(fraseNormalizada) || texto.toLowerCase().includes(frase)) {
        palabrasEncontradas.push(`[frase: ${frase}]`);
        esSpam = true;
        console.log(`🚨 Frase prohibida detectada: "${frase}"`);
      }
    }

    // 6️⃣ Verificar palabras individuales (EXCLUYENDO EXPRESIONES PERMITIDAS)
    const palabras = textoLimpio.split(/\s+/).filter(p => p.length > 2);
    
    console.log(`🔍 Palabras separadas:`, palabras);

    for (const palabra of palabras) {
      const palabraLimpia = palabra.trim();
      
      // ✅ EXCEPCIÓN: Si es expresión permitida, saltar verificación
      if (this.esExpresionPermitida(palabraLimpia)) {
        console.log(`✅ Expresión permitida ignorada: "${palabraLimpia}"`);
        continue;
      }
      
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

    // 7️⃣ Detectar patrones de spam comercial (más específico)
    const tieneVenta = palabras.some(p => ['vendo', 'compro', 'venta'].includes(p) && !this.esExpresionPermitida(p));
    const tienePrecio = palabras.some(p => ['barato', 'oferta', 'descuento', 'económico', 'economico'].includes(p) && !this.esExpresionPermitida(p));
    const tieneDinero = palabras.some(p => ['ganar', 'dinero', 'ingresos', 'ganancias'].includes(p) && !this.esExpresionPermitida(p));
    const tieneTrabajo = palabras.some(p => ['trabajo', 'empleo', 'casa'].includes(p) && !this.esExpresionPermitida(p));

    // Solo marcar como spam si hay múltiples indicadores
    if ((tieneVenta && tienePrecio) || (tieneDinero && tieneTrabajo) || 
        (tieneVenta && tieneDinero) || (tienePrecio && tieneTrabajo)) {
      palabrasEncontradas.push('[combinación spam]');
      esSpam = true;
      console.log(`🚨 Combinación spam detectada`);
    }

    return {
      palabras: [...new Set(palabrasEncontradas)],
      esOfensivo,
      esSpam: esSpam || tienePatronesSpam,
      esSinsentido,
      tienePatronesSpam,
      calidadTexto,
      estructuraTexto
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

  /**
   * Agrega expresiones permitidas al filtro
   */
  addExpresionesPermitidas(expresiones: string[]): void {
    expresiones.forEach(exp => {
      this.expresionesPermitidas.add(exp.toLowerCase());
      this.diccionarioEspanol.add(exp.toLowerCase());
    });
  }

  /**
   * 🆕 Agrega ejemplos de texto basura conocidos
   */
  addEjemplosBasura(ejemplos: string[]): void {
    ejemplos.forEach(ejemplo => {
      this.ejemplosBasuraConocidos.push(ejemplo.toLowerCase());
    });
  }
}

// Instancia global del filtro
const filtroPalabras = new FiltroPalabras();

export class AnalizadorTexto {
  
  /**
   * Analiza texto y retorna resultado con todas las propiedades necesarias - CORREGIDO
   */
  analizarTexto(texto: string): AnalisisTexto {
    if (!texto?.trim()) {
      return {
        esAprobado: false,
        puntuacion: 0.1,
        palabrasOfensivas: [],
        razon: 'Texto vacío o muy corto',
        // ✅ CORREGIDO: Propiedades opcionales con valores por defecto
        tieneSpam: false,
        tieneUrls: false,
        tieneContacto: false,
        esCohorente: false,
        longitud: 0,
        cantidadPalabras: 0,
        detalles: { 
          metodo: 'texto_vacio',
          intencion: 'sinsentido',
          calidadTexto: { 
            tieneSentido: false, 
            porcentajePalabrasValidas: 0, 
            razon: 'Texto vacío'
          },
          longitud: 0
        }
      };
    }

    console.log(`\n📝 Analizando texto: "${texto.substring(0, 100)}..."`);

    const resultadoScan = filtroPalabras.scan(texto);
    const intencion = filtroPalabras.analizarIntencion(texto);
    
    // ✅ CALCULAR PROPIEDADES ADICIONALES
    const tieneSpam = resultadoScan.esSpam || intencion === 'spam';
    const tieneUrls = resultadoScan.tienePatronesSpam;
    const tieneContacto = resultadoScan.tienePatronesSpam; // Puedes refinar esto
    const esCohorente = resultadoScan.calidadTexto.tieneSentido && !resultadoScan.estructuraTexto.esSinSentido;
    const palabras = texto.split(/\s+/).filter(p => p.length > 0);
    
    console.log(`🔍 Intención detectada: ${intencion}`);
    console.log(`🔍 Spam: ${tieneSpam}, URLs: ${tieneUrls}, Coherente: ${esCohorente}`);

    // ✅ LÓGICA DE PUNTUACIÓN MEJORADA CON MÚLTIPLES FACTORES
    let puntuacionBase = 1.0;
    let esAprobado = true;
    let razon = 'Contenido aprobado automáticamente';

    // DECISIONES BASADAS EN MÚLTIPLES FACTORES CON CONFIANZA
    const factores = [
      { 
        condicion: resultadoScan.esOfensivo, 
        puntuacion: 0.1, 
        aprobado: false, 
        razon: `Contenido ofensivo detectado: ${resultadoScan.palabras.join(', ')}` 
      },
      { 
        condicion: resultadoScan.esSpam, 
        puntuacion: 0.1, 
        aprobado: false, 
        razon: `Contenido comercial/spam detectado: ${resultadoScan.palabras.join(', ')}` 
      },
      { 
        condicion: resultadoScan.estructuraTexto.esSinSentido && resultadoScan.estructuraTexto.confianza > 0.8, 
        puntuacion: 0.2, 
        aprobado: false, 
        razon: resultadoScan.estructuraTexto.razon 
      },
      { 
        condicion: !resultadoScan.calidadTexto.tieneSentido && (resultadoScan.calidadTexto.confianza || 0) > 0.7, 
        puntuacion: 0.3, 
        aprobado: false, 
        razon: resultadoScan.calidadTexto.razon 
      },
      { 
        condicion: resultadoScan.tienePatronesSpam, 
        puntuacion: 0.3, 
        aprobado: false, 
        razon: 'Se detectaron patrones de spam (URLs, emails, teléfonos)' 
      }
    ];

    for (const factor of factores) {
      if (factor.condicion) {
        puntuacionBase = Math.min(puntuacionBase, factor.puntuacion);
        if (factor.aprobado === false && esAprobado) {
          esAprobado = false;
          razon = factor.razon;
        }
      }
    }

    // Penalización adicional por baja calidad (menos severa)
    if (resultadoScan.calidadTexto.porcentajePalabrasValidas < 0.3 && esAprobado) {
      puntuacionBase = Math.min(puntuacionBase, 0.6);
      if (resultadoScan.calidadTexto.porcentajePalabrasValidas < 0.15) {
        esAprobado = false;
        razon = 'Calidad de texto muy baja';
        puntuacionBase = 0.4;
      } else {
        razon = 'Calidad de texto baja pero aceptable';
      }
    }

    const puntuacionFinal = Math.round(puntuacionBase * 100) / 100;

    console.log(`📊 RESULTADO: Puntuación=${puntuacionFinal}, Aprobado=${esAprobado}, Razón=${razon}`);

    // 🛠️ CORREGIDO: Crear detalles sin la propiedad estructuraTexto que no existe en el tipo
    const detalles: AnalisisTexto['detalles'] = {
      metodo: 'filtro-palabras-mejorado-avanzado',
      intencion,
      calidadTexto: {
        tieneSentido: resultadoScan.calidadTexto.tieneSentido,
        porcentajePalabrasValidas: resultadoScan.calidadTexto.porcentajePalabrasValidas,
        razon: resultadoScan.calidadTexto.razon
      },
      longitud: texto.length,
      tienePatronesSpam: resultadoScan.tienePatronesSpam
    };

    return {
      esAprobado,
      puntuacion: puntuacionFinal,
      palabrasOfensivas: resultadoScan.palabras,
      razon,
      detalles
    };
  }

  /**
   * Método para compatibilidad con código existente
   */
  static analizarTexto(texto: string): {
    puntuacion: number;
    esAprobado: boolean;
    palabrasProhibidas: string[];
    razon: string;
    intencion: 'spam' | 'inocente' | 'sospechoso' | 'sinsentido';
  } {
    const analizador = new AnalizadorTexto();
    const resultado = analizador.analizarTexto(texto);
    
    // Mapear a formato antiguo para compatibilidad
    return {
      puntuacion: resultado.puntuacion,
      esAprobado: resultado.esAprobado,
      palabrasProhibidas: resultado.palabrasOfensivas,
      razon: resultado.razon,
      intencion: resultado.detalles.intencion as 'spam' | 'inocente' | 'sospechoso' | 'sinsentido'
    };
  }

  limpiarTexto(texto: string): string {
    return texto;
  }

  agregarPalabrasProhibidas(palabras: string[]): void {
    filtroPalabras.addWords(palabras);
  }

  /**
   * 🆕 Agregar ejemplos de texto basura
   */
  agregarEjemplosBasura(ejemplos: string[]): void {
    filtroPalabras.addEjemplosBasura(ejemplos);
  }

  /**
   * Método para analizar ejemplos y ajustar reglas
   */
  debugTexto(texto: string): any {
    const analisis = this.analizarTexto(texto);
    const resultadoScan = filtroPalabras.scan(texto);
    
    return {
      textoOriginal: texto,
      analisisCompleto: analisis,
      scanResult: resultadoScan
    };
  }

  /**
   * 🆕 Método para probar ejemplos específicos
   */
  probarEjemplos(): void {
    const ejemplos = [
      'dsdjkvdjkvndskjvndskjvndsjkvndsvjkdvndsjkvdnvkjdsdvsdvkjdsbvjdsbvkdsb vds sdkvdvndskvndsvds',
      'hola que tal estás',
      'asdfasdfasdfasdf',
      'vendo producto barato',
      'jajajajajajaja',
      'qwertyuiop',
      'lkjhgfdsa',
      'mnbvcxz',
      'puta madre',
      'hermoso mirador con vista al río',
      'fghfghfghfghfghfgh'
    ];

    console.log('\n🧪 PROBANDO EJEMPLOS:');
    ejemplos.forEach((ejemplo, index) => {
      console.log(`\n--- Ejemplo ${index + 1}: "${ejemplo.substring(0, 50)}" ---`);
      const resultado = this.analizarTexto(ejemplo);
      console.log(`✅ Aprobado: ${resultado.esAprobado}, Puntuación: ${resultado.puntuacion}`);
      console.log(`📝 Razón: ${resultado.razon}`);
      console.log(`🎯 Intención: ${resultado.detalles.intencion}`);
    });
  }
}