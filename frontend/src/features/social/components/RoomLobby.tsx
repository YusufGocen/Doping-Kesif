import type { RoomSnapshot } from '../model/schemas';
import { useRealtimeInterval } from '@/shared/realtime/RealtimeContext';
import { Link2, UserRound, CheckCircle2, Clock3 } from 'lucide-react';
import { RoomInformation } from './RoomInformation';
import type { ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useApiClient } from '@/shared/api/ApiProvider';
import { useSession } from '@/shared/session/SessionProvider';
import { UserAvatar, demoAvatarIdentity } from '@/shared/ui/avatar/UserAvatar';
import { Button } from '@/shared/ui/Button';
import { createSocialApi } from '../api/socialApi';
import '../styles/social.css';
import '../styles/rooms.css';
export function RoomLobby({
  roomId,
  gameControls,
}: {
  roomId: string;
  gameControls?: (room: {
    ownerPlayerId: string;
    readyToStart: boolean;
    status: string;
  }) => ReactNode;
}) {
  const interval = useRealtimeInterval(2000);
  const api = createSocialApi(useApiClient());
  const { session } = useSession();
  const cache = useQueryClient();
  const key = ['social', 'room', roomId, session?.user.id];
  const room = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api.room(roomId, signal),
    refetchInterval: (query) =>
      query.state.data && ['OPEN', 'FULL'].includes(query.state.data.status) ? interval : false,
  });
  const update = useMutation({
    mutationFn: ({ leave, ready }: { leave: boolean; ready: boolean }) =>
      leave
        ? room.data?.ownerPlayerId === session?.user.id
          ? api.cancelRoom(roomId)
          : api.leave(roomId)
        : api.ready(roomId, ready),
    onSuccess: async (next) => {
      await cache.cancelQueries({ queryKey: key });
      cache.setQueryData<RoomSnapshot>(key, (old) =>
        old && old.sequence > next.sequence ? old : next,
      );
      void cache.invalidateQueries({ queryKey: ['social', 'active'] });
    },
    onError: () => void room.refetch(),
  });
  if (room.isPending) return <p role="status">Oda yükleniyor…</p>;
  if (room.isError)
    return (
      <div role="alert">
        Oda okunamadı veya erişimin yok.{' '}
        <Button variant="text" onClick={() => void room.refetch()}>
          Tekrar dene
        </Button>
        <Link to="/kesif">Keşif’e dön</Link>
      </div>
    );
  const data = room.data;
  const closed = ['CLOSED', 'CANCELLED', 'EXPIRED'].includes(data.status);
  const me = data.players.find((player) => player.playerId === session?.user.id);
  return (
    <section className="room-lobby">
      <div className="reference-heading">
        <span className="room-step">6</span>
        <h1>Oyun Lobisi</h1>
      </div>
      <p className="room-muted">Tüm oyuncular hazır olduğunda oyuna başlayabilirsiniz.</p>
      {closed ? (
        <>
          <p role="status">{data.status === 'EXPIRED' ? 'Odanın süresi doldu.' : 'Oda kapandı.'}</p>
          <Link to="/kesif">Keşif’e dön</Link>
        </>
      ) : (
        <>
          <div className="lobby-players reference-lobby-players">
            <Link2 className="lobby-link-icon" size={29} aria-hidden="true" />
            {data.players.map((player, index) => (
              <article
                className={index === 0 ? 'lobby-player blue' : 'lobby-player pink'}
                key={player.playerId}
              >
                <UserAvatar
                  identity={
                    player.playerId === session?.user.id
                      ? session.user.externalUserId
                      : demoAvatarIdentity(player.displayName)
                  }
                />
                <strong>
                  {player.displayName}
                  {player.playerId === session?.user.id ? ' (Sen)' : ''}
                </strong>
                <span className={player.ready ? 'player-ready' : 'player-waiting'}>
                  {player.ready ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}{' '}
                  {player.ready ? 'Hazır' : 'Hazırlanıyor'}
                </span>
              </article>
            ))}
            {data.players.length < 2 && (
              <article className="lobby-player waiting-player">
                <div>
                  <UserRound size={45} />
                </div>
                <strong>Oyun Arkadaşın</strong>
                <span className="player-waiting">Katılması bekleniyor…</span>
              </article>
            )}
          </div>
          {data.joinCode && data.ownerPlayerId === session?.user.id && (
            <div className="lobby-code-strip">
              <span>
                Oda Kodu: <b>{data.joinCode}</b>
              </span>
              <Link to={'/kesif/oda/' + roomId + '/paylas'}>Kodu / Linki Paylaş →</Link>
            </div>
          )}
          <RoomInformation selection={data.selection} />
          {update.isError && (
            <p role="alert">İşlem tamamlanamadı. Güncel oda durumunu kontrol edip tekrar dene.</p>
          )}
          {data.status !== 'STARTED' && (
            <>
              <Button
                busy={update.isPending}
                disabled={!me?.active}
                onClick={() => update.mutate({ leave: false, ready: !me?.ready })}
              >
                {me?.ready ? 'Hazır değilim' : 'Hazırım'}
              </Button>
              <Button
                variant="text"
                disabled={update.isPending}
                onClick={() => update.mutate({ leave: true, ready: false })}
              >
                {data.ownerPlayerId === session?.user.id ? 'Odayı İptal Et' : 'Odadan Ayrıl'}
              </Button>
              <p className="friend-note">
                {data.readyToStart
                  ? 'İki oyuncu da hazır.'
                  : 'İki oyuncunun da hazır olması bekleniyor.'}
              </p>
            </>
          )}
          <div className="lobby-launch-controls">{gameControls?.(data)}</div>
        </>
      )}
    </section>
  );
}
