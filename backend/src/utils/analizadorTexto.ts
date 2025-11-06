// backend/src/utils/analizadorTexto.ts - VERSIÓN CON ANÁLISIS DE COHERENCIA
import { AnalisisTexto } from '../types/moderacion';
import axios from 'axios';

// Configuración de Perspective API
const PERSPECTIVE_API_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';

// Tipos para Perspective API
interface PerspectiveAttributeScores {
  summaryScore: {
    value: number;
    type: string;
  };
}

interface PerspectiveResponse {
  attributeScores: {
    [key: string]: PerspectiveAttributeScores;
  };
  languages: string[];
  detectedLanguages: string[];
}

interface DetallesAnalisisMejorado {
  metodo: string;
  intencion: string;
  calidadTexto: {
    tieneSentido: boolean;
    porcentajePalabrasValidas: number;
    razon: string;
    confianza?: number;
  };
  longitud: number;
  tienePatronesSpam?: boolean;
  perspectiveScores?: { [key: string]: number };
  cacheUsado?: boolean;
}

export class AnalizadorTexto {
  private cache: Map<string, { resultado: AnalisisTexto; timestamp: number }> = new Map();
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutos
  private readonly MAX_CACHE_SIZE = 100;

  // Diccionario de palabras válidas en español
  private diccionarioEspanol: Set<string> = new Set([
    // Sustantivos comunes
    'hola', 'buenas', 'mirador', 'puente', 'paisaje', 'naturaleza', 'experiencia', 
    'lugar', 'sitio', 'foto', 'imagen', 'vista', 'gente', 'personas', 'amigos', 
    'familia', 'viaje', 'vacaciones', 'aventura', 'día', 'noche', 'tarde', 'mañana', 
    'tiempo', 'momento', 'recuerdo', 'agua', 'río', 'mar', 'montaña', 'bosque', 
    'árbol', 'flor', 'animal', 'ciudad', 'pueblo', 'campo', 'playa', 'sol', 'luna', 
    'estrella', 'cielo', 'nubes', 'atardecer', 'amanecer', 'viento', 'calor', 'frío',
    
    // Verbos comunes
    'es', 'son', 'era', 'fueron', 'está', 'están', 'estaba', 'estaban', 'tengo', 
    'tiene', 'tenía', 'tenían', 'puedo', 'puede', 'podía', 'podían', 'quiero', 
    'quiere', 'quería', 'querían', 'voy', 'va', 'iba', 'iban', 'veo', 've', 'veía', 
    'veían', 'digo', 'dice', 'decía', 'decían', 'hago', 'hace', 'hacía', 'hacían', 
    'sé', 'sabe', 'sabía', 'sabían', 'fui', 'fuiste', 'fue', 'fuimos', 'fueron',
    
    // Adjetivos comunes
    'bueno', 'buena', 'buenos', 'buenas', 'malo', 'mala', 'malos', 'malas', 'grande', 
    'pequeño', 'pequeña', 'alto', 'alta', 'bajo', 'baja', 'nuevo', 'nueva', 'viejo', 
    'vieja', 'joven', 'feliz', 'triste', 'contento', 'contenta', 'enojado', 'enojada', 
    'caliente', 'frío', 'fría', 'cálido', 'cálida', 'fresco', 'fresca', 'hermoso', 
    'hermosa', 'bonito', 'bonita', 'lindo', 'linda', 'increíble', 'maravilloso', 
    'maravillosa', 'impresionante', 'espectacular', 'fantástico', 'fantástica',
    
    // Artículos, preposiciones, etc.
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'en', 'con', 'por', 
    'para', 'sin', 'sobre', 'bajo', 'y', 'o', 'pero', 'porque', 'aunque', 'si', 'no', 
    'muy', 'mucho', 'mucha', 'poco', 'poca', 'algo', 'nada', 'aquí', 'allí', 'ahí', 
    'cerca', 'lejos', 'dentro', 'fuera', 'antes', 'después', 'siempre', 'nunca',
    
    // Expresiones comunes permitidas
    'holaa', 'holaaa', 'gracias', 'graciaaas', 'porfa', 'porfavor', 'ok', 'okey', 
    'vale', 'genial', 'jeje', 'jaja', 'jajaja', 'jejeje', 'ay', 'uy', 'oh', 'ah', 'eh',
    'wow', 'woow', 'increible', 'padre', 'chido', 'chévere'
  ]);




  /**
   * ANALIZAR TEXTO CON PERSPECTIVE API - ATRIBUTOS COMPATIBLES
   */
  private async analizarConPerspective(texto: string): Promise<{ [key: string]: number }> {
    // Para textos muy cortos o simples, usar análisis local
    if (texto.length < 5 || this.esTextoMuySimple(texto)) {
      console.log('🔍 Texto muy simple, usando análisis local');
      return this.crearPerspectiveResponseDefault();
    }

    if (!process.env.PERSPECTIVE_API_KEY) {
      console.error('❌ PERSPECTIVE_API_KEY no configurada en .env');
      throw new Error('API key de Perspective no configurada');
    }

    console.log('🔗 Enviando a Google Perspective API...');
    
    try {
      const response = await axios.post<PerspectiveResponse>(
        PERSPECTIVE_API_URL,
        {
          comment: { 
            text: texto,
            type: 'PLAIN_TEXT'
          },
          requestedAttributes: {
            TOXICITY: {},
            SEVERE_TOXICITY: {},
            IDENTITY_ATTACK: {},
            INSULT: {},
            PROFANITY: {},
            THREAT: {}
          },
          languages: ['es', 'en'],
          doNotStore: true
        },
        {
          params: {
            key: process.env.PERSPECTIVE_API_KEY
          },
          timeout: 10000
        }
      );

      console.log('✅ Respuesta Perspective API recibida');

      // Extraer scores de la respuesta
      const scores: { [key: string]: number } = {};
      if (response.data.attributeScores) {
        Object.keys(response.data.attributeScores).forEach(attribute => {
          const scoreValue = response.data.attributeScores[attribute]?.summaryScore?.value;
          if (scoreValue !== undefined) {
            scores[attribute] = scoreValue;
          }
        });
      }

      return scores;

    } catch (error: any) {
      console.error('❌ Error en Perspective API:', {
        status: error.response?.status,
        message: error.response?.data?.error?.message || error.message
      });
      
      // Si es error de quota, usar fallback
      if (error.response?.status === 429) {
        console.log('📊 Quota excedida, usando fallback local');
        return this.crearPerspectiveResponseDefault();
      }
      
      throw error;
    }
  }

  /**
   * CALCULAR PUNTUACIÓN BASADA EN PERSPECTIVE
   */
  private calcularPuntuacionPerspective(scores: { [key: string]: number }): number {
    const toxicidad = scores.TOXICITY || 0;
    const severidad = scores.SEVERE_TOXICITY || 0;
    const insulto = scores.INSULT || 0;
    const ataqueIdentidad = scores.IDENTITY_ATTACK || 0;
    const amenaza = scores.THREAT || 0;
    const lenguajeProfano = scores.PROFANITY || 0;

    // Tomar el score más alto de las categorías problemáticas
    const maxScore = Math.max(toxicidad, severidad, insulto, ataqueIdentidad, amenaza, lenguajeProfano);
    
    // Convertir a puntuación inversa (más alto = más peligroso = menor puntuación)
    return Math.max(0.1, 1.0 - maxScore);
  }

  /**
   * GENERAR RAZÓN BASADA EN PERSPECTIVE
   */
  private generarRazonPerspective(scores: { [key: string]: number }): string {
    const categoriasActivas = Object.entries(scores)
      .filter(([category, score]) => (score || 0) > 0.7)
      .map(([category]) => this.traducirCategoria(category));

    if (categoriasActivas.length === 0) {
      return 'Contenido aprobado por Google Perspective API';
    }

    return `Contenido no aprobado: ${categoriasActivas.join(', ')}`;
  }

  /**
   * DETERMINAR INTENCIÓN BASADA EN PERSPECTIVE
   */
  private determinarIntencionPerspective(scores: { [key: string]: number }): string {
    const toxicidad = scores.TOXICITY || 0;
    const severidad = scores.SEVERE_TOXICITY || 0;
    const amenaza = scores.THREAT || 0;
    const ataqueIdentidad = scores.IDENTITY_ATTACK || 0;
    const insulto = scores.INSULT || 0;
    const lenguajeProfano = scores.PROFANITY || 0;

    // Priorizar por severidad
    if (amenaza > 0.8 || severidad > 0.8 || ataqueIdentidad > 0.8) {
      return 'peligroso';
    }

    if (toxicidad > 0.7 || insulto > 0.7 || lenguajeProfano > 0.7) {
      return 'ofensivo';
    }

    if (toxicidad > 0.5) {
      return 'sospechoso';
    }

    return 'inocente';
  }

  /**
   * EXTRAER CATEGORÍAS ACTIVAS
   */
  private extraerCategoriasActivas(scores: { [key: string]: number }): string[] {
    return Object.entries(scores)
      .filter(([category, score]) => (score || 0) > 0.7)
      .map(([category]) => this.traducirCategoria(category));
  }

  /**
   * TRADUCIR CATEGORÍAS DE PERSPECTIVE AL ESPAÑOL
   */
  private traducirCategoria(categoria: string): string {
    const traducciones: Record<string, string> = {
      'TOXICITY': 'toxicidad',
      'SEVERE_TOXICITY': 'toxicidad severa',
      'IDENTITY_ATTACK': 'ataque a identidad',
      'INSULT': 'insulto',
      'PROFANITY': 'lenguaje profano',
      'THREAT': 'amenaza'
      // ❌ REMOVIDO: SEXUALLY_EXPLICIT y FLIRTATION
    };

    return traducciones[categoria] || categoria;
  }

  /**
   * CREAR RESPUESTA POR DEFECTO PARA PERSPECTIVE
   */
  private crearPerspectiveResponseDefault(): { [key: string]: number } {
    return {
      TOXICITY: 0,
      SEVERE_TOXICITY: 0,
      IDENTITY_ATTACK: 0,
      INSULT: 0,
      PROFANITY: 0,
      THREAT: 0
      // ❌ REMOVIDO: SEXUALLY_EXPLICIT y FLIRTATION
    };
  }

  /**
   * DETECTAR TEXTOS MUY SIMPLES PARA EVITAR PERSPECTIVE
   */
  private esTextoMuySimple(texto: string): boolean {
    const textoLimpio = texto.toLowerCase().trim();
    
    const textosSimples = [
      'hola', 'holaa', 'holaaa', 'hi', 'hello',
      'gracias', 'thanks', 'thank you',
      'ok', 'okay', 'vale', 'bueno',
      'si', 'no', 'yes', 'yep', 'nope',
      'jeje', 'jaja', 'haha', 'lol'
    ];

    return textosSimples.includes(textoLimpio) || 
           textoLimpio.length <= 3 ||
           /^[aeioujkh]+$/.test(textoLimpio.replace(/\s/g, ''));
  }

  /**
   * USAR FALLBACK LOCAL MEJORADO
   */
  private usarFallbackLocal(texto: string): AnalisisTexto {
    console.log('🔄 Usando análisis local (fallback)');
    
    // ✅ MEJORADO: Detección más robusta de contenido ofensivo
    const deteccion = this.detectarContenidoOfensivoLocal(texto);
    const esAprobado = !deteccion.esOfensivo;
    const puntuacion = esAprobado ? 0.8 : 0.3;

    const detalles: DetallesAnalisisMejorado = {
      metodo: 'fallback-local',
      intencion: deteccion.intencion,
      calidadTexto: {
        tieneSentido: this.esTextoCoherente(texto),
        porcentajePalabrasValidas: this.calcularPorcentajeValido(texto),
        razon: 'Análisis local (fallback por limitaciones de API)'
      },
      longitud: texto.length,
      tienePatronesSpam: false
    };

    return {
      esAprobado,
      puntuacion,
      palabrasOfensivas: deteccion.palabrasOfensivas,
      razon: deteccion.razon,
      detalles: detalles as AnalisisTexto['detalles']
    };
  }

  /**
   * DETECCIÓN LOCAL MEJORADA DE CONTENIDO OFENSIVO
   */
  private detectarContenidoOfensivoLocal(texto: string): { 
    esOfensivo: boolean; 
    palabrasOfensivas: string[];
    razon: string;
    intencion: string;
  } {
    const palabrasOfensivasExtremas = [
      'puta', 'puto', 'mierda', 'cabron', 'imbecil', 'estupido', 'maricon',
      'verga', 'polla', 'coño', 'chocha', 'fuck', 'shit', 'bitch', 'asshole',
      'joder', 'carajo', 'hostia', 'cojones', 'malparido', 'hijueputa', 'basura'
    ];

    const palabrasOfensivasModeradas = [
      'idiota', 'tonto', 'estúpido', 'imbécil', 'cretino', 'animal',
      'bruto', 'burro', 'inútil', 'incompetente', 'fracasado'
    ];

    const textoLimpio = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const palabras = textoLimpio.split(/\s+/);
    
    const encontradasExtremas = palabras.filter(palabra => 
      palabrasOfensivasExtremas.includes(palabra)
    );

    const encontradasModeradas = palabras.filter(palabra => 
      palabrasOfensivasModeradas.includes(palabra)
    );

    const todasOfensivas = [...encontradasExtremas, ...encontradasModeradas];
    
    // Determinar intención basada en el contenido
    let intencion = 'inocente';
    if (encontradasExtremas.length > 0) intencion = 'ofensivo';
    else if (encontradasModeradas.length > 0) intencion = 'sospechoso';

    // Calcular si es ofensivo
    const esOfensivo = encontradasExtremas.length > 0 || encontradasModeradas.length > 1;

    // Generar razón
    let razon = 'Contenido aprobado';
    if (esOfensivo) {
      if (encontradasExtremas.length > 0) {
        razon = `Lenguaje extremadamente ofensivo detectado: ${encontradasExtremas.join(', ')}`;
      } else if (encontradasModeradas.length > 0) {
        razon = `Lenguaje ofensivo detectado: ${encontradasModeradas.join(', ')}`;
      }
    }

    return {
      esOfensivo,
      palabrasOfensivas: todasOfensivas,
      razon,
      intencion
    };
  }

  /**
   * ✅ NUEVO: VERIFICAR COHERENCIA DEL TEXTO
   */
  private esTextoCoherente(texto: string): boolean {
    const palabras = texto.trim().split(/\s+/);
    
    // Textos muy cortos pueden ser coherentes
    if (palabras.length <= 3) return true;
    
    // Verificar que tenga una estructura básica
    const tieneVerbos = /(\b(es|son|era|fueron|tiene|tienen|hace|hacen|puede|pueden|debe|deben|quiero|quiere|dice|dicen)\b)/i.test(texto);
    const longitudAdecuada = texto.length >= 10 && texto.length <= 500;
    const diversidadPalabras = new Set(palabras).size / palabras.length > 0.6;
    
    return tieneVerbos && longitudAdecuada && diversidadPalabras;
  }

  /**
   * ✅ NUEVO: CALCULAR PORCENTAJE DE PALABRAS VÁLIDAS
   */
  private calcularPorcentajeValido(texto: string): number {
    const palabras = texto.trim().split(/\s+/);
    const palabrasValidas = palabras.filter(palabra => 
      palabra.length >= 2 && 
      /[a-zA-Záéíóúñ]/.test(palabra) &&
      !/^[0-9]+$/.test(palabra)
    );
    
    return palabras.length > 0 ? palabrasValidas.length / palabras.length : 0;
  }

  /**
   * DETECCIÓN BÁSICA LOCAL DE PALABRAS OFENSIVAS
   */
  private detectarPalabrasOfensivasBasico(texto: string): boolean {
    const palabrasOfensivas = [
      'puta', 'puto', 'mierda', 'cabron', 'imbecil', 'estupido', 'maricon',
      'verga', 'polla', 'coño', 'chocha', 'fuck', 'shit', 'bitch', 'asshole',
      'basura' // ✅ AGREGADO: Para detectar "eres una basura"
    ];

    const textoLimpio = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    return palabrasOfensivas.some(palabra => 
      textoLimpio.includes(palabra)
    );
  }

  /**
   * OBTENER RESULTADO DEL CACHE
   */
  private obtenerDeCache(texto: string): AnalisisTexto | null {
    const textoHash = this.generarHash(texto);
    const cached = this.cache.get(textoHash);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION_MS) {
      const detallesConCache = {
        ...cached.resultado.detalles,
        cacheUsado: true
      } as AnalisisTexto['detalles'] & { cacheUsado?: boolean };
      
      return { 
        ...cached.resultado, 
        detalles: detallesConCache 
      };
    }
    
    // Limpiar entrada expirada
    if (cached) {
      this.cache.delete(textoHash);
    }
    
    return null;
  }

  /**
   * GUARDAR RESULTADO EN CACHE
   */
  private guardarEnCache(texto: string, resultado: AnalisisTexto): void {
    const textoHash = this.generarHash(texto);
    
    // Limitar tamaño del cache
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    
    this.cache.set(textoHash, {
      resultado: { ...resultado },
      timestamp: Date.now()
    });
  }

  /**
   * GENERAR HASH PARA CACHE
   */
  private generarHash(texto: string): string {
    if (texto.length <= 50) {
      return texto.toLowerCase().replace(/\s+/g, '_');
    }
    
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
      const char = texto.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private crearRespuestaError(razon: string): AnalisisTexto {
    const detalles: DetallesAnalisisMejorado = {
      metodo: 'error',
      intencion: 'sinsentido',
      calidadTexto: { 
        tieneSentido: false, 
        porcentajePalabrasValidas: 0, 
        razon 
      },
      longitud: 0
    };

    return {
      esAprobado: false,
      puntuacion: 0.1,
      palabrasOfensivas: [],
      razon,
      detalles: detalles as AnalisisTexto['detalles']
    };
  }

 /**
   * ANALIZAR TEXTO CON PERSPECTIVE API + ANÁLISIS DE COHERENCIA
   */
  async analizarTexto(texto: string): Promise<AnalisisTexto> {
    if (!texto?.trim()) {
      return this.crearRespuestaError('Texto vacío o muy corto');
    }

    console.log(`\n📝 Analizando texto: "${texto.substring(0, 50)}..."`);

    // Verificar cache primero
    const cachedResult = this.obtenerDeCache(texto);
    if (cachedResult) {
      console.log('💾 Resultado obtenido de cache');
      return cachedResult;
    }

    // ✅ PRIMERO: Análisis de coherencia local (siempre se ejecuta)
    const analisisCoherencia = this.analizarCoherenciaTexto(texto);
    
    try {
      const perspectiveResult = await this.analizarConPerspective(texto);
      
      console.log('🔍 Resultado Perspective:', {
        toxicidad: perspectiveResult.TOXICITY,
        categorias: Object.keys(perspectiveResult).filter(key => 
          (perspectiveResult[key] || 0) > 0.7
        )
      });

      // ✅ COMBINAR: Análisis de toxicidad + coherencia
      const esToxico = (perspectiveResult.TOXICITY || 0) >= 0.5;
      const esCoherente = analisisCoherencia.tieneSentido;
      
      const esAprobado = !esToxico && esCoherente;
      const puntuacion = this.calcularPuntuacionCombinada(perspectiveResult, analisisCoherencia);
      const razon = this.generarRazonCombinada(perspectiveResult, analisisCoherencia);
      const intencion = this.determinarIntencionCombinada(perspectiveResult, analisisCoherencia);

      console.log(`📊 RESULTADO: Aprobado=${esAprobado}, Puntuación=${puntuacion}`);
      console.log(`🔍 Coherencia: ${esCoherente ? '✅ CON SENTIDO' : '❌ SIN SENTIDO'}`);
      console.log(`🔍 Toxicidad: ${esToxico ? '🚨 TÓXICO' : '✅ LIMPIO'}`);

      const detalles: DetallesAnalisisMejorado = {
        metodo: 'google-perspective-api + analisis-coherencia',
        intencion,
        calidadTexto: {
          tieneSentido: analisisCoherencia.tieneSentido,
          porcentajePalabrasValidas: analisisCoherencia.porcentajeValido,
          razon: analisisCoherencia.razon,
          confianza: analisisCoherencia.confianza
        },
        longitud: texto.length,
        tienePatronesSpam: false,
        perspectiveScores: perspectiveResult
      };

      const resultado: AnalisisTexto = {
        esAprobado,
        puntuacion,
        palabrasOfensivas: this.extraerCategoriasActivas(perspectiveResult),
        razon,
        detalles: detalles as AnalisisTexto['detalles']
      };

      // Guardar en cache
      this.guardarEnCache(texto, resultado);

      return resultado;

    } catch (error: any) {
      console.error('❌ Error en Perspective API:', error.message);
      
      // ✅ FALLBACK: Usar solo análisis de coherencia local
      return this.usarFallbackConCoherencia(texto, analisisCoherencia);
    }
  }

  /**
   * ✅ NUEVO: ANÁLISIS AVANZADO DE COHERENCIA
   */
  private analizarCoherenciaTexto(texto: string): {
    tieneSentido: boolean;
    porcentajeValido: number;
    razon: string;
    confianza: number;
    problemas: string[];
  } {
    const textoLimpio = texto.trim();
    const palabras = textoLimpio.split(/\s+/).filter(p => p.length > 0);
    
    if (palabras.length === 0) {
      return {
        tieneSentido: false,
        porcentajeValido: 0,
        razon: 'Texto vacío',
        confianza: 1.0,
        problemas: ['vacio']
      };
    }

    // 1. Análisis de longitud
    if (textoLimpio.length < 5) {
      return {
        tieneSentido: false,
        porcentajeValido: 0,
        razon: 'Texto demasiado corto',
        confianza: 0.9,
        problemas: ['muy_corto']
      };
    }

    // 2. Detección de texto aleatorio/teclado
    if (this.esTextoAleatorio(textoLimpio)) {
      return {
        tieneSentido: false,
        porcentajeValido: 0,
        razon: 'Texto sin sentido (patrón aleatorio)',
        confianza: 0.95,
        problemas: ['aleatorio']
      };
    }

    // 3. Detección de caracteres repetidos
    if (this.tieneCaracteresRepetidos(textoLimpio)) {
      return {
        tieneSentido: false,
        porcentajeValido: 0,
        razon: 'Texto sin sentido (caracteres repetidos)',
        confianza: 0.9,
        problemas: ['repetitivo']
      };
    }

    // 4. Análisis de palabras válidas
    const palabrasValidas = palabras.filter(palabra => 
      this.esPalabraValida(palabra)
    );
    const porcentajeValido = palabras.length > 0 ? palabrasValidas.length / palabras.length : 0;

    // 5. Análisis de estructura gramatical
    const tieneEstructura = this.tieneEstructuraGramatical(textoLimpio);
    
    // 6. Análisis de diversidad léxica
    const diversidadLexica = new Set(palabras).size / palabras.length;

    // 7. Calcular puntuación de coherencia
    const problemas: string[] = [];
    let puntuacionCoherencia = 1.0;
    let razon = 'Texto coherente';

    // Penalizaciones
    if (porcentajeValido < 0.3) {
      puntuacionCoherencia -= 0.6;
      problemas.push('pocas_palabras_validas');
    } else if (porcentajeValido < 0.6) {
      puntuacionCoherencia -= 0.3;
      problemas.push('calidad_media');
    }

    if (!tieneEstructura) {
      puntuacionCoherencia -= 0.4;
      problemas.push('sin_estructura');
    }

    if (diversidadLexica < 0.3 && palabras.length > 5) {
      puntuacionCoherencia -= 0.3;
      problemas.push('poca_diversidad');
    }

    // Determinar si tiene sentido
    const tieneSentido = puntuacionCoherencia >= 0.6 && porcentajeValido >= 0.3;

    if (!tieneSentido) {
      if (porcentajeValido < 0.2) {
        razon = 'Texto sin sentido (muy pocas palabras válidas)';
      } else if (!tieneEstructura) {
        razon = 'Texto sin estructura gramatical clara';
      } else if (diversidadLexica < 0.3) {
        razon = 'Texto repetitivo y sin diversidad';
      } else {
        razon = 'Texto de baja calidad';
      }
    }

    console.log(`🧠 Análisis coherencia: ${tieneSentido ? '✅' : '❌'}`, {
      palabras: palabras.length,
      validas: palabrasValidas.length,
      porcentajeValido: Math.round(porcentajeValido * 100) + '%',
      estructura: tieneEstructura,
      diversidad: Math.round(diversidadLexica * 100) + '%',
      puntuacion: Math.round(puntuacionCoherencia * 100) + '%',
      problemas: problemas.join(', ')
    });

    return {
      tieneSentido,
      porcentajeValido,
      razon,
      confianza: puntuacionCoherencia,
      problemas
    };
  }

  /**
   * ✅ DETECTAR TEXTO ALEATORIO (como "jkvjdsbvdsh dsjkldshvc")
   */
  private esTextoAleatorio(texto: string): boolean {
    const textoLimpio = texto.toLowerCase().replace(/\s+/g, '');
    
    // Patrones de teclado (filas del teclado)
    const patronesTeclado = [
      /^[qwertyuiop]+$/,      // Fila superior
      /^[asdfghjkl]+$/,       // Fila central  
      /^[zxcvbnm]+$/,         // Fila inferior
      /^[poiuytrewq]+$/,      // Fila superior invertida
      /^[lkjhgfdsa]+$/,       // Fila central invertida
      /^[mnbvcxz]+$/,         // Fila inferior invertida
    ];

    // Verificar patrones de teclado
    for (const patron of patronesTeclado) {
      if (patron.test(textoLimpio)) {
        console.log(`🔍 Patrón de teclado detectado: ${patron}`);
        return true;
      }
    }

    // Verificar secuencias sin vocales (muy sospechoso)
    const sinVocales = textoLimpio.replace(/[aeiouáéíóú]/gi, '');
    const ratioSinVocales = sinVocales.length / textoLimpio.length;
    
    if (ratioSinVocales > 0.8 && textoLimpio.length > 8) {
      console.log(`🔍 Muchas consonantes seguidas: ${ratioSinVocales.toFixed(2)}`);
      return true;
    }

    // Verificar repetición de patrones cortos
    const patronesRepetitivos = [
      /(.)\1{4,}/,           // Mismo carácter 5+ veces
      /(..)\1{3,}/,          // 2 caracteres repetidos 4+ veces
      /(...)\1{3,}/,         // 3 caracteres repetidos 4+ veces
    ];

    for (const patron of patronesRepetitivos) {
      if (patron.test(textoLimpio)) {
        console.log(`🔍 Patrón repetitivo detectado: ${patron}`);
        return true;
      }
    }

    return false;
  }

  /**
   * ✅ DETECTAR CARACTERES REPETIDOS
   */
  private tieneCaracteresRepetidos(texto: string): boolean {
    const textoLimpio = texto.toLowerCase().replace(/\s+/g, '');
    
    // Carácter repetido muchas veces
    if (/(.)\1{5,}/.test(textoLimpio)) {
      return true;
    }

    // Muy poca diversidad de caracteres
    const caracteresUnicos = new Set(textoLimpio);
    const ratioDiversidad = caracteresUnicos.size / textoLimpio.length;
    
    return ratioDiversidad < 0.3 && textoLimpio.length > 10;
  }

  /**
   * ✅ VERIFICAR SI UNA PALABRA ES VÁLIDA
   */
  private esPalabraValida(palabra: string): boolean {
    const palabraLimpia = palabra.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Palabras muy cortas pueden ser válidas si son comunes
    if (palabraLimpia.length <= 2) {
      const palabrasCortasValidas = new Set(['si', 'no', 'ya', 'a', 'y', 'o', 'de', 'en', 'el', 'la', 'un', 'una']);
      return palabrasCortasValidas.has(palabraLimpia);
    }

    // Verificar en diccionario
    if (this.diccionarioEspanol.has(palabraLimpia)) {
      return true;
    }

    // Verificar patrones de palabras válidas
    const tieneVocales = /[aeiouáéíóú]/i.test(palabraLimpia);
    const tieneConsonantes = /[bcdfghjklmnpqrstvwxyz]/i.test(palabraLimpia);
    const estructuraValida = /^[a-záéíóúñ]+$/i.test(palabraLimpia);
    
    return tieneVocales && tieneConsonantes && estructuraValida;
  }

  /**
   * ✅ VERIFICAR ESTRUCTURA GRAMATICAL BÁSICA
   */
  private tieneEstructuraGramatical(texto: string): boolean {
    const palabras = texto.trim().split(/\s+/);
    
    if (palabras.length < 3) return true; // Textos cortos pueden no tener estructura clara
    
    // Verificar presencia de palabras funcionales (artículos, preposiciones, etc.)
    const palabrasFuncionales = new Set([
      'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'en', 'con', 'por', 
      'para', 'sin', 'sobre', 'bajo', 'y', 'o', 'pero', 'porque', 'aunque', 'si', 'no'
    ]);
    
    const tieneFuncionales = palabras.some(palabra => 
      palabrasFuncionales.has(palabra.toLowerCase())
    );

    // Verificar presencia de verbos comunes
    const verbosComunes = new Set([
      'es', 'son', 'era', 'fueron', 'está', 'están', 'estaba', 'estaban', 'tengo', 
      'tiene', 'tenía', 'tenían', 'puedo', 'puede', 'podía', 'podían', 'quiero', 
      'quiere', 'quería', 'querían', 'voy', 'va', 'iba', 'iban', 'veo', 've', 'veía', 
      'veían', 'digo', 'dice', 'decía', 'decían', 'hago', 'hace', 'hacía', 'hacían'
    ]);
    
    const tieneVerbos = palabras.some(palabra => 
      verbosComunes.has(palabra.toLowerCase())
    );

    return tieneFuncionales || tieneVerbos || palabras.length <= 5;
  }

  /**
   * ✅ CALCULAR PUNTUACIÓN COMBINADA (Toxicidad + Coherencia)
   */
  private calcularPuntuacionCombinada(
    perspectiveScores: { [key: string]: number },
    coherencia: { confianza: number; tieneSentido: boolean }
  ): number {
    const toxicidad = perspectiveScores.TOXICITY || 0;
    const severidad = perspectiveScores.SEVERE_TOXICITY || 0;
    const insulto = perspectiveScores.INSULT || 0;
    const amenaza = perspectiveScores.THREAT || 0;

    // Puntuación de toxicidad (inversa)
    const maxToxicidad = Math.max(toxicidad, severidad, insulto, amenaza);
    const puntuacionToxicidad = Math.max(0.1, 1.0 - maxToxicidad);

    // Puntuación de coherencia
    const puntuacionCoherencia = coherencia.tieneSentido ? coherencia.confianza : 0.2;

    // Combinar ambas puntuaciones (50% toxicidad, 50% coherencia)
    const puntuacionFinal = (puntuacionToxicidad * 0.5) + (puntuacionCoherencia * 0.5);

    return Math.round(puntuacionFinal * 100) / 100;
  }

  /**
   * ✅ GENERAR RAZÓN COMBINADA
   */
  private generarRazonCombinada(
    perspectiveScores: { [key: string]: number },
    coherencia: { razon: string; tieneSentido: boolean }
  ): string {
    const categoriasToxicas = Object.entries(perspectiveScores)
      .filter(([category, score]) => (score || 0) > 0.7)
      .map(([category]) => this.traducirCategoria(category));

    if (categoriasToxicas.length > 0 && !coherencia.tieneSentido) {
      return `Contenido tóxico y sin sentido: ${categoriasToxicas.join(', ')} + ${coherencia.razon}`;
    } else if (categoriasToxicas.length > 0) {
      return `Contenido no aprobado: ${categoriasToxicas.join(', ')}`;
    } else if (!coherencia.tieneSentido) {
      return `Contenido no aprobado: ${coherencia.razon}`;
    } else {
      return 'Contenido aprobado';
    }
  }

  /**
   * ✅ DETERMINAR INTENCIÓN COMBINADA
   */
  private determinarIntencionCombinada(
    perspectiveScores: { [key: string]: number },
    coherencia: { tieneSentido: boolean; problemas: string[] }
  ): string {
    const toxicidad = perspectiveScores.TOXICITY || 0;
    const severidad = perspectiveScores.SEVERE_TOXICITY || 0;
    const amenaza = perspectiveScores.THREAT || 0;

    // Priorizar toxicidad
    if (amenaza > 0.8 || severidad > 0.8) {
      return 'peligroso';
    } else if (toxicidad > 0.7) {
      return 'ofensivo';
    } else if (!coherencia.tieneSentido) {
      return 'sinsentido';
    } else if (toxicidad > 0.5) {
      return 'sospechoso';
    }

    return 'inocente';
  }

  /**
   * ✅ FALLBACK MEJORADO CON COHERENCIA
   */
  private usarFallbackConCoherencia(texto: string, coherencia: any): AnalisisTexto {
    console.log('🔄 Usando análisis local mejorado (fallback)');
    
    // Combinar análisis de coherencia con detección básica de ofensividad
    const deteccionOfensiva = this.detectarContenidoOfensivoLocal(texto);
    const esAprobado = coherencia.tieneSentido && !deteccionOfensiva.esOfensivo;

    const puntuacion = this.calcularPuntuacionCombinada(
      { TOXICITY: deteccionOfensiva.esOfensivo ? 0.8 : 0.1 },
      coherencia
    );

    const detalles: DetallesAnalisisMejorado = {
      metodo: 'fallback-local-con-coherencia',
      intencion: deteccionOfensiva.intencion,
      calidadTexto: {
        tieneSentido: coherencia.tieneSentido,
        porcentajePalabrasValidas: coherencia.porcentajeValido,
        razon: coherencia.razon,
        confianza: coherencia.confianza
      },
      longitud: texto.length,
      tienePatronesSpam: false
    };

    return {
      esAprobado,
      puntuacion,
      palabrasOfensivas: deteccionOfensiva.palabrasOfensivas,
      razon: esAprobado ? 'Contenido aprobado (análisis local)' : 
             `${deteccionOfensiva.esOfensivo ? deteccionOfensiva.razon + '; ' : ''}${coherencia.razon}`,
      detalles: detalles as AnalisisTexto['detalles']
    };
  }

  // Métodos de compatibilidad
  limpiarTexto(texto: string): string {
    return texto;
  }

  agregarPalabrasProhibidas(_palabras: string[]): void {
    console.log('⚠️ Método no disponible en modo Perspective API');
  }

  agregarEjemplosBasura(_ejemplos: string[]): void {
    console.log('⚠️ Método no disponible en modo Perspective API');
  }
}