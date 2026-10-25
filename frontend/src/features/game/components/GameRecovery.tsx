import { useRealtimeInterval } from '@/shared/realtime/RealtimeContext';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { useSession } from '@/shared/session/SessionProvider';
import { useApiClient } from '@/shared/api/ApiProvider';
import { Button } from '@/shared/ui/Button';
import { createGameApi } from '../api/gameApi';
export function GameRecovery() {
  const interval = useRealtimeInterval(3000);
  const api = createGameApi(useApiClient());
  const { session } = useSession();
  const location = useLocation();
  const game = useQuery({
    queryKey: ['game', 'active', session?.user.id],
    queryFn: ({ signal }) => api.active(signal),
    refetchInterval: interval,
  });
  if (location.pathname.startsWith('/kesif/oyun/')) return null;
  return (
    <>
      {game.isError && (
        <p role="alert">
          Aktif oyun kontrol edilemedi.{' '}
          <Button variant="text" onClick={() => void game.refetch()}>
            Tekrar dene
          </Button>
        </p>
      )}
      {game.data && (
        <div className="active-room-notice">
          <strong>Devam eden oyunun var.</strong>
          <Link to={'/kesif/oyun/' + game.data.id}>Oyuna dön →</Link>
        </div>
      )}
    </>
  );
}
