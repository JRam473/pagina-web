// hooks/useModeracionDescripciones.ts - NUEVO HOOK ESPECÍFICO
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

export interface ResultadoAnalisisDescripcion {
  success: boolean;
  esAprobado: boolean;
  mensaje: string;
  motivo?: string;
  tipo?: string;
  campoEspecifico?: string;
  puntuacion?: number;
  detalles?: {
    problemas?: string[];
    sugerencias?: string[];
    analisisCompleto?: any;
    confianza?: number;
    recomendaciones?: string[];
  };
  timestamp?: string;
}

export const useModeracionDescripciones = () => {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  /**
   * ✅ Validar descripción de foto antes de guardar
   */
  const validarDescripcionFoto = async (descripcion: string): Promise<ResultadoAnalisisDescripcion> => {
    try {
      setCargando(true);
      setError(null);

      console.log('🔍 Validando descripción de foto:', descripcion.substring(0, 50) + '...');

      const response = await api.post<ResultadoAnalisisDescripcion>(
        '/api/lugares/moderacion/validar-descripcion-foto',
        { descripcion }
      );

      console.log('✅ Resultado validación descripción:', response.data);

      return response.data;

    } catch (err: any) {
      console.error('❌ Error validando descripción de foto:', err);
      
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Error al validar descripción';
      setError(errorMessage);

      toast({
        title: '❌ Error de validación',
        description: errorMessage,
        variant: 'destructive',
      });

      throw new Error(errorMessage);
    } finally {
      setCargando(false);
    }
  };

  /**
   * ✅ Analizar descripción de foto para obtener detalles
   */
  const analizarDescripcionFoto = async (descripcion: string): Promise<ResultadoAnalisisDescripcion> => {
    try {
      setCargando(true);
      setError(null);

      console.log('🔍 Analizando descripción de foto:', descripcion.substring(0, 50) + '...');

      const response = await api.post<ResultadoAnalisisDescripcion>(
        '/api/lugares/moderacion/analizar-descripcion-foto',
        { descripcion }
      );

      console.log('✅ Resultado análisis descripción:', response.data);

      return response.data;

    } catch (err: any) {
      console.error('❌ Error analizando descripción de foto:', err);
      
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Error al analizar descripción';
      setError(errorMessage);

      toast({
        title: '❌ Error de análisis',
        description: errorMessage,
        variant: 'destructive',
      });

      throw new Error(errorMessage);
    } finally {
      setCargando(false);
    }
  };

  /**
   * ✅ Validar texto general (para nombres y descripciones de lugares)
   */
  const validarTextoGeneral = async (texto: string, tipoCampo: string = 'general'): Promise<ResultadoAnalisisDescripcion> => {
    try {
      setCargando(true);
      setError(null);

      const response = await api.post<ResultadoAnalisisDescripcion>(
        '/api/lugares/moderacion/analizar-texto',
        { texto, tipo_campo: tipoCampo }
      );

      return response.data;

    } catch (err: any) {
      console.error('❌ Error validando texto general:', err);
      
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Error al validar texto';
      setError(errorMessage);

      throw new Error(errorMessage);
    } finally {
      setCargando(false);
    }
  };

  const limpiarError = () => {
    setError(null);
  };

  return {
    cargando,
    error,
    validarDescripcionFoto,
    analizarDescripcionFoto,
    validarTextoGeneral,
    limpiarError,
  };
};