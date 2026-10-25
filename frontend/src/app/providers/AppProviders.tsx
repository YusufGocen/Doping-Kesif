import { RealtimeProvider } from './RealtimeProvider';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiProvider } from '@/shared/api/ApiProvider';
import { ApiError } from '@/shared/api/ApiError';
import { createApiClient } from '@/shared/api/client';
import { env } from '@/shared/config/env';
import { createSessionStore } from '@/shared/session/store';
import { SessionProvider } from '@/shared/session/SessionProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  const [sessionStore] = useState(createSessionStore);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30000,
            retry: (count, error) =>
              count < 1 &&
              error instanceof ApiError &&
              (error.code === 'NETWORK_ERROR' || error.status >= 500),
          },
          mutations: { retry: false },
        },
      }),
  );
  const [apiClient] = useState(() =>
    createApiClient({
      baseUrl: env.apiBaseUrl,
      getAccessToken: sessionStore.getAccessToken,
      onUnauthorized: sessionStore.unauthorized,
    }),
  );
  useEffect(() => {
    let token = sessionStore.getSnapshot().session?.accessToken;
    return sessionStore.subscribe(() => {
      const next = sessionStore.getSnapshot().session?.accessToken;
      if (next !== token) {
        token = next;
        void queryClient.cancelQueries();
        queryClient.clear();
      }
    });
  }, [sessionStore, queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider store={sessionStore}>
        <ApiProvider client={apiClient}>
          <RealtimeProvider>{children}</RealtimeProvider>
        </ApiProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
