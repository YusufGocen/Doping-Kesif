import { DiscoveryCompass as Compass } from '@/shared/brand/DiscoveryCompass';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Check, Puzzle } from 'lucide-react';
import { useApiClient } from '@/shared/api/ApiProvider';
import { Button } from '@/shared/ui/Button';
import { catalogQueries } from '../api/queries';
import { PuzzleArtwork } from './PuzzleArtwork';
import '../styles/catalog.css';

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

export function CatalogExplorer() {
  const client = useApiClient();
  const queries = catalogQueries(client);
  const [puzzleId, setPuzzleId] = useState<string | null>(null);
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
  const puzzle = puzzles.data?.find((item) => item.id === puzzleId);
  const subject = subjects.data?.find((item) => item.id === subjectId);
  const topic = topics.data?.find((item) => item.id === topicId);
  const selectionReady =
    !!puzzle &&
    grade !== null &&
    subject?.playable &&
    topics.isSuccess &&
    (!topicId || topic?.playable);

  return (
    <section className="catalog-explorer" aria-labelledby="catalog-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">SENİN MERAKIN, SENİN ROTAN</span>
          <h2 id="catalog-title">Keşfini planla</h2>
        </div>
        <Compass size={24} />
      </div>
      <fieldset className="catalog-fieldset">
        <legend>
          <Puzzle size={17} />
          Bir dünya seç
        </legend>
        <QueryMessage
          pending={puzzles.isPending}
          error={puzzles.isError}
          retry={() => void puzzles.refetch()}
        />
        {puzzles.isSuccess && puzzles.data.length === 0 && (
          <p className="catalog-message">Henüz oynanabilir bir keşif bulunmuyor.</p>
        )}
        <div className="puzzle-grid">
          {puzzles.data?.map((item) => (
            <label
              key={item.id}
              className={`puzzle-choice ${puzzleId === item.id ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="puzzle"
                value={item.id}
                checked={puzzleId === item.id}
                onChange={() => setPuzzleId(item.id)}
              />
              <PuzzleArtwork code={item.code} />
              <span className="puzzle-choice-copy">
                <strong>{item.title}</strong>
                <span>{item.pieceCount} parça</span>
              </span>
              {puzzleId === item.id && (
                <span className="choice-check">
                  <Check size={14} />
                </span>
              )}
            </label>
          ))}
        </div>
      </fieldset>
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
          <legend>
            <BookOpen size={17} />
            Dersini seç
          </legend>
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
                <BookOpen size={20} />
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
            Konu <span>isteğe bağlı</span>
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
    </section>
  );
}
