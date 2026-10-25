import { useRealtimeInterval } from '@/shared/realtime/RealtimeContext';
import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { Copy, Share2, PartyPopper } from 'lucide-react';
import { useApiClient } from '@/shared/api/ApiProvider';
import { useSession } from '@/shared/session/SessionProvider';
import { Button } from '@/shared/ui/Button';
import { createSocialApi } from '../api/socialApi';
import '../styles/rooms.css';
export function RoomShare({ roomId }: { roomId: string }) {
  const interval = useRealtimeInterval(2000);
  const api = createSocialApi(useApiClient());
  const { session } = useSession();
  const [notice, setNotice] = useState('');
  const linkInput = useRef<HTMLInputElement>(null);
  const room = useQuery({
    queryKey: ['social', 'room', roomId, session?.user.id],
    queryFn: ({ signal }) => api.room(roomId, signal),
    refetchInterval: (q) =>
      q.state.data && ['OPEN', 'FULL'].includes(q.state.data.status) ? interval : false,
  });
  const data = room.data,
    closed = data && ['CLOSED', 'CANCELLED', 'EXPIRED'].includes(data.status);
  const code = data?.joinCode;
  const url = code ? window.location.origin + '/kesif/oda?kod=' + encodeURIComponent(code) : '';
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice('Kopyalandı.');
    } catch {
      setNotice('Kopyalanamadı. Bağlantıyı seçip elle kopyalayabilirsin.');
      linkInput.current?.focus();
      linkInput.current?.select();
    }
  };
  if (room.isSuccess && (data?.status === 'FULL' || data?.status === 'STARTED'))
    return <Navigate to={'/kesif/lobi/' + roomId} replace />;
  return (
    <section className="room-code-page room-share">
      <div className="reference-heading">
        <span className="room-step">4</span>
        <h1>Oda Oluşturuldu</h1>
      </div>
      {room.isPending && <p role="status">Oda yükleniyor…</p>}
      {room.isError && (
        <p role="alert">
          Oda okunamadı veya erişimin yok.{' '}
          <Button variant="text" onClick={() => void room.refetch()}>
            Tekrar dene
          </Button>
        </p>
      )}
      {data &&
        (closed ? (
          <p role="status">
            Bu oda kapanmış veya süresi dolmuş. <Link to="/kesif">Keşiflere dön</Link>
          </p>
        ) : (
          <>
            <PartyPopper size={42} className="room-celebration" />
            <h2>Odan Hazır!</h2>
            <p className="room-muted">Arkadaşını oda kodu veya link ile davet et.</p>
            {code && data.ownerPlayerId === session?.user.id ? (
              <>
                <div className="room-code-box">
                  <strong>{code}</strong>
                  <Button
                    variant="icon"
                    aria-label="Oda kodunu kopyala"
                    onClick={() => void copy(code)}
                  >
                    <Copy size={19} />
                  </Button>
                </div>
                <span className="room-muted">veya</span>
                <label className="room-share-link">
                  Davet Linki
                  <div>
                    <input
                      ref={linkInput}
                      value={url}
                      readOnly
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <Button
                      variant="icon"
                      aria-label="Davet linkini kopyala"
                      onClick={() => void copy(url)}
                    >
                      <Copy size={18} />
                    </Button>
                  </div>
                </label>
                <div className="room-share-actions">
                  <Button variant="text" onClick={() => void copy(url)}>
                    <Copy size={18} />
                    Linki Kopyala
                  </Button>
                  {typeof navigator.share === 'function' && (
                    <Button
                      variant="text"
                      onClick={() =>
                        void navigator
                          .share({ title: 'Doping Keşif', text: 'Birlikte keşfedelim!', url })
                          .catch(() => setNotice('Paylaşım tamamlanmadı. Linki kopyalayabilirsin.'))
                      }
                    >
                      <Share2 size={18} />
                      Paylaş
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <p className="room-muted">Oda kodunu yalnız oda sahibi görebilir.</p>
            )}
            <p role="status">
              {notice ||
                (data.status === 'FULL'
                  ? 'Arkadaşın katıldı!'
                  : 'Arkadaşının katılması bekleniyor…')}
            </p>
            <p className="room-muted">
              Son geçerlilik: {new Date(data.expiresAt).toLocaleString('tr-TR')}
            </p>
            <p className="room-muted">Arkadaşın katıldığında otomatik olarak lobiye geçeceksin.</p>
            <Link className="settings-back" to={'/kesif/lobi/' + roomId}>
              Lobiye Git / Odayı Yönet
            </Link>
          </>
        ))}
    </section>
  );
}
