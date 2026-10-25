import { useRealtimeInterval } from '@/shared/realtime/RealtimeContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApiClient } from '@/shared/api/ApiProvider';
import { useSession } from '@/shared/session/SessionProvider';
import { Button } from '@/shared/ui/Button';
import { createSocialApi } from '../api/socialApi';
import '../styles/social.css';
export function LobbyActivity() {
  const interval = useRealtimeInterval(3000);
  const api = createSocialApi(useApiClient());
  const { session } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const cache = useQueryClient();
  const inbox = useQuery({
    queryKey: ['social', 'incoming', session?.user.id],
    queryFn: ({ signal }) => api.incoming(signal),
    refetchInterval: interval,
  });
  const active = useQuery({
    queryKey: ['social', 'active', session?.user.id],
    queryFn: ({ signal }) => api.active(signal),
    refetchInterval: interval,
  });
  const action = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      if (accept) {
        const room = await api.accept(id);
        navigate('/kesif/lobi/' + room.id);
      } else await api.reject(id);
    },
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['social'] });
    },
    onError: () => {
      void inbox.refetch();
    },
  });
  return (
    <section className="lobby-activity" aria-label="Davetler ve aktif oda">
      {active.data &&
        !location.pathname.startsWith('/kesif/oyun/') &&
        !location.pathname.endsWith(active.data.id) && (
          <div className="room-return-shortcut">
            <Link to={'/kesif/lobi/' + active.data.id}>Odaya dön →</Link>
          </div>
        )}
      {(inbox.isError || active.isError) && (
        <div role="alert">
          Davet ve oda durumu güncellenemedi.{' '}
          <Button
            variant="text"
            onClick={() => {
              void inbox.refetch();
              void active.refetch();
            }}
          >
            Tekrar dene
          </Button>
        </div>
      )}
      {inbox.data?.map((item) => (
        <article className="incoming-invitation" key={item.id}>
          <strong>Yeni keşif daveti</strong>
          <p>{item.selection.gradeLevel}. sınıf için birlikte keşfetmeye davetlisin.</p>
          <small>Son geçerlilik: {new Date(item.expiresAt).toLocaleTimeString('tr-TR')}</small>
          <div>
            <Button
              busy={action.isPending}
              onClick={() => action.mutate({ id: item.id, accept: true })}
            >
              Kabul Et
            </Button>
            <Button
              variant="text"
              disabled={action.isPending}
              onClick={() => action.mutate({ id: item.id, accept: false })}
            >
              Reddet
            </Button>
          </div>
        </article>
      ))}
      {action.isError && (
        <p role="alert">
          Davet yanıtlanamadı; süresi dolmuş veya oda kapanmış olabilir. Durumu yenileyip tekrar
          dene.
        </p>
      )}
    </section>
  );
}
