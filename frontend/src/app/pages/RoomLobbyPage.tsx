import { GameLaunch } from '@/features/game/components/GameLaunch';
import { useParams, Navigate } from 'react-router-dom';
import { z } from 'zod';
import { RoomLobby } from '@/features/social/components/RoomLobby';
export default function RoomLobbyPage() {
  const { id } = useParams();
  return z.uuid().safeParse(id).success ? (
    <RoomLobby roomId={id!} gameControls={(room) => <GameLaunch roomId={id!} {...room} />} />
  ) : (
    <Navigate to="/kesif" replace />
  );
}
