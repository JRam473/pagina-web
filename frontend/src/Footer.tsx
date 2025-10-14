import { MapPin, Phone, Mail, Facebook, Instagram, Twitter } from 'lucide-react';
import { AuthButton } from './AuthButton'; 
import { Link } from 'react-router-dom';

export function Footer() {
  const quickLinks = [
    { href: '/', label: 'Inicio' },
    { href: '/turismo', label: 'Atractivos Turísticos' },
    { href: '/cultura', label: 'Cultura' },
    { href: '/comunidad', label: 'Comunidad' },
    { href: '/galeria', label: 'Galería' },
    { href: '/contacto', label: 'Contacto' },
  ];

  const services = [
    'Tours Guiados',
    'Hospedaje Local',
    'Gastronomía Regional',
    'Artesanías',
    'Transporte',
    'Eventos Culturales'
  ];

  return (
    <footer className="bg-gray-950 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Información Principal */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <MapPin className="h-9 w-9 text-indigo-400" />
              <span className="text-3xl font-bold text-white tracking-wide">San Juan Tahitic</span>
            </div>
            <p className="text-gray-400 mb-8 max-w-md leading-relaxed">
              Un destino que combina belleza natural, riqueza cultural y calidez humana.
              Explora todo lo que nuestra comunidad tiene para ofrecerte.
            </p>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-indigo-400" />
                <span className="text-gray-400">San Juan Tahitic, Región Central</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-indigo-400" />
                <span className="text-gray-400">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-indigo-400" />
                <span className="text-gray-400">info@sanjuantahitic.com</span>
              </div>
            </div>
          </div>

          {/* Enlaces Rápidos */}
          <div>
            <h3 className="text-xl font-semibold mb-6 text-white">Explora</h3>
            <ul className="space-y-4">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.href}
                    className="text-gray-400 hover:text-indigo-400 transition-colors duration-300 text-lg font-medium"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Servicios */}
          <div>
            <h3 className="text-xl font-semibold mb-6 text-white">Servicios Clave</h3>
            <ul className="space-y-4">
              {services.map((service, index) => (
                <li key={index} className="text-gray-400 text-lg">
                  {service}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Redes Sociales, AuthButton y Copyright */}
        <div className="border-t border-gray-800 mt-12 pt-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex space-x-6 mb-6 md:mb-0">
              <button className="text-gray-400 hover:text-indigo-400 transition-colors duration-300 transform hover:scale-110">
                <Facebook className="h-7 w-7" />
              </button>
              <button className="text-gray-400 hover:text-indigo-400 transition-colors duration-300 transform hover:scale-110">
                <Instagram className="h-7 w-7" />
              </button>
              <button className="text-gray-400 hover:text-indigo-400 transition-colors duration-300 transform hover:scale-110">
                <Twitter className="h-7 w-7" />
              </button>
            </div>

            {/* Botón de Autenticación */}
            <div className="mb-6 md:mb-0">
              <AuthButton />
            </div>

            <div className="text-gray-500 text-sm text-center md:text-right">
              <p>&copy; 2025 San Juan Tahitic. Todos los derechos reservados.</p>
              <p className="mt-1">Desarrollado con ❤️ para nuestra comunidad</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}