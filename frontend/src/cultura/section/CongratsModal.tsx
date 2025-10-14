// src/components/ui/CongratsModal.tsx
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface CongratsModalProps {
  show: boolean;
  onClose: () => void;
  pdfUrl: string;
}

export function CongratsModal({ show, onClose, pdfUrl }: CongratsModalProps) {
  useEffect(() => {
    if (show) {
      // Confeti al mostrarse
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-xl p-6 max-w-sm text-center shadow-lg"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">¡Felicidades!</h3>
            <p className="text-gray-700 mb-4">
              Has completado la Ruta de Experiencias y desbloqueaste los stickers.
            </p>
            <button
              onClick={() => window.open(pdfUrl, '_blank')}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Descargar Stickers
            </button>
            <button
              onClick={onClose}
              className="mt-3 text-gray-500 text-sm underline mb-8"
            >
              Cerrar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
