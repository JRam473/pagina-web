// main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';

// App principal
import App from './App.tsx';
import { MinimalLayout } from './MinimalLayout';

// Rutas
import { HomePage } from './pages/HomePage';
import { TourismSection } from './pages/TourismSection.tsx';
import { CulturePage } from './pages/CulturePage';
import { CommunitySection } from './pages/CommunitySection.tsx';
import { GallerySection } from './pages/GallerySection.tsx';
import { ContactSection } from './ContactSection';
import { OAuthCallback } from './pages/OAuthCallback';
import { Login } from './pages/Login';
import { CalendarPage } from './pages/CalendarPage';
import { GastronomyPage } from './pages/GastronomyPage.tsx';

import { AuthProvider } from '@/hooks/useAuth'; 
import { ProtectedRoute } from './components/ProtectedRoute';
import { ProfilePage } from './pages/ProfilePage';
import { PanelPlaceSection } from './pages/PanelPlaceSection';
import { SilentErrorBoundary } from './components/SilentErrorBoundary';
import { SilentRouteError } from './components/SilentRouteError';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <SilentRouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'turismo', element: <TourismSection /> },
      { path: 'cultura', element: <CulturePage /> },
      { path: 'comunidad', element: <CommunitySection /> },
      { path: 'galeria', element: <GallerySection /> },
      { path: 'contacto', element: <ContactSection /> },
      {
        path: 'perfil',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        )
      },
      {
        path: 'admin/places',
        element: (
          <ProtectedRoute requireAdmin={true}>
            <PanelPlaceSection />
          </ProtectedRoute>
        )
      }
    ],
  },
  {
    path: '/login',
    element: (
      <MinimalLayout>
        <Login />
      </MinimalLayout>
    ),
  },
  {
    path: '/calendario-cultural',
    element: (
      <MinimalLayout>
        <CalendarPage />
      </MinimalLayout>
    )
  },
  {
    path: '/section-gastronomia',
    element: (
      <MinimalLayout>
        <GastronomyPage />
      </MinimalLayout>
    )
  },
  {
    path: '/oauth-callback',
    element: <OAuthCallback />,
  },
]);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('No se encontró el elemento root');
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <SilentErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </SilentErrorBoundary>
  </StrictMode>
);
// Fin de main.tsx