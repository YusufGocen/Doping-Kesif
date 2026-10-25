import { useApiClient } from '@/shared/api/ApiProvider';
import { createSocialApi } from '@/features/social/api/socialApi';
import { createGameApi } from '@/features/game/api/gameApi';
import { createProgressApi } from '@/features/progress/api/progressApi';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/shared/session/SessionProvider';
import { env } from '@/shared/config/env';
import { createRealtimeClient, socketUrl } from '@/shared/realtime/client';
import type { ConnectionState } from '@/shared/realtime/client';
import { RealtimeContext } from '@/shared/realtime/RealtimeContext';
import { Button } from '@/shared/ui/Button';
import './realtime.css';
const roots = new Set(['social', 'game', 'progress', 'catalog']);
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const cache = useQueryClient();
  const api = useApiClient();
  const [state, setState] = useState<ConnectionState>('connecting');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!session || !env.realtimeEnabled || typeof WebSocket === 'undefined') return;
    let disposed = false;
    const refresh = async () => {
      if (disposed) return;
      await cache.invalidateQueries(
        { predicate: (q) => roots.has(String(q.queryKey[0])), refetchType: 'active' },
        { throwOnError: false },
      );
    };
    const client = createRealtimeClient({
      url: socketUrl(env.apiBaseUrl, window.location.origin),
      token: session.accessToken,
      onState: (value) => {
        if (!disposed) setState(value);
      },
      resync: async () => {
        if (disposed) return;
        const social = createSocialApi(api),
          game = createGameApi(api),
          progress = createProgressApi(api);
        await Promise.all([
          cache.fetchQuery({
            queryKey: ['social', 'active', session.user.id],
            queryFn: ({ signal }) => social.active(signal),
            staleTime: 0,
          }),
          cache.fetchQuery({
            queryKey: ['social', 'incoming', session.user.id],
            queryFn: ({ signal }) => social.incoming(signal),
            staleTime: 0,
          }),
          cache.fetchQuery({
            queryKey: ['game', 'active', session.user.id],
            queryFn: ({ signal }) => game.active(signal),
            staleTime: 0,
          }),
          cache.fetchQuery({
            queryKey: ['progress', 'summary', session.user.id],
            queryFn: ({ signal }) => progress.progress(signal),
            staleTime: 0,
          }),
          cache.fetchQuery({
            queryKey: ['progress', 'collections', session.user.id, 'ALL', 0],
            queryFn: ({ signal }) => progress.collections('ALL', 0, signal),
            staleTime: 0,
          }),
          cache.fetchQuery({
            queryKey: ['progress', 'history', session.user.id, 0],
            queryFn: ({ signal }) => progress.history(0, signal),
            staleTime: 0,
          }),
        ]);
        await refresh();
      },
      onEvent: refresh,
      snapshotSequence: (event) => {
        let sequence = 0;
        for (const query of cache.getQueryCache().getAll()) {
          const data = query.state.data as { id?: string; sequence?: number } | null;
          if (
            (event.aggregateType === 'ROOM'
              ? query.queryKey[0] === 'social'
              : query.queryKey[0] === 'game') &&
            data?.id === event.aggregateId &&
            typeof data.sequence === 'number'
          )
            sequence = Math.max(sequence, data.sequence);
        }
        return sequence;
      },
    });
    const online = () => client.retry(),
      offline = () => client.offline(),
      visible = () => {
        if (document.visibilityState === 'visible' && navigator.onLine) client.retry();
      };
    client.start();
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', visible);
    return () => {
      disposed = true;
      client.stop();
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [session?.accessToken, cache, api, revision]);
  const current = env.realtimeEnabled ? state : 'offline';
  return (
    <RealtimeContext.Provider value={current}>
      {session && env.realtimeEnabled && (
        <div className={'realtime-status ' + current} role="status">
          <span aria-hidden="true">●</span>
          {current === 'live'
            ? 'Canlı bağlantı açık'
            : current === 'syncing'
              ? 'Güncel oyun durumu alınıyor…'
              : current === 'connecting'
                ? 'Canlı bağlantı kuruluyor…'
                : current === 'denied'
                  ? 'Canlı bağlantı doğrulanamadı. Güncellemeler aralıklarla alınıyor.'
                  : current === 'offline'
                    ? 'Bağlantı kesildi. Yeniden bağlanman bekleniyor.'
                    : 'Yeniden bağlanılıyor. Güncellemeler aralıklarla alınıyor.'}
          {['denied', 'reconnecting', 'offline'].includes(current) && (
            <Button variant="text" onClick={() => setRevision((value) => value + 1)}>
              Tekrar Bağlan
            </Button>
          )}
        </div>
      )}
      {children}
    </RealtimeContext.Provider>
  );
}
