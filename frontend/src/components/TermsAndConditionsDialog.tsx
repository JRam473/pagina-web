// components/TermsAndConditionsDialog.tsx
import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon, CheckCircle2, Shield, Lock, EyeOff } from 'lucide-react';

interface TermsAndConditionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  placeName: string;
}

export const TermsAndConditionsDialog = ({
  isOpen,
  onClose,
  onAccept,
  placeName,
}: TermsAndConditionsDialogProps) => {
  const [accepted, setAccepted] = useState(false);
  const [understood, setUnderstood] = useState(false);

  // Reset estados cuando el diálogo se abre
  useEffect(() => {
    if (isOpen) {
      setAccepted(false);
      setUnderstood(false);
    }
  }, [isOpen]);

  // Manejo seguro de aceptación
  const handleAccept = useCallback(() => {
    if (accepted && understood) {
      try {
        onAccept();
        localStorage.setItem('rating_terms_accepted', 'true');
      } catch (error) {
        // Error completamente silenciado
      }
      // Cerrar siempre
      try {
        onClose();
      } catch (error) {
        // Error completamente silenciado
      }
    }
  }, [accepted, understood, onAccept, onClose]);

  // Manejo seguro de cancelar
  const handleCancel = useCallback(() => {
    try {
      onClose();
    } catch (error) {
      // Error completamente silenciado
    }
  }, [onClose]);

  // Manejo seguro de cambios de estado
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      handleCancel();
    }
  }, [handleCancel]);

  // Prevenir interacciones externas
  const handleInteractOutside = useCallback((event: Event) => {
    event.preventDefault();
  }, []);

  const handleEscapeKeyDown = useCallback((event: KeyboardEvent) => {
    event.preventDefault();
  }, []);

  // Manejar tecla Enter
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (event.key === 'Enter' && accepted && understood) {
        event.preventDefault();
        handleAccept();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, accepted, understood, handleAccept]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] bg-white border-2 border-blue-200 shadow-2xl flex flex-col"
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleEscapeKeyDown}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        {/* HEADER FIJO */}
        <DialogHeader className="border-b border-gray-200 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate">Términos y Condiciones</div>
              <DialogDescription className="text-sm text-gray-600 mt-1 truncate">
                Para calificar "{placeName}"
              </DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* CONTENIDO SCROLLABLE */}
        <div className="flex-1 overflow-y-auto pr-4">
          <div className="space-y-6 py-2 px-1">
            <Alert className="bg-blue-50 border-blue-200">
              <InfoIcon className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Tu privacidad es importante para nosotros. Usamos métodos seguros para proteger tu información.
              </AlertDescription>
            </Alert>

            {/* --- Contenido general --- */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>¿Cómo funciona el sistema de calificaciones?</span>
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900">Identificación por Navegador</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Generamos un identificador único basado en la configuración de tu navegador para evitar calificaciones duplicadas.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                  <EyeOff className="w-6 h-6 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900">Dirección IP Anónima</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Usamos tu dirección IP de forma anónima para prevenir abusos. <strong>No almacenamos tu IP completa</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900">Sin Datos Personales</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      No requerimos información personal para calificar lugares.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Política */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Política de Privacidad</h3>
              <div className="space-y-3 text-sm bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div><strong>Recopilación:</strong> Solo info técnica (hash navegador, IP anonimizada)</div>
                <div><strong>Uso:</strong> Exclusivamente para prevenir duplicados</div>
                <div><strong>Almacenamiento:</strong> Eliminación automática tras 24 meses</div>
                <div><strong>Compartición:</strong> Nunca compartimos tus datos</div>
              </div>
            </div>

            {/* Derechos */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Tus Derechos</h3>
              <ul className="space-y-2 text-sm list-disc list-inside bg-green-50 p-4 rounded-lg border border-green-200">
                <li>Puedes calificar sin cuenta</li>
                <li>Modificar tu calificación en cualquier momento</li>
                <li>Contribuyes a mejorar la experiencia de todos</li>
                <li>Solicitar eliminación de tus datos</li>
              </ul>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 w-full pt-4 border-t border-gray-200">
              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Checkbox
                  id="terms"
                  checked={accepted}
                  onCheckedChange={(checked) => setAccepted(checked === true)}
                  className="mt-0.5 data-[state=checked]:bg-blue-600"
                />
                <Label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                  Acepto los términos y condiciones
                </Label>
              </div>
              
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <Checkbox
                  id="understanding"
                  checked={understood}
                  onCheckedChange={(checked) => setUnderstood(checked === true)}
                  className="mt-0.5 data-[state=checked]:bg-green-600"
                />
                <Label htmlFor="understanding" className="text-sm font-medium cursor-pointer">
                  Entiendo que mi calificación se asocia a mi navegador actual
                </Label>
              </div>
            </div>
          </div>
        </div>

  {/* FOOTER FIJO */}
        <DialogFooter className="flex flex-col border-t pt-4 mt-4 space-y-4 sm:space-y-0 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:justify-end">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="border-gray-300 text-gray-700 hover:bg-gray-100 flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!accepted || !understood}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white disabled:opacity-50 flex-1 sm:flex-none"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Aceptar y Continuar
            </Button>
          </div>
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            Al aceptar, confirmas que has leído y comprendido nuestros términos
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};