import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { ApiClient } from './client';

const Context = createContext<ApiClient | null>(null);
export function ApiProvider({ client, children }: { client: ApiClient; children: ReactNode }) {
  return <Context.Provider value={client}>{children}</Context.Provider>;
}
export function useApiClient() {
  const client = useContext(Context);
  if (!client) throw new Error('API hooks require ApiProvider');
  return client;
}
