import { SetupSteps } from '@/shared/ui/SetupSteps';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Users, Link2, ArrowRight } from 'lucide-react';
import { useSession } from '@/shared/session/SessionProvider';
import { UserAvatar } from '@/shared/ui/avatar/UserAvatar';
import { draftSchema } from '@/features/social/model/schemas';
import '@/features/social/styles/rooms.css';
export default function PlayMethodPage() {
  const { session } = useSession();
  const location = useLocation();
  const draft = draftSchema.safeParse(location.state);
  if (!draft.success || draft.data.ownerId !== session?.user.id)
    return <Navigate to="/kesif" replace />;
  return (
    <section className="room-code-page">
      <div className="reference-heading">
        <span className="room-step">2</span>
        <h1>Oyun Başlatma Seçenekleri</h1>
      </div>
      <SetupSteps current={2} />
      <h2>Nasıl Oynamak İstersin?</h2>
      <p className="room-muted">Arkadaşınla birlikte oynamak için bir yöntem seç.</p>
      <div className="play-method-grid">
        <article>
          <Users size={26} />
          <div className="method-avatars">
            <UserAvatar identity={session.user.externalUserId} />
            <span>✦</span>
            <UserAvatar identity="local:ayse" />
          </div>
          <h3>Arkadaşını Seç</h3>
          <p>Butik grubundaki arkadaşlarından birini davet et.</p>
          <Link className="primary" to="/kesif/arkadas" state={draft.data}>
            Arkadaş Seç <ArrowRight size={17} />
          </Link>
        </article>
        <article>
          <Link2 size={26} />
          <div className="method-avatars">
            <UserAvatar identity="local:zeynep" />
            <span>✦</span>
            <UserAvatar identity="local:mert" />
          </div>
          <h3>Kod / Davet Linki ile Katıl</h3>
          <p>Oda oluşturup kodunu paylaş veya mevcut bir odaya katıl.</p>
          <Link className="primary" to="/kesif/oda?tab=olustur" state={draft.data}>
            Kod / Link ile Oyna <ArrowRight size={17} />
          </Link>
        </article>
      </div>
      <Link className="settings-back" to={'/kesif/ayarlar?gorev=' + draft.data.puzzleId}>
        <ArrowLeft size={18} aria-hidden="true" />
        Ayarlara dön
      </Link>
    </section>
  );
}
