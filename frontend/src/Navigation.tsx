import { useState, useEffect } from 'react';
import { Button } from './components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet';
import { Menu, MapPin, Phone, Mail, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthButton } from "./AuthButton"; // 👈 importa tu botón de auth

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);

      // progreso de scroll dinámico
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolledPercent = (winScroll / height) * 100;
      setScrollProgress(scrolledPercent);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { to: '/', label: 'Inicio', color: 'hover:text-green-300' },
    { to: '/turismo', label: 'Turismo', color: 'hover:text-green-300' },
    { to: '/cultura', label: 'Cultura', color: 'hover:text-orange-300' },
    { to: '/comunidad', label: 'Comunidad', color: 'hover:text-purple-300' },
    { to: '/galeria', label: 'Galería', color: 'hover:text-pink-300' },
    { to: '/contacto', label: 'Contacto', color: 'hover:text-blue-300' }
  ];

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-black/60 backdrop-blur-md shadow-md border-b border-white/10'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group cursor-pointer">
            <div className="relative">
              <div className="relative bg-gradient-to-r from-green-500 to-blue-600 p-3 rounded-full shadow-lg">
                <MapPin className="h-7 w-7 text-white" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
                San Juan Tahitic
              </span>
              <span className="text-xs text-white/80">
                Destino Natural Único
              </span>
            </div>
            <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={`relative px-4 py-2 rounded-xl text-white font-medium transition-all duration-300 hover:scale-105 ${item.color}`}
              >
                {item.label}
              </Link>
            ))}

            
            <AuthButton />
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative border border-white/40 bg-white/10 backdrop-blur-md shadow-lg"
                >
                  <Menu className="h-6 w-6 text-white" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[300px] bg-black/80 backdrop-blur-lg text-white border-l border-white/10"
              >
                <div className="flex flex-col mt-8 space-y-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsOpen(false)}
                      className="p-4 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}

                  {/* Contact info */}
                  <div className="mt-8 pt-4 border-t border-white/20">
                    <p className="text-sm font-medium text-white/90 mb-3">
                      Contacto
                    </p>
                    <div className="space-y-2 text-sm text-white/70">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-green-400" />
                        <span>+1 (555) 123-4567</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-blue-400" />
                        <span>info@sanjuantahitic.com</span>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-200"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
    </nav>
  );
}