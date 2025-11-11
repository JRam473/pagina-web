// services/pdfAnalysisService.ts - VERSIÓN CON ESTRATEGIA INTELIGENTE CORREGIDA
import fs from 'fs';
import path from 'path';
import { ModeracionService } from './moderacionService';
import { ModeracionImagenService } from './moderacionImagenService';
import { PdfConversionService } from './pdfConversionService';

const pdfParse = require('pdf-parse');

// ✅ INTERFACES MEJORADAS
interface DatosPDF {
  texto: string;
  numPaginas: number;
  info: any;
  metadata: any;
  tipoContenido: 'texto' | 'imagenes' | 'mixto' | 'desconocido';
  confianzaTexto: number; // 0-1 qué tan confiable es la extracción de texto
  tieneImagenes: boolean;
}

interface AnalisisImagenes {
  esAprobado: boolean;
  motivo: string;
  riesgoImagenes: number;
  problemasDetectados: string[];
  ahorroCreditos: string;
  imagenesRechazadas: number;
  imagenesProcesadas: number;
  textoExtraidoDeImagenes: string;
  tipoPDF: 'escaneado' | 'digital' | 'mixto' | 'desconocido';
}

interface ResultadoAnalisisPDF {
  esAprobado: boolean;
  motivo: string;
  puntuacion: number;
  detalles?: any;
  metadata: any;
  estrategiaUsada: string;
}

interface GoogleVisionResult {
  texto: string;
  esAprobado: boolean;
  riesgoImagenes: number;
  problemasDetectados: string[];
  safeSearch: any;
  textoExtraido: string;
}

// ✅ TIPOS DE ESTRATEGIA
type EstrategiaAnalisis = 
  | 'solo_texto_local' 
  | 'texto_con_imagenes_aprobadas' 
  | 'imagenes_con_vision_para_texto'
  | 'solo_moderacion_imagenes'
  | 'fallback_basico';

export class PdfAnalysisService {
  private moderacionService: ModeracionService;
  private moderacionImagenService: ModeracionImagenService;
  private conversionService: PdfConversionService;
  private visionClient: any;
  private apiKey: string | null;
  private credentialsPath: string | null;

  constructor() {
    this.moderacionService = new ModeracionService();
    this.moderacionImagenService = new ModeracionImagenService();
    this.conversionService = new PdfConversionService();
    this.apiKey = process.env.GOOGLE_VISION_API_KEY || null;
    this.credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || null;
    this.visionClient = this.inicializarVisionClient();
  }

  /**
   * ✅ DETECCIÓN INTELIGENTE DEL TIPO DE PDF - CORREGIDO
   */
  private async analizarEstructuraPDF(rutaArchivo: string): Promise<DatosPDF> {
    try {
      console.log('🔍 Analizando estructura del PDF...');
      
      const dataBuffer = fs.readFileSync(rutaArchivo);
      const data = await pdfParse(dataBuffer);
      
      const texto = data.text || '';
      const textoLimpio = texto.trim();
      
      // Análisis de calidad del texto - CORREGIDO: Tipado explícito
      const lineas = textoLimpio.split('\n').filter((linea: string) => linea.trim().length > 0);
      const palabras = textoLimpio.split(/\s+/).filter((palabra: string) => palabra.length > 1);
      
      // Calcular métricas de calidad
      const longitudTexto = textoLimpio.length;
      const densidadPalabras = palabras.length / Math.max(1, lineas.length);
      const palabrasUnicas = new Set(palabras.map((p: string) => p.toLowerCase())).size;
      const ratioUnicidad = palabras.length > 0 ? palabrasUnicas / palabras.length : 0;
      
      // Determinar tipo de contenido
      let tipoContenido: 'texto' | 'imagenes' | 'mixto' | 'desconocido' = 'desconocido';
      let confianzaTexto = 0;
      let tieneImagenes = false;
      
      if (longitudTexto > 100) {
        // PDF con texto significativo
        if (densidadPalabras > 3 && ratioUnicidad > 0.5) {
          tipoContenido = 'texto';
          confianzaTexto = 0.9;
        } else if (densidadPalabras > 1) {
          tipoContenido = 'mixto';
          confianzaTexto = 0.6;
          tieneImagenes = true;
        }
      } else if (longitudTexto > 10 && longitudTexto <= 100) {
        // Posible PDF escaneado con poco texto extraíble
        tipoContenido = 'imagenes';
        confianzaTexto = 0.2;
        tieneImagenes = true;
      } else {
        // Muy poco texto, probablemente solo imágenes
        tipoContenido = 'imagenes';
        confianzaTexto = 0.1;
        tieneImagenes = true;
      }
      
      // Verificar metadatos para más pistas
      if (data.metadata && data.metadata.Producer) {
        const producer = data.metadata.Producer.toLowerCase();
        if (producer.includes('scanner') || producer.includes('ocr')) {
          tipoContenido = 'imagenes';
          confianzaTexto = 0.3;
          tieneImagenes = true;
        }
      }
      
      console.log('📊 Análisis de estructura PDF:', {
        tipoContenido,
        confianzaTexto,
        tieneImagenes,
        longitudTexto,
        densidadPalabras: densidadPalabras.toFixed(2),
        ratioUnicidad: ratioUnicidad.toFixed(2),
        numPaginas: data.numpages
      });
      
      return {
        texto: textoLimpio,
        numPaginas: data.numpages || 1,
        info: data.info || {},
        metadata: data.metadata || {},
        tipoContenido,
        confianzaTexto,
        tieneImagenes
      };
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.log('❌ Análisis de estructura falló:', errorMessage);
      
      return {
        texto: '',
        numPaginas: 1,
        info: { error: errorMessage },
        metadata: {},
        tipoContenido: 'desconocido',
        confianzaTexto: 0,
        tieneImagenes: true // Por defecto asumir que tiene imágenes
      };
    }
  }

  /**
   * ✅ ESTRATEGIA INTELIGENTE DE ANÁLISIS
   */
  private determinarEstrategia(datosPDF: DatosPDF): {
    estrategia: EstrategiaAnalisis;
    razon: string;
    necesitaImagenes: boolean;
    necesitaGoogleVision: boolean;
  } {
    const tieneVisionDisponible = !!(this.visionClient || this.apiKey);
    const umbralTextoConfiable = 0.7;
    
    // CASO 1: PDF con texto confiable
    if (datosPDF.confianzaTexto > umbralTextoConfiable && datosPDF.texto.length > 50) {
      return {
        estrategia: 'solo_texto_local',
        razon: 'PDF con texto confiable y suficiente contenido',
        necesitaImagenes: false,
        necesitaGoogleVision: false
      };
    }
    
    // CASO 2: PDF mixto con texto moderado
    if (datosPDF.confianzaTexto > 0.3 && datosPDF.tieneImagenes) {
      if (tieneVisionDisponible) {
        return {
          estrategia: 'texto_con_imagenes_aprobadas',
          razon: 'PDF mixto - analizar texto local e imágenes con moderación previa',
          necesitaImagenes: true,
          necesitaGoogleVision: true
        };
      } else {
        return {
          estrategia: 'solo_moderacion_imagenes',
          razon: 'PDF mixto - sin Google Vision, solo moderación de imágenes',
          necesitaImagenes: true,
          necesitaGoogleVision: false
        };
      }
    }
    
    // CASO 3: PDF escaneado (poco texto)
    if (datosPDF.confianzaTexto <= 0.3 && datosPDF.tieneImagenes) {
      if (tieneVisionDisponible) {
        return {
          estrategia: 'imagenes_con_vision_para_texto',
          razon: 'PDF escaneado - necesita Google Vision para extraer texto',
          necesitaImagenes: true,
          necesitaGoogleVision: true
        };
      } else {
        return {
          estrategia: 'solo_moderacion_imagenes', 
          razon: 'PDF escaneado - sin Google Vision, solo moderación básica',
          necesitaImagenes: true,
          necesitaGoogleVision: false
        };
      }
    }
    
    // CASO 4: Fallback
    return {
      estrategia: 'fallback_basico',
      razon: 'Caso no determinado - usar análisis básico',
      necesitaImagenes: false,
      necesitaGoogleVision: false
    };
  }

  /**
   * ✅ ANÁLISIS DE IMÁGENES CON EXTRACCIÓN DE TEXTO MEJORADA
   */
  private async analizarImagenesConTexto(
    rutaArchivo: string, 
    ipUsuario: string, 
    hashNavegador: string,
    estrategia: EstrategiaAnalisis
  ): Promise<AnalisisImagenes> {
    
    let archivosTemporales: string[] = [];
    let imagenesProcesadas = 0;
    let imagenesRechazadas = 0;
    let creditosAhorrados = 0;
    let riesgoTotal = 0;
    const problemas: string[] = [];
    let textoCombinado = '';
    let tipoPDF: 'escaneado' | 'digital' | 'mixto' | 'desconocido' = 'desconocido';
    
    try {
      console.log(`🖼️ Analizando imágenes con estrategia: ${estrategia}`);
      
      const imagenes = await this.convertirPDFaImagenes(rutaArchivo);
      archivosTemporales = [...imagenes];
      
      // Determinar si necesitamos Google Vision basado en la estrategia
      const necesitaVision = estrategia.includes('vision');
      const soloModeracion = estrategia === 'solo_moderacion_imagenes';
      
      for (let i = 0; i < imagenes.length; i++) {
        const rutaImagen = imagenes[i];
        
        if (!rutaImagen || !fs.existsSync(rutaImagen)) {
          problemas.push(`Página ${i + 1}: Imagen no disponible`);
          continue;
        }

        try {
          // 1. SIEMPRE hacer moderación local primero
          const resultadoModeracion = await this.moderacionImagenService.moderarImagen(
            rutaImagen, 
            ipUsuario, 
            hashNavegador
          );

          // Si la moderación local rechaza, NO procesar con Google Vision
          if (!resultadoModeracion.esAprobado) {
            imagenesRechazadas++;
            creditosAhorrados++;
            problemas.push(`Página ${i + 1}: ${resultadoModeracion.motivoRechazo}`);
            riesgoTotal += resultadoModeracion.puntuacionRiesgo;
            continue; // Saltar a la siguiente imagen
          }

          // 2. Si pasa moderación local y necesitamos Google Vision para texto
          if (necesitaVision && !soloModeracion) {
            try {
              const resultadoVision = await this.analizarConGoogleVision(rutaImagen);
              
              if (resultadoVision.textoExtraido) {
                textoCombinado += `--- Página ${i + 1} ---\n${resultadoVision.textoExtraido}\n\n`;
              }
              
              if (!resultadoVision.esAprobado) {
                imagenesRechazadas++;
                problemas.push(`Página ${i + 1}: ${resultadoVision.problemasDetectados.join(', ')}`);
              }
              
              riesgoTotal += Math.max(
                resultadoModeracion.puntuacionRiesgo,
                resultadoVision.riesgoImagenes
              );
              
            } catch (visionError: unknown) {
              // Si Google Vision falla, usar solo moderación local
              const errorMessage = visionError instanceof Error ? visionError.message : 'Error desconocido';
              console.warn(`⚠️ Google Vision falló para página ${i + 1}, usando moderación local:`, errorMessage);
              riesgoTotal += resultadoModeracion.puntuacionRiesgo;
              creditosAhorrados++; // Ahorramos crédito aunque falló
            }
          } else {
            // Solo moderación local
            riesgoTotal += resultadoModeracion.puntuacionRiesgo;
            if (soloModeracion) {
              creditosAhorrados++;
            }
          }
          
          imagenesProcesadas++;
          
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          console.error(`❌ Error página ${i + 1}:`, errorMessage);
          problemas.push(`Página ${i + 1}: Error en análisis`);
          riesgoTotal += 0.5;
        }
      }

      // Determinar tipo de PDF basado en texto extraído
      if (textoCombinado.length > 100) {
        tipoPDF = 'escaneado';
      } else if (imagenesRechazadas === 0 && imagenesProcesadas > 0) {
        tipoPDF = 'digital';
      } else if (imagenesRechazadas > 0) {
        tipoPDF = 'mixto';
      }

      // Limpiar archivos temporales
      await this.conversionService.cleanupImages(archivosTemporales);

      // Calcular métricas finales
      const riesgoPromedio = imagenesProcesadas > 0 ? riesgoTotal / imagenesProcesadas : 0;
      const esAprobado = problemas.length === 0 && riesgoPromedio < 0.7;
      const porcentajeAhorro = imagenes.length > 0 ? (creditosAhorrados / imagenes.length) * 100 : 0;
      
      let motivo = `Imágenes aprobadas (${tipoPDF})`;
      if (problemas.length > 0) {
        motivo = `Problemas detectados: ${problemas.join('; ')}`;
      }
      
      if (textoCombinado) {
        motivo += ` | Texto extraído: ${textoCombinado.length} caracteres`;
      }

      console.log(`✅ Análisis de imágenes completado:`, {
        estrategia,
        tipoPDF,
        imagenesProcesadas,
        imagenesRechazadas,
        creditosAhorrados,
        textoExtraido: textoCombinado.length,
        riesgoPromedio
      });

      return {
        esAprobado,
        motivo,
        riesgoImagenes: riesgoPromedio,
        problemasDetectados: problemas,
        ahorroCreditos: `${porcentajeAhorro.toFixed(1)}%`,
        imagenesRechazadas,
        imagenesProcesadas,
        textoExtraidoDeImagenes: textoCombinado,
        tipoPDF
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('❌ Análisis de imágenes falló:', errorMessage);
      
      if (archivosTemporales.length > 0) {
        await this.conversionService.cleanupImages(archivosTemporales);
      }
      
      return await this.analisisBasicoPDF(rutaArchivo);
    }
  }

  /**
   * ✅ LÓGICA PRINCIPAL MEJORADA CON ESTRATEGIA INTELIGENTE
   */
  async analizarTextoPDF(
    rutaArchivo: string, 
    ipUsuario: string, 
    hashNavegador: string
  ): Promise<ResultadoAnalisisPDF> {
    try {
      console.log('🧠 Iniciando análisis inteligente de PDF...');

      // 1. Analizar estructura del PDF
      const datosPDF = await this.analizarEstructuraPDF(rutaArchivo);
      
      // 2. Determinar la mejor estrategia
      const decision = this.determinarEstrategia(datosPDF);
      
      console.log('🎯 Estrategia seleccionada:', {
        estrategia: decision.estrategia,
        razon: decision.razon,
        tipoContenido: datosPDF.tipoContenido,
        confianzaTexto: datosPDF.confianzaTexto,
        tieneImagenes: datosPDF.tieneImagenes
      });

      let analisisImagenes: AnalisisImagenes = {
        esAprobado: true,
        motivo: 'No se necesitó análisis de imágenes',
        riesgoImagenes: 0.1,
        problemasDetectados: [],
        ahorroCreditos: '100%',
        imagenesRechazadas: 0,
        imagenesProcesadas: 0,
        textoExtraidoDeImagenes: '',
        tipoPDF: 'digital'
      };

      let textoParaAnalizar = '';
      let esAprobado = true;
      let motivo = '';
      let puntuacion = 0;

      // 3. Ejecutar según la estrategia
      switch (decision.estrategia) {
        case 'solo_texto_local':
          console.log('💰 EJECUTANDO: Solo análisis de texto local');
          textoParaAnalizar = this.limitarTexto(datosPDF.texto, 10000);
          const resultadoTexto = await this.moderacionService.moderarTexto(
            textoParaAnalizar,
            ipUsuario,
            hashNavegador
          );
          
          esAprobado = resultadoTexto.esAprobado;
          puntuacion = resultadoTexto.puntuacionGeneral;
          motivo = esAprobado ? 
            'PDF aprobado (contenido textual)' : 
            `Texto rechazado: ${resultadoTexto.motivoRechazo}`;
          break;

        case 'texto_con_imagenes_aprobadas':
          console.log('🔄 EJECUTANDO: Texto local + imágenes con moderación');
          // Combinar texto local con análisis de imágenes
          textoParaAnalizar = this.limitarTexto(datosPDF.texto, 5000);
          analisisImagenes = await this.analizarImagenesConTexto(
            rutaArchivo, 
            ipUsuario, 
            hashNavegador,
            decision.estrategia
          );
          
          // Si hay texto extraído de imágenes, agregarlo al análisis
          if (analisisImagenes.textoExtraidoDeImagenes) {
            textoParaAnalizar += '\n\n--- TEXTO DE IMÁGENES ---\n' + 
              analisisImagenes.textoExtraidoDeImagenes;
          }
          
          const resultadoCombinado = await this.moderacionService.moderarTexto(
            this.limitarTexto(textoParaAnalizar, 10000),
            ipUsuario,
            hashNavegador
          );
          
          esAprobado = resultadoCombinado.esAprobado && analisisImagenes.esAprobado;
          puntuacion = Math.max(resultadoCombinado.puntuacionGeneral, analisisImagenes.riesgoImagenes);
          motivo = esAprobado ? 
            'PDF aprobado (contenido mixto)' : 
            `Problemas en ${!resultadoCombinado.esAprobado ? 'texto' : 'imágenes'}`;
          break;

        case 'imagenes_con_vision_para_texto':
          console.log('🔍 EJECUTANDO: Imágenes con Google Vision para texto');
          analisisImagenes = await this.analizarImagenesConTexto(
            rutaArchivo, 
            ipUsuario, 
            hashNavegador,
            decision.estrategia
          );
          
          // Usar texto extraído de Google Vision para análisis
          if (analisisImagenes.textoExtraidoDeImagenes) {
            textoParaAnalizar = analisisImagenes.textoExtraidoDeImagenes;
            const resultadoVisionTexto = await this.moderacionService.moderarTexto(
              this.limitarTexto(textoParaAnalizar, 10000),
              ipUsuario,
              hashNavegador
            );
            
            esAprobado = resultadoVisionTexto.esAprobado && analisisImagenes.esAprobado;
            puntuacion = Math.max(resultadoVisionTexto.puntuacionGeneral, analisisImagenes.riesgoImagenes);
            motivo = esAprobado ? 
              'PDF escaneado aprobado' : 
              `Problemas en ${!resultadoVisionTexto.esAprobado ? 'texto extraído' : 'imágenes'}`;
          } else {
            // Solo análisis de imágenes
            esAprobado = analisisImagenes.esAprobado;
            puntuacion = analisisImagenes.riesgoImagenes;
            motivo = analisisImagenes.motivo;
          }
          break;

        case 'solo_moderacion_imagenes':
          console.log('🛡️ EJECUTANDO: Solo moderación de imágenes');
          analisisImagenes = await this.analizarImagenesConTexto(
            rutaArchivo, 
            ipUsuario, 
            hashNavegador,
            decision.estrategia
          );
          
          esAprobado = analisisImagenes.esAprobado;
          puntuacion = analisisImagenes.riesgoImagenes;
          motivo = analisisImagenes.motivo;
          break;

        default:
          console.log('🔄 EJECUTANDO: Fallback básico');
          analisisImagenes = await this.analisisBasicoPDF(rutaArchivo);
          esAprobado = analisisImagenes.esAprobado;
          puntuacion = analisisImagenes.riesgoImagenes;
          motivo = analisisImagenes.motivo;
          break;
      }

      return {
        esAprobado,
        motivo,
        puntuacion,
        detalles: {
          texto: textoParaAnalizar ? this.limitarTexto(textoParaAnalizar, 1000) : null,
          imagenes: analisisImagenes,
          estrategia: decision.estrategia,
          decision: decision.razon
        },
        metadata: {
          numPaginas: datosPDF.numPaginas,
          tipoContenido: datosPDF.tipoContenido,
          confianzaTexto: datosPDF.confianzaTexto,
          tieneImagenes: datosPDF.tieneImagenes,
          tipoPDF: analisisImagenes.tipoPDF,
          textoOriginalLength: datosPDF.texto.length,
          textoAnalizadoLength: textoParaAnalizar.length,
          usoGoogleVision: decision.necesitaGoogleVision,
          ahorroCreditos: analisisImagenes.ahorroCreditos,
          imagenesRechazadas: analisisImagenes.imagenesRechazadas,
          imagenesProcesadas: analisisImagenes.imagenesProcesadas
        },
        estrategiaUsada: decision.estrategia
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('❌ Error en análisis inteligente:', errorMessage);
      
      return {
        esAprobado: false,
        motivo: 'Error en el análisis del PDF',
        puntuacion: 1.0,
        metadata: {
          error: errorMessage,
          estrategia: 'fallback_error'
        },
        estrategiaUsada: 'error'
      };
    }
  }

  /**
   * ✅ INICIALIZAR CLIENTE CON CREDENCIALES JSON - VERSIÓN MEJORADA
   */
  private inicializarVisionClient(): any {
    try {
      // Opción 1: Usar archivo de credenciales JSON
      if (this.credentialsPath && fs.existsSync(this.credentialsPath)) {
        console.log('🔧 Configurando Google Vision con credenciales JSON...');
        
        // Establecer variable de entorno para Google Cloud SDK
        process.env.GOOGLE_APPLICATION_CREDENTIALS = this.credentialsPath;
        
        const vision = require('@google-cloud/vision');
        return new vision.ImageAnnotatorClient();
      }
      
      // Opción 2: Usar API Key directa
      if (this.apiKey) {
        console.log('🔧 Configurando Google Vision con API Key...');
        const vision = require('@google-cloud/vision');
        
        return new vision.ImageAnnotatorClient({
          key: this.apiKey,
          projectId: process.env.GOOGLE_CLOUD_PROJECT
        });
      }

      console.warn('⚠️ Google Vision API no configurada - necesita credenciales JSON o API Key');
      return null;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.warn('⚠️ Google Vision API no disponible:', errorMessage);
      return null;
    }
  }

  /**
   * ✅ VERIFICAR CREDENCIALES GOOGLE VISION - CORREGIDO
   */
  private async verificarCredencialesVision(): Promise<{ valido: boolean; mensaje: string; tipo: string }> {
    if (!this.visionClient) {
      return { valido: false, mensaje: 'Cliente no inicializado', tipo: 'none' };
    }

    try {
      // Intentar una operación simple para verificar las credenciales
      const result = await this.visionClient.safeSearchDetection({
        image: { content: Buffer.from('test') }
      }).catch((error: any) => { // ✅ CORREGIDO: Cambiado de GoogleVisionError a any
        console.log('❌ Error verificando credenciales:', error.message);
        return null;
      });

      if (result && Array.isArray(result) && result.length > 0) {
        const tipo = this.credentialsPath ? 'service_account' : 'api_key';
        return { 
          valido: true, 
          mensaje: 'Credenciales válidas', 
          tipo 
        };
      } else {
        return { valido: false, mensaje: 'Credenciales inválidas', tipo: 'unknown' };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('authentication')) {
        return { 
          valido: false, 
          mensaje: 'Error de autenticación: ' + errorMessage, 
          tipo: 'auth_error' 
        };
      }
      
      return { 
        valido: false, 
        mensaje: 'Error verificando credenciales: ' + errorMessage, 
        tipo: 'connection_error' 
      };
    }
  }

  /**
   * ✅ MÉTODO ALTERNATIVO CON REST API (FALLBACK) - CORREGIDO
   */
  private async analizarConGoogleVisionRest(rutaImagen: string): Promise<GoogleVisionResult> {
    if (!this.apiKey) {
      throw new Error('Google Vision API Key no configurada para REST fallback');
    }

    try {
      console.log('🔍 Usando REST API como fallback...');
      
      const imageBuffer = fs.readFileSync(rutaImagen);
      const base64Image = imageBuffer.toString('base64');

      const requests = {
        requests: [
          {
            image: { content: base64Image },
            features: [
              { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
              { type: 'SAFE_SEARCH_DETECTION', maxResults: 1 }
            ]
          }
        ]
      };

      const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`;
      
      const response = await fetch(visionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requests)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`REST API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as any;
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      const textAnnotation = result.responses?.[0]?.fullTextAnnotation;
      const safeSearchAnnotation = result.responses?.[0]?.safeSearchAnnotation;

      return this.procesarResultadoVision(
        textAnnotation?.text || '',
        safeSearchAnnotation
      );
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('❌ REST API fallback también falló:', errorMessage);
      throw error;
    }
  }

  /**
   * ✅ MÉTODO PRINCIPAL MEJORADO CON FALLBACKS - CORREGIDO
   */
  private async analizarConGoogleVision(rutaImagen: string): Promise<GoogleVisionResult> {
    if (!rutaImagen || !fs.existsSync(rutaImagen)) {
      throw new Error(`La imagen no existe: ${rutaImagen}`);
    }

    // Primero intentar con el cliente SDK
    if (this.visionClient) {
      try {
        console.log('🔍 Usando Google Vision SDK...');
        
        const imageBuffer = fs.readFileSync(rutaImagen);
        
        const [textResult] = await this.visionClient.documentTextDetection({
          image: { content: imageBuffer }
        });

        const [safeSearchResult] = await this.visionClient.safeSearchDetection({
          image: { content: imageBuffer }
        });

        const textoExtraido = textResult.fullTextAnnotation?.text || '';
        const safeSearch = safeSearchResult.safeSearchAnnotation;

        return this.procesarResultadoVision(textoExtraido, safeSearch);
        
      } catch (sdkError: unknown) {
        const errorMessage = sdkError instanceof Error ? sdkError.message : 'Error desconocido';
        console.log('🔄 SDK falló, intentando REST API...', errorMessage);
        
        // Fallback a REST API
        if (this.apiKey) {
          return await this.analizarConGoogleVisionRest(rutaImagen);
        } else {
          throw new Error('Sin métodos de autenticación disponibles');
        }
      }
    } else if (this.apiKey) {
      // Usar directamente REST API si no hay cliente SDK
      return await this.analizarConGoogleVisionRest(rutaImagen);
    } else {
      throw new Error('No hay métodos de autenticación configurados para Google Vision');
    }
  }

  /**
   * ✅ PROCESAR RESULTADO DE VISION (Lógica común)
   */
  private procesarResultadoVision(textoExtraido: string, safeSearch: any): GoogleVisionResult {
    const problemas: string[] = [];
    let riesgoTotal = 0;

    const configuracionSeguridad = {
      adulto: 'VERY_LIKELY',
      violencia: 'VERY_LIKELY', 
      medico: 'LIKELY',
      spoof: 'VERY_LIKELY',
      contenidoSugerente: 'VERY_LIKELY'
    };

    if (safeSearch) {
      if (safeSearch.adult === configuracionSeguridad.adulto) {
        problemas.push('contenido adulto explícito');
        riesgoTotal += 1.0;
      } else if (safeSearch.adult === 'LIKELY') {
        problemas.push('posible contenido adulto');
        riesgoTotal += 0.7;
      }

      if (safeSearch.violence === configuracionSeguridad.violencia) {
        problemas.push('contenido violento explícito');
        riesgoTotal += 1.0;
      } else if (safeSearch.violence === 'LIKELY') {
        problemas.push('posible contenido violento');
        riesgoTotal += 0.7;
      }

      if (safeSearch.medical === configuracionSeguridad.medico) {
        problemas.push('contenido médico explícito');
        riesgoTotal += 0.5;
      }

      if (safeSearch.spoof === configuracionSeguridad.spoof) {
        problemas.push('contenido engañoso');
        riesgoTotal += 0.3;
      }

      if (safeSearch.racy === configuracionSeguridad.contenidoSugerente) {
        problemas.push('contenido sugerente');
        riesgoTotal += 0.8;
      } else if (safeSearch.racy === 'LIKELY') {
        problemas.push('posible contenido sugerente');
        riesgoTotal += 0.5;
      }
    }

    const riesgoImagenes = Math.min(1.0, riesgoTotal);
    const esAprobado = problemas.length === 0;

    console.log(`📊 Resultado Vision: ${esAprobado ? '✅ Aprobado' : '❌ Rechazado'}, ${problemas.length} problemas`);

    return {
      texto: textoExtraido,
      esAprobado,
      riesgoImagenes,
      problemasDetectados: problemas,
      safeSearch,
      textoExtraido
    };
  }

  /**
   * ✅ CONVERTIR PDF A IMÁGENES - VERSIÓN SIMPLIFICADA
   */
  private async convertirPDFaImagenes(rutaArchivo: string): Promise<string[]> {
    console.log('🔄 Convirtiendo PDF a imágenes...');
    
    const resultado = await this.conversionService.convertPdfToImages(rutaArchivo);
    
    if (!resultado.success) {
      throw new Error(`Conversión fallida: ${resultado.error}`);
    }
    
    console.log(`✅ PDF convertido a ${resultado.images.length} imágenes usando ${resultado.method}`);
    return resultado.images;
  }

  /**
   * ✅ ANÁLISIS BÁSICO (FALLBACK) - CORREGIDO CON TODAS LAS PROPIEDADES
   */
  private async analisisBasicoPDF(rutaArchivo: string): Promise<AnalisisImagenes> {
    try {
      console.log('🔍 Usando análisis básico (fallback)...');
      
      const dataBuffer = fs.readFileSync(rutaArchivo);
      const data = await pdfParse(dataBuffer);
      const tieneTexto = data.text && data.text.trim().length > 0;
      
      if (tieneTexto) {
        return {
          esAprobado: true,
          motivo: 'PDF con texto legible - Análisis básico',
          riesgoImagenes: 0.1,
          problemasDetectados: [],
          ahorroCreditos: '100%',
          imagenesRechazadas: 0,
          imagenesProcesadas: 0,
          textoExtraidoDeImagenes: '', // ✅ AGREGADO
          tipoPDF: 'digital' // ✅ AGREGADO
        };
      } else {
        return {
          esAprobado: true,
          motivo: 'PDF sin texto - Análisis limitado disponible',
          riesgoImagenes: 0.5,
          problemasDetectados: [],
          ahorroCreditos: '100%',
          imagenesRechazadas: 0,
          imagenesProcesadas: 0,
          textoExtraidoDeImagenes: '', // ✅ AGREGADO
          tipoPDF: 'desconocido' // ✅ AGREGADO
        };
      }
    } catch (error) {
      return {
        esAprobado: true,
        motivo: 'Análisis básico falló - Aprobado por defecto',
        riesgoImagenes: 0.3,
        problemasDetectados: [],
        ahorroCreditos: '100%',
        imagenesRechazadas: 0,
        imagenesProcesadas: 0,
        textoExtraidoDeImagenes: '', // ✅ AGREGADO
        tipoPDF: 'desconocido' // ✅ AGREGADO
      };
    }
  }

  /**
   * ✅ EXTRACCIÓN DE TEXTO LOCAL
   */
  private async extraerTextoPDF(rutaArchivo: string): Promise<{
    texto: string;
    numPaginas: number;
    info: any;
    metadata: any;
    estrategia: string;
    tieneTextoLegible: boolean;
  }> {
    try {
      console.log('🔍 Intentando extracción local con pdf-parse...');
      
      const dataBuffer = fs.readFileSync(rutaArchivo);
      const data = await pdfParse(dataBuffer);
      
      const texto = data.text || '';
      const tieneTextoLegible = texto.trim().length >= 10;
      
      console.log('📊 Resultado extracción local:', {
        tieneTexto: tieneTextoLegible,
        longitudTexto: texto.length,
        numPaginas: data.numpages
      });
      
      return {
        texto,
        numPaginas: data.numpages || 0,
        info: data.info || {},
        metadata: data.metadata || {},
        estrategia: 'pdf-parse',
        tieneTextoLegible
      };
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.log('❌ Extracción local falló:', errorMessage);
      
      return {
        texto: '',
        numPaginas: 1,
        info: { error: errorMessage },
        metadata: {},
        estrategia: 'fallback',
        tieneTextoLegible: false
      };
    }
  }

  /**
   * Limitar tamaño del texto para análisis
   */
  private limitarTexto(texto: string, maxCaracteres: number): string {
    if (texto.length <= maxCaracteres) return texto;
    
    const mitad = Math.floor(maxCaracteres / 2);
    const inicio = texto.substring(0, mitad);
    const fin = texto.substring(texto.length - mitad);
    
    return inicio + '\n\n...[texto recortado]...\n\n' + fin;
  }

  /**
   * Validación rápida de PDF
   */
  async validarPDFBasico(rutaArchivo: string): Promise<{
    valido: boolean;
    error?: string;
    tamano?: number;
    esPDF?: boolean;
  }> {
    try {
      const stats = fs.statSync(rutaArchivo);
      
      if (stats.size > 10 * 1024 * 1024) {
        return {
          valido: false,
          error: 'El PDF es demasiado grande (máximo 10MB)',
          tamano: stats.size
        };
      }

      const buffer = Buffer.alloc(4);
      const fd = fs.openSync(rutaArchivo, 'r');
      fs.readSync(fd, buffer, 0, 4, 0);
      fs.closeSync(fd);
      
      const esPDF = buffer.toString().startsWith('%PDF');
      
      if (!esPDF) {
        return {
          valido: false,
          error: 'El archivo no es un PDF válido',
          esPDF: false
        };
      }

      return {
        valido: true,
        tamano: stats.size,
        esPDF: true
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return {
        valido: false,
        error: 'No se pudo validar el archivo PDF: ' + errorMessage
      };
    }
  }

  /**
   * ✅ VERIFICAR ESTADO DE LA API - MEJORADO
   */
  async verificarEstadoVisionAPI(): Promise<{ 
    disponible: boolean; 
    tipo: string;
    mensaje: string;
    credenciales: boolean;
  }> {
    const credencialesVerificadas = await this.verificarCredencialesVision();
    
    return {
      disponible: credencialesVerificadas.valido,
      tipo: this.credentialsPath ? 'service_account' : (this.apiKey ? 'api_key' : 'none'),
      mensaje: credencialesVerificadas.mensaje,
      credenciales: credencialesVerificadas.valido
    };
  }

  /**
   * ✅ OBTENER INFORMACIÓN DEL SERVICIO
   */
  obtenerInformacionServicio(): {
    visionDisponible: boolean;
    conversionDisponible: boolean;
    estrategia: string;
  } {
    return {
      visionDisponible: !!(this.visionClient || this.apiKey),
      conversionDisponible: true,
      estrategia: 'Optimizado: Google Vision solo para PDFs sin texto'
    };
  }
}