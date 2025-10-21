// backend/src/utils/extraccionPDF.ts
import { createCanvas } from 'canvas';

// ✅ CORRECCIÓN: Usar la ruta correcta para pdfjs-dist
const pdfjsLib = require('pdfjs-dist/build/pdf');
const pdfParse = require('pdf-parse');

// ✅ CORRECCIÓN: Configuración del worker correcta
const pdfjsWorker = require('pdfjs-dist/build/pdf.worker.entry');
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export class ExtraccionPDF {
  
  /**
   * Extrae texto de un PDF usando pdf-parse (más confiable)
   */
  async extraerTexto(buffer: Buffer): Promise<{
    texto: string;
    paginas: number;
    metadata: any;
  }> {
    try {
      const data = await pdfParse(buffer);
      
      return {
        texto: data.text,
        paginas: data.numpages,
        metadata: data.info
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error extrayendo texto PDF:', errorMessage);
      throw new Error(`No se pudo extraer texto del PDF: ${errorMessage}`);
    }
  }

  /**
   * Extrae imágenes de un PDF usando pdfjs-dist
   */
  async extraerImagenes(buffer: Buffer): Promise<Buffer[]> {
    const imagenes: Buffer[] = [];
    
    try {
      // Cargar el PDF - método corregido
      const loadingTask = pdfjsLib.getDocument({ 
        data: buffer,
        // ✅ Agregar configuración para mejor compatibilidad
        isEvalSupported: false,
        useSystemFonts: true
      });
      const pdf = await loadingTask.promise;
      const numPaginas = pdf.numPages;

      for (let i = 1; i <= numPaginas; i++) {
        const pagina = await pdf.getPage(i);
        const imagenObjects = await this.extraerImagenesDePagina(pagina);
        imagenes.push(...imagenObjects);
      }

      console.log(`📄 PDF: ${numPaginas} páginas, ${imagenes.length} imágenes extraídas`);
      return imagenes;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('No se pudieron extraer imágenes del PDF:', errorMessage);
      return [];
    }
  }

  /**
   * Extrae imágenes de una página específica
   */
  private async extraerImagenesDePagina(pagina: any): Promise<Buffer[]> {
    const imagenes: Buffer[] = [];
    
    try {
      const operatorList = await pagina.getOperatorList();
      
      for (let i = 0; i < operatorList.fnArray.length; i++) {
        const fn = operatorList.fnArray[i];
        const args = operatorList.argsArray[i];
        
        // Buscar operadores de pintado de imagen - usar códigos numéricos
        // paintImageXObject = 83, paintJpegXObject = 84
        if (fn === 83 || fn === 84) {
          const imageName = args[0];
          try {
            const imageDict = await pagina.objs.get(imageName);
            
            if (imageDict && imageDict.data) {
              const imageBuffer = Buffer.from(imageDict.data);
              imagenes.push(imageBuffer);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn('Error obteniendo objeto de imagen:', errorMessage);
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('Error procesando operadores de imagen:', errorMessage);
    }
    
    return imagenes;
  }

  /**
   * Convierte una página PDF a imagen
   */
  async convertirPaginaAImagen(
    buffer: Buffer, 
    numeroPagina: number = 1
  ): Promise<Buffer> {
    try {
      const loadingTask = pdfjsLib.getDocument({ 
        data: buffer,
        isEvalSupported: false,
        useSystemFonts: true
      });
      const pdf = await loadingTask.promise;
      
      if (numeroPagina > pdf.numPages) {
        throw new Error(`La página ${numeroPagina} no existe`);
      }

      const pagina = await pdf.getPage(numeroPagina);
      const viewport = pagina.getViewport({ scale: 1.5 });
      
      // Crear canvas
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      
      // Renderizar página en canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await pagina.render(renderContext).promise;

      // Convertir canvas a buffer
      const imageBuffer = canvas.toBuffer('image/jpeg', { quality: 0.8 });
      
      return imageBuffer;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error convirtiendo página PDF a imagen:', errorMessage);
      throw new Error(`No se pudo convertir la página PDF a imagen: ${errorMessage}`);
    }
  }

  /**
   * Obtiene información básica del PDF
   */
  async obtenerInfoPDF(buffer: Buffer): Promise<{
    paginas: number;
    tamaño: number;
    tieneImagenes: boolean;
    esEscaneado: boolean;
  }> {
    try {
      const data = await pdfParse(buffer);
      
      // Intentar usar pdfjs-dist para análisis más detallado
      let tieneImagenes = false;
      let esEscaneado = data.text.trim().length < 50;
      
      try {
        const loadingTask = pdfjsLib.getDocument({ 
          data: buffer,
          isEvalSupported: false,
          useSystemFonts: true
        });
        const pdf = await loadingTask.promise;
        
        // Verificar si tiene imágenes analizando la primera página
        if (pdf.numPages > 0) {
          const primeraPagina = await pdf.getPage(1);
          const operatorList = await primeraPagina.getOperatorList();
          
          // Buscar operadores de imagen en la primera página usando códigos numéricos
          for (let i = 0; i < operatorList.fnArray.length; i++) {
            const fn = operatorList.fnArray[i];
            if (fn === 83 || fn === 84) { // paintImageXObject o paintJpegXObject
              tieneImagenes = true;
              break;
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('No se pudo analizar PDF con pdfjs-dist:', errorMessage);
      }

      return {
        paginas: data.numpages,
        tamaño: buffer.length,
        tieneImagenes,
        esEscaneado
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error obteniendo info PDF:', errorMessage);
      throw new Error(`No se pudo obtener información del PDF: ${errorMessage}`);
    }
  }
}