import { useParams, Navigate } from 'react-router-dom';
import { z } from 'zod';
import { ResultScreen } from '@/features/progress/components/ResultScreen';
export default function ResultPage() {
  const { id } = useParams();
  return z.uuid().safeParse(id).success ? (
    <ResultScreen key={id} sessionId={id!} />
  ) : (
    <Navigate to="/kesif" replace />
  );
}
