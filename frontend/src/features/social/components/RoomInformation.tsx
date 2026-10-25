import { Button } from '@/shared/ui/Button';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/shared/api/ApiProvider';
import { createSocialApi } from '../api/socialApi';
export function RoomInformation({
  selection,
}: {
  selection: { gradeLevel: number; puzzleId: string; subjectId: string; topicId: string | null };
}) {
  const api = createSocialApi(useApiClient());
  const puzzles = useQuery({
    queryKey: ['social', 'puzzle-metadata'],
    queryFn: ({ signal }) => api.puzzles(signal),
  });
  const subjects = useQuery({
    queryKey: ['social', 'subject-metadata', selection.gradeLevel],
    queryFn: ({ signal }) => api.subjects(selection.gradeLevel, signal),
  });
  const topics = useQuery({
    queryKey: ['social', 'topic-metadata', selection.gradeLevel, selection.subjectId],
    queryFn: ({ signal }) => api.topics(selection.gradeLevel, selection.subjectId, signal),
    enabled: !!selection.topicId,
  });
  return (
    <section className="lobby-info">
      <h2>Oyun Bilgileri</h2>
      {(puzzles.isError || subjects.isError || topics.isError) && (
        <p className="room-muted" role="alert">
          Bazı oyun bilgileri okunamadı.{' '}
          <Button
            variant="text"
            onClick={() => {
              void puzzles.refetch();
              void subjects.refetch();
              if (selection.topicId) void topics.refetch();
            }}
          >
            Tekrar dene
          </Button>
        </p>
      )}
      <dl className="lobby-details">
        <dt>Görev</dt>
        <dd>
          {puzzles.data?.find((p) => p.id === selection.puzzleId)?.title ??
            (puzzles.isSuccess
              ? 'Görev bilgisi bulunamadı'
              : puzzles.isError
                ? 'Görev bilgisi okunamadı'
                : 'Yükleniyor…')}
        </dd>
        <dt>Sınıf</dt>
        <dd>{selection.gradeLevel}. Sınıf</dd>
        <dt>Ders</dt>
        <dd>
          {subjects.data?.find((s) => s.id === selection.subjectId)?.name ??
            (subjects.isSuccess
              ? 'Ders bilgisi bulunamadı'
              : subjects.isError
                ? 'Ders bilgisi okunamadı'
                : 'Yükleniyor…')}
        </dd>
        <dt>Konu</dt>
        <dd>
          {selection.topicId
            ? (topics.data?.find((t) => t.id === selection.topicId)?.name ??
              (topics.isError
                ? 'Konu bilgisi okunamadı'
                : topics.isSuccess
                  ? 'Konu bilgisi bulunamadı'
                  : 'Konu bilgisi yükleniyor…'))
            : 'Tüm Konular'}
        </dd>
        <dt>Soru Sayısı</dt>
        <dd>10 Soru</dd>
      </dl>
    </section>
  );
}
