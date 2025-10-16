// components/LocationPermissionDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Locate, MapPin, Shield, AlertTriangle } from 'lucide-react';

interface LocationPermissionDialogProps {
  isOpen: boolean;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}

export const LocationPermissionDialog: React.FC<LocationPermissionDialogProps> = ({
  isOpen,
  onAccept,
  onReject,
  onClose
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Locate className="h-5 w-5 text-blue-600" />
            Acceso a tu ubicación
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="bg-blue-50 border-blue-200">
            <MapPin className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Para mostrarte rutas desde tu ubicación actual, necesitamos tu permiso.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <Shield className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-800">Tu privacidad es importante</p>
                <p className="text-xs">Tu ubicación solo se usa para calcular rutas y no se almacena</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-800">Rutas más precisas</p>
                <p className="text-xs">Obten indicaciones exactas desde donde te encuentras</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-800">Sin acceso limitado</p>
                <p className="text-xs">Al rechazar, solo podrás ver rutas desde puntos fijos</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onReject}
            className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Rechazar
          </Button>
          <Button
            onClick={onAccept}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Permitir ubicación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};