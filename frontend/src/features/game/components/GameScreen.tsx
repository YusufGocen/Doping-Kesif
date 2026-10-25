import { useNewRevealPieces } from './useNewRevealPieces';
import { RoundResult } from './RoundResult';
import { CountdownBar } from './CountdownBar';
import { useRealtimeInterval } from '@/shared/realtime/RealtimeContext';
import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { useSession } from '@/shared/session/SessionProvider';
import { useApiClient } from '@/shared/api/ApiProvider';
import { UserAvatar, demoAvatarIdentity } from '@/shared/ui/avatar/UserAvatar';
import { Button } from '@/shared/ui/Button';
import { createGameApi } from '../api/gameApi';
import type { GameSnapshot } from '../model/schemas';
import '../styles/game.css';
const covers: Record<string, string> = {
  DEMO_HISTORY: 'history',
  DEMO_NATURE: 'nature',
  DEMO_CITY: 'city',
  DEMO_WORLD: 'world',
};
export function GameScreen({ sessionId }: { sessionId: string }) {
  const interval = useRealtimeInterval(1000);
  const api = createGameApi(useApiClient());
  const { session } = useSession();
  const cache = useQueryClient();
  const key = ['game', 'session', sessionId, session?.user.id];
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  const game = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api.snapshot(sessionId, signal),
    refetchInterval: (q) =>
      q.state.data && ['COMPLETED', 'CANCELLED', 'ABANDONED'].includes(q.state.data.status)
        ? false
        : interval,
  });
  const newRevealPieces = useNewRevealPieces(game.data);
  const roster = useQuery({
    queryKey: ['game', 'roster', game.data?.roomId],
    queryFn: ({ signal }) => api.roster(game.data!.roomId, signal),
    enabled: !!game.data,
  });
  const puzzles = useQuery({
    queryKey: ['game', 'puzzles'],
    queryFn: ({ signal }) => api.puzzles(signal),
  });
  const publish = async (next: GameSnapshot) => {
    await cache.cancelQueries({ queryKey: key });
    cache.setQueryData<GameSnapshot>(key, (old) =>
      old && old.sequence > next.sequence ? old : next,
    );
  };
  const answer = useMutation({
    mutationFn: (attempt: { roundId: string; clientRequestId: string; optionKey: string }) =>
      api.answer(sessionId, attempt.roundId, attempt),
    onSuccess: publish,
    onError: () => void game.refetch(),
  });
  const proceed = useMutation({
    mutationFn: (roundNo: number) => api.next(sessionId, roundNo),
    onSuccess: publish,
    onError: () => void game.refetch(),
  });
  const [chosen, setChosen] = useState<{ roundId: string; optionKey: string } | null>(null);
  const attempt = useRef<{ roundId: string; clientRequestId: string; optionKey: string } | null>(
    null,
  );
  useEffect(() => {
    if (game.data?.status === 'COMPLETED') {
      void cache.invalidateQueries({ queryKey: ['catalog'] });
      void cache.invalidateQueries({ queryKey: ['progress'] });
      void cache.invalidateQueries({ queryKey: ['game', 'active'] });
    }
  }, [game.data?.status, cache]);
  if (game.isPending) return <p role="status">Oyun yükleniyor…</p>;
  if (game.isError)
    return (
      <div role="alert">
        Oyun okunamadı veya erişimin yok.{' '}
        <Button variant="text" onClick={() => void game.refetch()}>
          Tekrar dene
        </Button>
        <Link to="/kesif">Keşif’e dön</Link>
      </div>
    );
  const data = game.data,
    round = data.round;
  const me = data.players.find((p) => p.playerId === session?.user.id);
  const selected = chosen?.roundId === round.id ? chosen.optionKey : null;
  const reveal = round.status === 'REVEAL' || round.status === 'COMPLETED';
  const finished = data.status === 'COMPLETED';
  const closed = ['CANCELLED', 'ABANDONED'].includes(data.status);
  const deadline = round.status === 'QUESTION_OPEN' ? round.deadlineAt : round.revealDeadlineAt;
  const seconds = deadline ? Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000)) : 0;
  const puzzle = puzzles.data?.find((p) => p.id === data.puzzleId),
    cover = puzzle && covers[puzzle.code];
  const send = () => {
    if (!selected || me?.answered || seconds === 0 || round.status !== 'QUESTION_OPEN') return;
    if (attempt.current?.roundId !== round.id)
      attempt.current = {
        roundId: round.id,
        clientRequestId: crypto.randomUUID(),
        optionKey: selected,
      };
    answer.mutate(attempt.current);
  };
  return (
    <section className="game-screen" aria-label="Ortak keşif oyunu">
      {!reveal && (
        <div className="game-roster">
          {data.players.map((player) => (
            <div key={player.playerId}>
              <UserAvatar
                identity={
                  player.playerId === session?.user.id
                    ? session.user.externalUserId
                    : demoAvatarIdentity(
                        roster.data?.players.find((p) => p.playerId === player.playerId)
                          ?.displayName,
                      )
                }
              />
              <div>
                <strong>
                  {roster.data?.players.find((p) => p.playerId === player.playerId)?.displayName ??
                    (player.playerId === session?.user.id ? 'Sen' : 'Oyun arkadaşın')}
                </strong>
                <small>
                  {player.correctCount}/10 doğru ·{' '}
                  {player.answered ? 'Cevap verildi' : 'Cevap bekleniyor'}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
      {closed ? (
        <>
          <h1>Oyun sona erdi</h1>
          <Link to="/kesif">Keşif’e dön</Link>
        </>
      ) : finished ? (
        <Navigate to={'/kesif/sonuc/' + sessionId} replace />
      ) : (
        <>
          <div className="game-round-meta">
            <span>Soru {data.currentRoundNo}/10</span>
            <span aria-label="Kalan süre">◷ {seconds} sn</span>
          </div>
          <CountdownBar
            key={round.id + round.status + (deadline ?? '')}
            deadline={deadline}
            now={now}
          />
          {!reveal ? (
            <>
              <h1>{round.question.body.text}</h1>
              <div className="game-options" role="radiogroup" aria-label="Cevabın">
                {round.question.options.map((option) => (
                  <label className={selected === option.key ? 'selected' : ''} key={option.key}>
                    <input
                      type="radio"
                      name="answer"
                      aria-label={option.key + ' ' + option.body.text}
                      value={option.key}
                      checked={selected === option.key}
                      disabled={
                        !!me?.answered ||
                        answer.isPending ||
                        seconds === 0 ||
                        attempt.current?.roundId === round.id
                      }
                      onChange={() => setChosen({ roundId: round.id, optionKey: option.key })}
                    />
                    <b>{option.key}</b>
                    <span>{option.body.text}</span>
                  </label>
                ))}
              </div>
              {me?.answered ? (
                <p role="status">Cevabın gönderildi. Arkadaşının cevabı bekleniyor…</p>
              ) : seconds === 0 ? (
                <p role="status">Süre doldu. Sunucu sonucu bekleniyor…</p>
              ) : (
                <Button busy={answer.isPending} disabled={!selected} onClick={send}>
                  {answer.isError ? 'Cevabı Tekrar Gönder' : 'Cevabı Gönder'}
                </Button>
              )}
              {answer.isError && !me?.answered && (
                <p role="alert">Cevap doğrulanamadı. Aynı cevabı güvenle tekrar gönderebilirsin.</p>
              )}
            </>
          ) : (
            <RoundResult
              key={round.id}
              newRevealPieces={newRevealPieces}
              game={data}
              myId={session?.user.id}
              myIdentity={session?.user.externalUserId}
              roster={roster.data?.players}
              cover={cover}
              pending={proceed.isPending}
              error={proceed.isError}
              onNext={() => proceed.mutate(round.roundNo)}
            />
          )}
        </>
      )}
    </section>
  );
}
