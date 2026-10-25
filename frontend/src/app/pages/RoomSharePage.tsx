import { useParams, Navigate } from 'react-router-dom';
import { z } from 'zod';
import { RoomShare } from '@/features/social/components/RoomShare';
export default function RoomSharePage() {
  const { id } = useParams();
  return z.uuid().safeParse(id).success ? (
    <RoomShare key={id} roomId={id!} />
  ) : (
    <Navigate to="/kesif" replace />
  );
}
