import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Puzzle, ListChecks } from 'lucide-react';
import { useApiClient } from '@/shared/api/ApiProvider';
import { Button } from '@/shared/ui/Button';
import { catalogQueries } from '../api/queries';
import { puzzleCovers } from '../model/puzzleCovers';
import '../styles/catalog.css';
import { SubjectIcon } from './SubjectIcon';

function QueryMessage({
  pending,
  error,
  retry,
}: {
  pending: boolean;
  error: boolean;
  retry: () => void;
}) {
  if (error)
    return (
      <div className="catalog-message" role="alert">
        Veriler yüklenemedi.{' '}
        <Button variant="text" onClick={retry}>
          Tekrar dene
        </Button>
      </div>
    );
  return pending ? (
    <p className="catalog-message" role="status">
      Yükleniyor…
    </p>
  ) : null;
}

export interface GameSelection {
  puzzleId: string;
  puzzleTitle: string;
  gradeLevel: number;
  subjectId: string;
  subjectName: string;
  topicId: string | null;
  topicName: string;
}
export function GameSettings({
  puzzleReference,
  onContinue,
}: {
  puzzleReference: string;
  onContinue: (selection: GameSelection) => void;
}) {
  const client = useApiClient();
  const queries = catalogQueries(client);
  const [grade, setGrade] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [topicId, setTopicId] = useState('');
  const puzzles = useQuery(queries.puzzles());
  const grades = useQuery(queries.grades());
  const subjects = useQuery({ ...queries.subjects(grade ?? 0), enabled: grade !== null });
  const topics = useQuery({
    ...queries.topics(grade ?? 0, subjectId ?? ''),
    enabled: grade !== null && subjectId !== null,
  });
  const puzzle = puzzles.data?.find(
    (item) => item.id === puzzleReference || item.code === puzzleReference,
  );
  const subject = subjects.data?.find((item) => item.id === subjectId);
  const topic = topics.data?.find((item) => item.id === topicId);
  const selectionReady =
    !!puzzle &&
    grades.isSuccess &&
    grades.data.some((item) => item.gradeLevel === grade && item.playable) &&
    grade !== null &&
    subjects.isSuccess &&
    subject?.playable &&
    topics.isSuccess &&
    (!topicId || topic?.playable);

  return (
    <section className="game-settings" aria-label="Oyun ayarları">
      <QueryMessage
        pending={puzzles.isPending}
        error={puzzles.isError}
        retry={() => void puzzles.refetch()}
      />
      {puzzle && (
        <div className="settings-puzzle settings-mission-card">
          <img src={puzzleCovers[puzzle.code]} alt="" />
          <div>
            <span className="settings-mission-label">SEÇTİĞİN KEŞİF</span>
            <strong>{puzzle.title}</strong>
            <p>Her doğru cevapla yeni bir parça aç. Bu keşfi arkadaşınla tamamla!</p>
            <div className="settings-mission-facts">
              <span>
                <ListChecks size={14} aria-hidden="true" />
                10 soru
              </span>
              <span>
                <Puzzle size={14} aria-hidden="true" />
                20 puzzle parçası
              </span>
            </div>
          </div>
        </div>
      )}
      {puzzles.isSuccess && !puzzle && (
        <p role="alert">Bu keşif bulunamadı. Ana sayfadan bir görev seç.</p>
      )}
      <fieldset className="catalog-fieldset">
        <legend>Sınıfını seç</legend>
        <QueryMessage
          pending={grades.isPending}
          error={grades.isError}
          retry={() => void grades.refetch()}
        />
        {grades.isSuccess && grades.data.length === 0 && (
          <p className="catalog-message">Henüz sınıf bilgisi bulunmuyor.</p>
        )}
        <div className="grade-choices">
          {grades.data?.map((item) => (
            <button
              type="button"
              key={item.gradeLevel}
              disabled={!item.playable}
              aria-pressed={grade === item.gradeLevel}
              onClick={() => {
                setGrade(item.gradeLevel);
                setSubjectId(null);
                setTopicId('');
              }}
            >
              {item.gradeLevel}. Sınıf{!item.playable && <small>İçerik hazırlanıyor</small>}
            </button>
          ))}
        </div>
      </fieldset>
      {grade !== null && (
        <fieldset className="catalog-fieldset">
          <legend>Dersini seç</legend>
          <QueryMessage
            pending={subjects.isPending}
            error={subjects.isError}
            retry={() => void subjects.refetch()}
          />
          {subjects.isSuccess && subjects.data.length === 0 && (
            <p className="catalog-message">Bu sınıf için ders bulunmuyor.</p>
          )}
          <div className="subject-choices">
            {subjects.data?.map((item) => (
              <button
                type="button"
                key={item.id}
                disabled={!item.playable}
                aria-pressed={subjectId === item.id}
                onClick={() => {
                  setSubjectId(item.id);
                  setTopicId('');
                }}
              >
                <SubjectIcon name={item.name} />
                <span>{item.name}</span>
                {!item.playable && <small>Yeterli soru yok</small>}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {subjectId && (
        <div className="catalog-topic">
          <label htmlFor="topic-selection">
            Konu Seçimi <span>(isteğe bağlı)</span>
          </label>
          <QueryMessage
            pending={topics.isPending}
            error={topics.isError}
            retry={() => void topics.refetch()}
          />
          <select
            id="topic-selection"
            value={topicId}
            disabled={!topics.isSuccess}
            onChange={(event) => setTopicId(event.target.value)}
          >
            <option value="">Tüm Konular</option>
            {topics.data?.map((item) => (
              <option key={item.id} value={item.id} disabled={!item.playable}>
                {item.name}
                {!item.playable ? ' — Yeterli soru yok' : ''}
              </option>
            ))}
          </select>
          {topics.isSuccess && topics.data.length === 0 && (
            <p className="catalog-message">Bu ders için konu bulunmuyor.</p>
          )}
        </div>
      )}
      {selectionReady && (
        <div className="selection-summary" role="status">
          <Check size={19} />
          <div>
            <strong>{puzzle.title}</strong>
            <p>
              {grade}. Sınıf · {subject.name} · {topic?.name ?? 'Tüm Konular'}
            </p>
            <small>10 soru · 20 parça</small>
          </div>
        </div>
      )}
      <Button
        endArrow
        className="settings-continue"
        disabled={!selectionReady}
        onClick={() => {
          if (selectionReady && puzzle && subject && grade !== null)
            onContinue({
              puzzleId: puzzle.id,
              puzzleTitle: puzzle.title,
              gradeLevel: grade,
              subjectId: subject.id,
              subjectName: subject.name,
              topicId: topicId || null,
              topicName: topic?.name ?? 'Tüm Konular',
            });
        }}
      >
        Devam Et
      </Button>
    </section>
  );
}
