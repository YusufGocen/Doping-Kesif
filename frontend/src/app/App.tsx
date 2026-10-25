import { RouterProvider } from 'react-router-dom';
import type { RouterProviderProps } from 'react-router-dom';
import { AppProviders } from './providers/AppProviders';

export default function App({ router }: { router: RouterProviderProps['router'] }) {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
