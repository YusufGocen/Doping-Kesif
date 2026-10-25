export interface SessionUser {
  readonly id: string;
  readonly externalUserId: string;
  readonly displayName: string;
  readonly roles: readonly string[];
}
export interface Session {
  readonly accessToken: string;
  readonly expiresAt: string;
  readonly user: SessionUser;
}
export type SessionReason = 'expired' | 'logout' | null;
export interface SessionSnapshot {
  readonly session: Session | null;
  readonly reason: SessionReason;
  readonly revision: number;
}

/** Per-application memory only. Separate tabs never share credentials through browser storage. */
export function createSessionStore() {
  let snapshot: SessionSnapshot = { session: null, reason: null, revision: 0 };
  const listeners = new Set<() => void>();
  const publish = (session: Session | null, reason: SessionReason) => {
    snapshot = { session, reason, revision: snapshot.revision + 1 };
    listeners.forEach((listener) => listener());
  };
  const clear = (reason: SessionReason = 'logout') => publish(null, reason);
  const expire = () => {
    if (snapshot.session && Date.parse(snapshot.session.expiresAt) <= Date.now()) clear('expired');
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set: (session: Session) => {
      if (
        !Number.isFinite(Date.parse(session.expiresAt)) ||
        Date.parse(session.expiresAt) <= Date.now()
      )
        throw new Error('Cannot accept an expired session');
      publish(session, null);
    },
    clear,
    expire,
    getAccessToken: () => {
      expire();
      return snapshot.session?.accessToken ?? null;
    },
    unauthorized: (token: string | null) => {
      // An old in-flight request must not log out a newly selected account.
      if (token && snapshot.session?.accessToken === token) clear('expired');
    },
  };
}
export type SessionStore = ReturnType<typeof createSessionStore>;
