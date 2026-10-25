import { SetupSteps } from '@/shared/ui/SetupSteps';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { useSession } from '@/shared/session/SessionProvider';
import { draftSchema } from '@/features/social/model/schemas';
import { FriendSelection } from '@/features/social/components/FriendSelection';
export default function FriendSelectionPage() {
  const { session } = useSession();
  const location = useLocation();
  const draft = draftSchema.safeParse(location.state);
  if (!draft.success || draft.data.ownerId !== session?.user.id)
    return <Navigate to="/kesif" replace />;
  return (
    <>
      <div className="reference-heading">
        <Users size={22} />
        <h1>Arkadaşını Seç</h1>
      </div>
      <SetupSteps current={2} />
      <FriendSelection
        key={session.user.id + session.expiresAt + location.key}
        draft={draft.data}
      />
      <Link className="settings-back" to={'/kesif/ayarlar?gorev=' + draft.data.puzzleId}>
        <ArrowLeft size={18} aria-hidden="true" />
        Ayarlara dön
      </Link>
    </>
  );
}
