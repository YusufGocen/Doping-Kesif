import { createContext, useContext } from 'react';
import type { ConnectionState } from './client';
export const RealtimeContext = createContext<ConnectionState>('offline');
/** Healthy sockets deliver updates immediately; slow reconciliation protects against missed dispatch. */
export function useRealtimeInterval(fallback: number) {
  const state = useContext(RealtimeContext);
  return state === 'live' ? 30000 : fallback;
}
