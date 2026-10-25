import { DiscoveryCompass as Compass } from '@/shared/brand/DiscoveryCompass';
import { ArrowRight, CircleCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSession } from '@/shared/session/SessionProvider';
import { useApiClient } from '@/shared/api/ApiProvider';
import { Button } from '@/shared/ui/Button';
import { catalogQueries } from '../api/queries';
import { previewPuzzles, puzzleCovers } from '../model/puzzleCovers';
import '../styles/gallery.css';

export function PuzzleGallery() {
  const { session } = useSession();
  const client = useApiClient();
  const queries = catalogQueries(client);
  const puzzles = useQuery({ ...queries.puzzles(), enabled: !!session });
  const progress = useQuery({ ...queries.puzzleProgress(), enabled: !!session });
  const cards = session ? puzzles.data : previewPuzzles;
  const order = previewPuzzles.map((item) => item.code as string);
  return (
    <section className="puzzle-tasks" aria-labelledby="puzzle-tasks-title">
      <div className="home-section-heading">
        <div className="home-section-title">
          <span className="section-emblem">
            <Compass size={23} />
          </span>
          <div>
            <h2 id="puzzle-tasks-title" tabIndex={-1}>
              Keşif Görevleri
            </h2>
            <p>Bir dünya seç. Her doğru cevapla biraz daha keşfet.</p>
          </div>
        </div>
      </div>
      {session && puzzles.isPending && <p role="status">Keşifler yükleniyor…</p>}
      {session && puzzles.isError && (
        <div role="alert">
          Keşifler yüklenemedi.{' '}
          <Button variant="text" onClick={() => void puzzles.refetch()}>
            Tekrar dene
          </Button>
        </div>
      )}
      {session && puzzles.isSuccess && puzzles.data.length === 0 && (
        <p>Henüz bir keşif bulunmuyor.</p>
      )}
      <div className="puzzle-task-grid">
        {cards &&
          [...cards]
            .sort((a, b) => {
              const x = order.indexOf(a.code),
                y = order.indexOf(b.code);
              return (x < 0 ? 99 : x) - (y < 0 ? 99 : y);
            })
            .map((item) => {
              const actual = 'id' in item ? item : null;
              const owned = actual
                ? progress.data?.items.find((row) => row.puzzleId === actual.id)
                : undefined;
              const count = progress.isSuccess && actual ? (owned?.unlockedCount ?? 0) : null;
              const completed = count === item.pieceCount;
              return (
                <article
                  className={'puzzle-task-card' + (completed ? ' puzzle-task-complete' : '')}
                  key={item.code}
                >
                  {completed && (
                    <span className="puzzle-completion-badge">
                      <CircleCheck size={14} aria-hidden="true" />
                      Tamamlandı
                    </span>
                  )}
                  {puzzleCovers[item.code] ? (
                    <img
                      className="puzzle-task-cover"
                      src={puzzleCovers[item.code]}
                      alt={item.title}
                      width="360"
                      height="450"
                      loading="lazy"
                    />
                  ) : (
                    <div className="puzzle-task-fallback" aria-label={item.title}>
                      Keşif
                    </div>
                  )}
                  <div className="puzzle-task-body">
                    <span className={'puzzle-theme ' + item.code.toLowerCase()}>
                      {(
                        {
                          DEMO_HISTORY: 'Tarih',
                          DEMO_NATURE: 'Doğa',
                          DEMO_CITY: 'Şehir',
                          DEMO_WORLD: 'Dünya',
                        } as Record<string, string>
                      )[item.code] ?? 'Keşif'}
                    </span>
                    <h3>{item.title}</h3>
                    <p className="puzzle-description">
                      {(
                        {
                          DEMO_HISTORY: 'Geçmişin izlerini birlikte keşfet.',
                          DEMO_NATURE: 'Doğanın saklı güzelliklerine yolculuk et.',
                          DEMO_CITY: 'Hayal gücünün renkli sokaklarında gez.',
                          DEMO_WORLD: 'Yeni kültürler, yepyeni ufuklar.',
                        } as Record<string, string>
                      )[item.code] ?? 'Soruları çöz, bu dünyayı keşfet.'}
                    </p>
                    <span className="puzzle-task-count">
                      {count === null
                        ? `${item.pieceCount} parça`
                        : `${count}/${item.pieceCount} parça`}
                    </span>
                    <div className="puzzle-task-progress" aria-hidden="true">
                      <span
                        style={{
                          width: `${count === null ? 0 : (count / item.pieceCount) * 100}%`,
                        }}
                      />
                    </div>
                    <Link
                      className="puzzle-play"
                      to={`/kesif/ayarlar?gorev=${encodeURIComponent(actual?.id ?? item.code)}`}
                      aria-label={`${item.title} ${completed ? 'tekrar oyna' : 'oyna'}`}
                    >
                      {completed ? 'Tekrar Oyna' : 'Keşfe Başla'}{' '}
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
      </div>
      {session && progress.isError && (
        <div className="gallery-status" role="alert">
          Koleksiyon ilerlemesi okunamadı.{' '}
          <Button variant="text" onClick={() => void progress.refetch()}>
            Tekrar dene
          </Button>
        </div>
      )}
      {!session && (
        <p className="gallery-status">
          Giriş yaparak keşfe başlayabilirsin. Kartlar önizleme olarak gösteriliyor.
        </p>
      )}
    </section>
  );
}
