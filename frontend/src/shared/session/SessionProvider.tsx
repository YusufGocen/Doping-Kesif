import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { SessionStore } from './store';

const Context = createContext<SessionStore | null>(null);
export function SessionProvider({ store, children }: { store: SessionStore; children: ReactNode }) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    store.expire();
    const expiry = snapshot.session ? Date.parse(snapshot.session.expiresAt) : null;
    const timer =
      expiry === null
        ? undefined
        : window.setTimeout(store.expire, Math.min(2147483647, Math.max(0, expiry - Date.now())));
    const onVisible = () => {
      if (document.visibilityState === 'visible') store.expire();
    };
    window.addEventListener('focus', store.expire);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', store.expire);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [store, snapshot.session]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useSession() {
  const store = useContext(Context);
  if (!store) throw new Error('SessionProvider required');
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return { ...snapshot, store };
}
