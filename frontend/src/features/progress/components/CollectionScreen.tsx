import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useApiClient } from '@/shared/api/ApiProvider';
import { useSession } from '@/shared/session/SessionProvider';
import { createProgressApi } from '../api/progressApi';
import type { CollectionFilter } from '../model/schemas';
import { coverUrl, QueryNotice, Pagination } from './ProgressUi';
import '../styles/progress.css';
export function CollectionScreen() {
  const api = createProgressApi(useApiClient());
  const { session } = useSession();
  const user = session?.user.id;
  const [tab, setTab] = useState<'collection' | 'history'>('collection');
  const [filter, setFilter] = useState<CollectionFilter>('ALL');
  const [page, setPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const summary = useQuery({
    queryKey: ['progress', 'summary', user],
    queryFn: ({ signal }) => api.progress(signal),
  });
  const puzzles = useQuery({
    queryKey: ['progress', 'puzzles'],
    queryFn: ({ signal }) => api.puzzles(signal),
  });
  const collections = useQuery({
    queryKey: ['progress', 'collections', user, filter, page],
    queryFn: ({ signal }) => api.collections(filter, page, signal),
    enabled: tab === 'collection',
  });
  const history = useQuery({
    queryKey: ['progress', 'history', user, historyPage],
    queryFn: ({ signal }) => api.history(historyPage, signal),
    enabled: tab === 'history',
  });
  return (
    <section className="progress-screen">
      <h1>Koleksiyonum</h1>
      <QueryNotice
        pending={summary.isPending}
        error={summary.isError}
        retry={() => void summary.refetch()}
      />
      {summary.data && (
        <div className="progress-stats">
          <div>
            <strong>{summary.data.totalXp} XP</strong>
            <span>Toplam XP</span>
          </div>
          <div>
            <strong>{summary.data.completedGames}</strong>
            <span>Tamamlanan oyun</span>
          </div>
          <div>
            <strong>{summary.data.correctAnswers}</strong>
            <span>Toplam doğru</span>
          </div>
        </div>
      )}
      <nav className="progress-tabs" aria-label="Koleksiyon bölümleri">
        <button aria-pressed={tab === 'collection'} onClick={() => setTab('collection')}>
          Puzzle Koleksiyonum
        </button>
        <button aria-pressed={tab === 'history'} onClick={() => setTab('history')}>
          Oyun Geçmişim
        </button>
      </nav>
      {tab === 'collection' ? (
        <>
          <div className="progress-filters" aria-label="Koleksiyon filtreleri">
            {(
              [
                ['ALL', 'Tümü'],
                ['COMPLETED', 'Tamamlananlar'],
                ['IN_PROGRESS', 'Devam Edenler'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                aria-pressed={filter === value}
                onClick={() => {
                  setFilter(value);
                  setPage(0);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <QueryNotice
            pending={collections.isPending}
            error={collections.isError}
            retry={() => void collections.refetch()}
          />
          <div className="collection-grid">
            {collections.data?.items.map((item) => {
              const cover = coverUrl(puzzles.data?.find((p) => p.id === item.puzzleId)?.code);
              return (
                <Link
                  className="collection-card"
                  key={item.puzzleId}
                  to={'/kesif/koleksiyon/' + item.puzzleId}
                >
                  {cover ? (
                    <img src={cover} alt="" loading="lazy" />
                  ) : (
                    <div className="collection-cover-fallback">Keşif</div>
                  )}
                  <strong>{item.title}</strong>
                  <span>{item.unlockedCount}/20 parça</span>
                  <progress
                    max={20}
                    value={item.unlockedCount}
                    aria-label={item.title + ' ilerlemesi'}
                  />
                </Link>
              );
            })}
          </div>
          {collections.isSuccess && collections.data.items.length === 0 && (
            <p>Bu filtreye uygun puzzle bulunmuyor.</p>
          )}
          {collections.data && (
            <Pagination {...collections.data} busy={collections.isFetching} onChange={setPage} />
          )}
        </>
      ) : (
        <>
          <QueryNotice
            pending={history.isPending}
            error={history.isError}
            retry={() => void history.refetch()}
          />
          <div className="history-list">
            {history.data?.items.map((item) => (
              <Link to={'/kesif/sonuc/' + item.sessionId} key={item.sessionId}>
                <div>
                  <strong>{item.puzzleTitle}</strong>
                  <span>
                    {item.correctCount}/10 doğru · {item.revealedCount}/20 ortak parça ·{' '}
                    {item.collectionAddedCount} yeni koleksiyon parçası
                  </span>
                  {!item.rewardsFinalized && <small>Ödül kaydı kesinleştirilmemiş</small>}
                </div>
                <div>
                  <b>+{item.earnedXp} XP</b>
                  <time dateTime={item.endedAt}>
                    {new Date(item.endedAt).toLocaleDateString('tr-TR')}
                  </time>
                </div>
              </Link>
            ))}
          </div>
          {history.isSuccess && history.data.items.length === 0 && (
            <p>Henüz tamamlanmış bir oyunun yok.</p>
          )}
          {history.data && (
            <Pagination {...history.data} busy={history.isFetching} onChange={setHistoryPage} />
          )}
        </>
      )}
      <Link className="settings-back" to="/kesif">
        <ArrowLeft size={18} aria-hidden="true" />
        Keşiflere dön
      </Link>
    </section>
  );
}
