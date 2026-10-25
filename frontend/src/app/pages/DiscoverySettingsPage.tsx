import { SetupSteps } from '@/shared/ui/SetupSteps';
import { Link, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { GameSettings } from '@/features/catalog/components/GameSettings';
import { useSession } from '@/shared/session/SessionProvider';
export default function DiscoverySettingsPage() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [params] = useSearchParams();
  const puzzle = params.get('gorev');
  if (!puzzle) return <Navigate to="/kesif" replace />;
  return (
    <>
      <div className="reference-heading">
        <span className="settings-title-badge">1</span>
        <h1>Oyun Ayarları</h1>
      </div>
      <SetupSteps current={1} />
      {session ? (
        <GameSettings
          key={session.user.id + session.expiresAt + puzzle}
          puzzleReference={puzzle}
          onContinue={(selection) =>
            navigate('/kesif/eslesme', { state: { ...selection, ownerId: session.user.id } })
          }
        />
      ) : (
        <p className="catalog-gate">Bu keşif için önce bir öğrenci hesabıyla giriş yap.</p>
      )}
      <Link className="settings-back" to="/kesif">
        <ArrowLeft size={18} aria-hidden="true" />
        Keşiflere dön
      </Link>
    </>
  );
}
