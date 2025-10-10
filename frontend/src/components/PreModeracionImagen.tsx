// components/PreModeracionImagen.tsx (FRONTEND)
import { useState, useRef, useEffect } from 'react';
import { useModeracionImagen } from '../hooks/useModeracionImagen';

export const PreModeracionImagen = ({ 
  onAprobacionChange 
}: { 
  onAprobacionChange: (aprobado: boolean, razon?: string) => void 
}) => {
  const [imagen, setImagen] = useState<File | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const { modelo, inicializarModelo, analizarImagen } = useModeracionImagen();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Inicializar modelo al montar el componente
    inicializarModelo();
  }, [inicializarModelo]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !modelo) return;

    setImagen(file);
    setAnalizando(true);

    try {
      const resultado = await analizarImagen(file);
      onAprobacionChange(resultado.esAprobado, resultado.razon);
      
      if (!resultado.esAprobado) {
        alert(`⚠️ Esta imagen no cumple con nuestras políticas: ${resultado.razon}`);
      }
    } catch (error) {
      console.error('Error en pre-moderación:', error);
      onAprobacionChange(true); // En caso de error, permitir subida
    } finally {
      setAnalizando(false);
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={analizando || !modelo}
      />
      {analizando && <p>🔍 Analizando imagen...</p>}
      {!modelo && <p>🔄 Cargando sistema de moderación...</p>}
    </div>
  );
};