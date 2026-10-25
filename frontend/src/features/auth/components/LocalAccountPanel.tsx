import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserAvatar, loginUserKeys } from '@/shared/ui/avatar/UserAvatar';
import { useApiClient } from '@/shared/api/ApiProvider';
import { ApiError } from '@/shared/api/ApiError';
import { useSession } from '@/shared/session/SessionProvider';
import { Button } from '@/shared/ui/Button';
import { createLocalAuthApi } from '../api/localAuthApi';
import '../styles/auth.css';

export function LocalAccountPanel() {
  const client = useApiClient();
  const api = useMemo(() => createLocalAuthApi(client), [client]);
  const { reason, store } = useSession();
  const users = useQuery({
    queryKey: ['auth', 'local-users'],
    queryFn: ({ signal }) => api.users(signal),
    retry: false,
  });
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const login = async (key: string) => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    store.clear();
    const revision = store.getSnapshot().revision;
    setPending(key);
    setError('');
    try {
      const next = await api.login(key, request.signal);
      if (!request.signal.aborted && store.getSnapshot().revision === revision) store.set(next);
    } catch (failure) {
      if (!request.signal.aborted)
        setError(
          failure instanceof ApiError && failure.status === 404
            ? 'Yerel hesap girişi bu sunucuda açık değil.'
            : 'Giriş yapılamadı. Backend bağlantısını kontrol edip tekrar dene.',
        );
    } finally {
      if (!request.signal.aborted) setPending(null);
    }
  };
  return (
    <section className="login-accounts" aria-label="Kullanıcı seçimi">
      {reason === 'expired' && (
        <p role="alert">Oturum süren doldu. Devam etmek için yeniden bir hesap seç.</p>
      )}
      {users.isPending ? (
        <p role="status">Test hesapları yükleniyor…</p>
      ) : users.isError ? (
        <div role="alert">
          <p>Test hesaplarına ulaşılamadı. Backend açık mı?</p>
          <Button variant="text" onClick={() => void users.refetch()}>
            Tekrar dene
          </Button>
        </div>
      ) : users.data?.length === 0 ? (
        <p>Tanımlı test hesabı bulunamadı.</p>
      ) : (
        <div className="login-account-grid">
          {loginUserKeys
            .flatMap((key) => users.data?.filter((user) => user.userKey === key) ?? [])
            .map((user) => (
              <Button
                key={user.userKey}
                variant="text"
                className="login-account-card"
                disabled={pending !== null}
                onClick={() => void login(user.userKey)}
              >
                <span className="login-avatar" aria-hidden="true">
                  <UserAvatar identity={user.userKey} />
                </span>
                <strong>{pending === user.userKey ? 'Bağlanıyor…' : user.displayName}</strong>
              </Button>
            ))}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
