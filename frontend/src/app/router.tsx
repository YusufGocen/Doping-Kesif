import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { RequireSession } from './RequireSession';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteErrorPage } from './pages/RouteErrorPage';

/** Only implemented screens are routable. Future game routes belong to their feature modules. */
export const routes: RouteObject[] = [
  {
    path: '/giris',
    lazy: async () => ({ Component: (await import('./pages/LoginPage')).default }),
    HydrateFallback: () => <p role="status">Giriş yükleniyor…</p>,
  },
  {
    element: <RequireSession />,
    errorElement: <RouteErrorPage />,
    HydrateFallback: () => (
      <div className="route-state" role="status">
        Keşif yükleniyor…
      </div>
    ),
    children: [
      { path: '/', element: <Navigate to="/kesif" replace /> },
      {
        path: '/kesif',
        lazy: async () => ({
          Component: (await import('./pages/DiscoveryEntryPage')).default,
        }),
      },
      {
        path: '/kesif/ayarlar',
        lazy: async () => ({ Component: (await import('./pages/DiscoverySettingsPage')).default }),
      },
      {
        path: '/kesif/arkadas',
        lazy: async () => ({ Component: (await import('./pages/FriendSelectionPage')).default }),
      },
      {
        path: '/kesif/lobi/:id',
        lazy: async () => ({ Component: (await import('./pages/RoomLobbyPage')).default }),
      },
      {
        path: '/kesif/oyun/:id',
        lazy: async () => ({ Component: (await import('./pages/GamePage')).default }),
      },
      {
        path: '/kesif/sonuc/:id',
        lazy: async () => ({ Component: (await import('./pages/ResultPage')).default }),
      },
      {
        path: '/kesif/koleksiyon',
        lazy: async () => ({ Component: (await import('./pages/CollectionPage')).default }),
      },
      {
        path: '/kesif/koleksiyon/:id',
        lazy: async () => ({ Component: (await import('./pages/CollectionDetailPage')).default }),
      },
      {
        path: '/kesif/eslesme',
        lazy: async () => ({ Component: (await import('./pages/PlayMethodPage')).default }),
      },
      {
        path: '/kesif/oda',
        lazy: async () => ({ Component: (await import('./pages/RoomCodePage')).default }),
      },
      {
        path: '/kesif/oda/:id/paylas',
        lazy: async () => ({ Component: (await import('./pages/RoomSharePage')).default }),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
