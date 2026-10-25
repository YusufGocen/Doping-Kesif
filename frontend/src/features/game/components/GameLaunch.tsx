import { useRealtimeInterval } from '@/shared/realtime/RealtimeContext';
import { useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/shared/session/SessionProvider';
import { useApiClient } from '@/shared/api/ApiProvider';
import { Button } from '@/shared/ui/Button';
import { createGameApi } from '../api/gameApi';
export function GameLaunch({
  roomId,
  ownerPlayerId,
  readyToStart,
  status,
}: {
  roomId: string;
  ownerPlayerId: string;
  readyToStart: boolean;
  status: string;
}) {
  const interval = useRealtimeInterval(1500);
  const api = createGameApi(useApiClient());
  const { session } = useSession();
  const navigate = useNavigate();
  const active = useQuery({
    queryKey: ['game', 'active', session?.user.id],
    queryFn: ({ signal }) => api.active(signal),
    enabled: status === 'STARTED',
    refetchInterval: status === 'STARTED' ? interval : false,
  });
  const start = useMutation({
    mutationFn: () => api.start(roomId),
    onSuccess: (game) => navigate('/kesif/oyun/' + game.id, { replace: true }),
  });
  useEffect(() => {
    if (status === 'STARTED' && active.data?.roomId === roomId)
      navigate('/kesif/oyun/' + active.data.id, { replace: true });
  }, [active.data, status, roomId, navigate]);
  return (
    <>
      {status === 'STARTED' ? (
        <p role="status">Ortak soru ekranına geçiliyor…</p>
      ) : session?.user.id === ownerPlayerId ? (
        <Button
          endArrow
          disabled={!readyToStart}
          busy={start.isPending}
          onClick={() => start.mutate()}
        >
          Oyunu Başlat
        </Button>
      ) : (
        <p className="friend-note">Oda sahibinin oyunu başlatması bekleniyor.</p>
      )}
      {(start.isError || active.isError) && (
        <p role="alert">
          Oyun açılamadı. Hazır durumlarını ve bağlantını kontrol edip tekrar dene.{' '}
          {active.isError && (
            <Button variant="text" onClick={() => void active.refetch()}>
              Tekrar dene
            </Button>
          )}
        </p>
      )}
    </>
  );
}
