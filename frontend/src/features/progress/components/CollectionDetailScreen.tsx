import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useApiClient } from '@/shared/api/ApiProvider';
import { useSession } from '@/shared/session/SessionProvider';
import { createProgressApi } from '../api/progressApi';
import { coverUrl, PuzzleGrid, QueryNotice } from './ProgressUi';
import '../styles/progress.css';
export function CollectionDetailScreen({ puzzleId }: { puzzleId: string }) {
  const api = createProgressApi(useApiClient());
  const { session } = useSession();
  const detail = useQuery({
    queryKey: ['progress', 'collection-detail', session?.user.id, puzzleId],
    queryFn: ({ signal }) => api.detail(puzzleId, signal),
  });
  const puzzles = useQuery({
    queryKey: ['progress', 'puzzles'],
    queryFn: ({ signal }) => api.puzzles(signal),
  });
  const data = detail.data;
  return (
    <section className="progress-screen">
      <h1>{data?.collection.title ?? 'Puzzle Detayı'}</h1>
      <QueryNotice
        pending={detail.isPending}
        error={detail.isError}
        retry={() => void detail.refetch()}
      />
      {data && (
        <>
          <PuzzleGrid
            pieces={data.pieces}
            cover={coverUrl(puzzles.data?.find((item) => item.id === puzzleId)?.code)}
            label={'Kişisel koleksiyonunda ' + data.collection.unlockedCount + '/20 parça'}
          />
          <p className="collection-detail-count">
            {data.collection.unlockedCount}/20 parça ·{' '}
            {data.collection.completedAt ? 'Tamamlandı' : 'Keşfetmeye devam et'}
          </p>
          <p className="progress-footnote">Tüm oyunlarından biriken kişisel parçaların.</p>
          <Link className="primary" to={'/kesif/ayarlar?gorev=' + puzzleId}>
            Bu Keşfi Oyna →
          </Link>
        </>
      )}
      <Link className="settings-back" to="/kesif/koleksiyon">
        ← Koleksiyonuma dön
      </Link>
    </section>
  );
}
