import { ResultCelebration } from './ResultCelebration';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/shared/api/ApiProvider';
import { useSession } from '@/shared/session/SessionProvider';
import { createProgressApi } from '../api/progressApi';
import { coverUrl, QueryNotice } from './ProgressUi';
import '../styles/progress.css';
export function ResultScreen({ sessionId }: { sessionId: string }) {
  const api = createProgressApi(useApiClient());
  const { session } = useSession();
  const result = useQuery({
    queryKey: ['progress', 'result', sessionId, session?.user.id],
    queryFn: ({ signal }) => api.result(sessionId, signal),
  });
  const pieces = useQuery({
    queryKey: ['progress', 'session-pieces', sessionId, session?.user.id],
    queryFn: ({ signal }) => api.pieces(sessionId, signal),
    enabled: result.isSuccess,
  });
  const puzzles = useQuery({
    queryKey: ['progress', 'puzzles'],
    queryFn: ({ signal }) => api.puzzles(signal),
  });
  const data = result.data,
    puzzle = puzzles.data?.find((item) => item.id === data?.puzzleId);
  return (
    <section className="progress-screen result-screen">
      <h1>Oyun Sonucu</h1>
      <QueryNotice
        pending={result.isPending}
        error={result.isError}
        retry={() => void result.refetch()}
      />
      {data && (
        <ResultCelebration
          data={data}
          title={puzzle?.title}
          cover={coverUrl(puzzle?.code)}
          pieces={pieces.data?.revealedPieces}
          myId={session?.user.id}
          myIdentity={session?.user.externalUserId}
          notice={
            <QueryNotice
              pending={pieces.isPending}
              error={pieces.isError}
              retry={() => void pieces.refetch()}
            />
          }
        />
      )}
    </section>
  );
}
