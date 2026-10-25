import { useParams, Navigate } from 'react-router-dom';
import { z } from 'zod';
import { GameScreen } from '@/features/game/components/GameScreen';
export default function GamePage() {
  const { id } = useParams();
  return z.uuid().safeParse(id).success ? (
    <GameScreen key={id} sessionId={id!} />
  ) : (
    <Navigate to="/kesif" replace />
  );
}
