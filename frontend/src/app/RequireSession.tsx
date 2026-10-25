import { GameRecovery } from '@/features/game/components/GameRecovery';
import { LobbyActivity } from '@/features/social/components/LobbyActivity';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '@/shared/session/SessionProvider';
import DashboardLayout from '@/layouts/dashboard/DashboardLayout';
export function RequireSession() {
  const { session } = useSession();
  const location = useLocation();
  return session ? (
    <DashboardLayout
      activity={
        <>
          <GameRecovery />
          <LobbyActivity key={session.user.id + session.expiresAt} />
        </>
      }
    />
  ) : (
    <Navigate
      to={'/giris?next=' + encodeURIComponent(location.pathname + location.search)}
      replace
    />
  );
}
