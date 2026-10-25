import { useParams, Navigate } from 'react-router-dom';
import { z } from 'zod';
import { CollectionDetailScreen } from '@/features/progress/components/CollectionDetailScreen';
export default function CollectionDetailPage() {
  const { id } = useParams();
  return z.uuid().safeParse(id).success ? (
    <CollectionDetailScreen key={id} puzzleId={id!} />
  ) : (
    <Navigate to="/kesif/koleksiyon" replace />
  );
}
