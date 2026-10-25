import { Button } from '@/shared/ui/Button';
const covers: Record<string, string> = {
  DEMO_HISTORY: 'history',
  DEMO_NATURE: 'nature',
  DEMO_CITY: 'city',
  DEMO_WORLD: 'world',
};
export function coverUrl(code?: string) {
  return code && covers[code] ? '/images/discovery/' + covers[code] + '.png' : undefined;
}
export function QueryNotice({
  pending,
  error,
  retry,
}: {
  pending: boolean;
  error: boolean;
  retry: () => void;
}) {
  return error ? (
    <div className="progress-notice" role="alert">
      Veriler yüklenemedi veya erişimin yok.{' '}
      <Button variant="text" onClick={retry}>
        Tekrar dene
      </Button>
    </div>
  ) : pending ? (
    <p role="status">Yükleniyor…</p>
  ) : null;
}
export function PuzzleGrid({
  pieces,
  cover,
  label,
}: {
  pieces: readonly number[];
  cover?: string;
  label: string;
}) {
  return (
    <div className="progress-puzzle" role="img" aria-label={label}>
      {Array.from({ length: 20 }, (_, index) => (
        <span
          key={index}
          className={pieces.includes(index + 1) ? 'open' : ''}
          style={
            cover
              ? {
                  backgroundImage: 'url(' + cover + ')',
                  backgroundPosition:
                    (index % 5) * 25 + '% ' + (Math.floor(index / 5) * 100) / 3 + '%',
                }
              : undefined
          }
        >
          {pieces.includes(index + 1) ? '' : '🔒'}
        </span>
      ))}
    </div>
  );
}
export function Pagination({
  page,
  size,
  total,
  busy,
  onChange,
}: {
  page: number;
  size: number;
  total: number;
  busy: boolean;
  onChange: (page: number) => void;
}) {
  if (total <= size && page === 0) return null;
  return (
    <nav className="progress-pagination" aria-label="Sayfalama">
      <Button variant="text" disabled={page === 0 || busy} onClick={() => onChange(page - 1)}>
        Önceki
      </Button>
      <span>{page + 1}. sayfa</span>
      <Button
        variant="text"
        disabled={(page + 1) * size >= total || busy}
        onClick={() => onChange(page + 1)}
      >
        Sonraki
      </Button>
    </nav>
  );
}
