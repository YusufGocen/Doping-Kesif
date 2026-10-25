import { Clock3, CheckCircle2, Link2, Send, ShieldCheck } from 'lucide-react';
import { UserAvatar } from '@/shared/ui/avatar/UserAvatar';
import { useSession } from '@/shared/session/SessionProvider';
import '../styles/waiting-invitation.css';
import { useRealtimeInterval } from '@/shared/realtime/RealtimeContext';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useApiClient } from '@/shared/api/ApiProvider';
import { Button } from '@/shared/ui/Button';
import { createSocialApi } from '../api/socialApi';
export function WaitingInvitation({
  roomId,
  friend,
  discovery,
  onCancel,
  cancelling,
  cancelError,
}: {
  roomId: string;
  friend?: { externalUserId: string; displayName: string };
  discovery?: { title: string; grade: number; subject: string };
  onCancel: () => void;
  cancelling: boolean;
  cancelError: boolean;
}) {
  const { session } = useSession();
  const interval = useRealtimeInterval(2000);
  const api = createSocialApi(useApiClient());
  const navigate = useNavigate();
  const room = useQuery({
    queryKey: ['social', 'waiting', roomId],
    queryFn: ({ signal }) => api.room(roomId, signal),
    refetchInterval: (query) =>
      query.state.data &&
      ['FULL', 'CANCELLED', 'CLOSED', 'EXPIRED', 'STARTED'].includes(query.state.data.status)
        ? false
        : interval,
  });
  useEffect(() => {
    if (room.data && ['FULL', 'STARTED'].includes(room.data.status))
      navigate('/kesif/lobi/' + roomId, { replace: true });
  }, [room.data, navigate, roomId]);
  const closed = room.data && ['CANCELLED', 'CLOSED', 'EXPIRED'].includes(room.data.status);
  return (
    <section className="invitation-waiting" aria-labelledby="invitation-waiting-title">
      <div className="invitation-waiting-header">
        <span className="invitation-send-icon">
          <Send size={24} />
        </span>
        <span className="invitation-eyebrow">BİRLİKTE KEŞFE BİR ADIM KALDI</span>
        <h2 id="invitation-waiting-title">Davet Bekleniyor</h2>
        <p>
          {closed
            ? 'Davetin güncel durumunu aşağıdan görebilirsin.'
            : 'Keşif davetin yola çıktı. Şimdi arkadaşının katılmasını bekliyoruz.'}
        </p>
      </div>
      {room.isError && (
        <p role="alert">
          Davet durumu okunamadı.{' '}
          <Button variant="text" onClick={() => void room.refetch()}>
            Tekrar dene
          </Button>
        </p>
      )}
      {closed ? (
        <>
          <p role="status">
            {room.data?.status === 'EXPIRED'
              ? 'Davetin süresi doldu.'
              : 'Davet sona erdi; oda kapandı.'}
          </p>
          <Link to="/kesif">Keşif’e dön</Link>
        </>
      ) : (
        <>
          <div className="invitation-waiting-players">
            <article>
              <div className="invitation-avatar-wrap">
                <UserAvatar identity={session?.user.externalUserId} />
                <span className="invitation-avatar-mark">
                  <CheckCircle2 size={18} />
                </span>
              </div>
              <strong>{session?.user.displayName ?? 'Sen'}</strong>
              <span className="invitation-player-sent">Davet gönderildi</span>
            </article>
            <div className="invitation-connection" aria-hidden="true">
              <span />
              <Link2 size={24} />
              <span />
            </div>
            <article>
              <div className="invitation-avatar-wrap awaiting">
                <UserAvatar identity={friend?.externalUserId} />
                <span className="invitation-avatar-mark">
                  <Clock3 size={18} />
                </span>
              </div>
              <strong>{friend?.displayName ?? 'Oyun arkadaşın'}</strong>
              <span className="invitation-player-awaiting">Yanıt bekleniyor</span>
            </article>
          </div>
          <div className="invitation-status-card">
            <span className="invitation-wait-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <div>
              <strong>Arkadaşının daveti kabul etmesi bekleniyor…</strong>
              <p>Kabul ettiğinde otomatik olarak oyun lobisine geçeceksiniz.</p>
            </div>
          </div>
          {discovery && (
            <div className="invitation-discovery-summary">
              <span>SEÇİLEN KEŞİF</span>
              <strong>{discovery.title}</strong>
              <p>
                {discovery.grade}. Sınıf · {discovery.subject}
              </p>
            </div>
          )}
          {room.data && (
            <p className="invitation-expiry">
              <Clock3 size={14} aria-hidden="true" />
              Son geçerlilik: {new Date(room.data.expiresAt).toLocaleTimeString('tr-TR')}
            </p>
          )}
          {cancelError && <p role="alert">Davet iptal edilemedi. Tekrar deneyebilirsin.</p>}
          <div className="invitation-waiting-footer">
            <p>
              <ShieldCheck size={15} aria-hidden="true" />
              Bu ekranı açık tutman yeterli.
            </p>
            <Button
              className="invitation-cancel"
              variant="text"
              busy={cancelling}
              onClick={onCancel}
            >
              Daveti İptal Et
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
