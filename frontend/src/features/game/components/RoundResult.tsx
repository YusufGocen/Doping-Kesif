import type { CSSProperties } from 'react';
import { Check, Clock3, LockKeyhole, Puzzle, Sparkles, X } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { UserAvatar, demoAvatarIdentity } from '@/shared/ui/avatar/UserAvatar';
import type { GameSnapshot } from '../model/schemas';
import '../styles/round-result.css';

type Props = {
  game: GameSnapshot;
  newRevealPieces?: number[];
  myId?: string;
  myIdentity?: string;
  roster?: { playerId: string; displayName: string }[];
  cover?: string;
  pending: boolean;
  error: boolean;
  onNext: () => void;
};
export function RoundResult({
  game,
  newRevealPieces = [],
  myId,
  myIdentity,
  roster,
  cover,
  pending,
  error,
  onNext,
}: Props) {
  const round = game.round;
  const mine = round.answers.find((answer) => answer.playerId === myId);
  const waiting = game.players.find((player) => player.playerId === myId)?.continuing;
  const correct = mine?.correct === true;
  const timedOut = mine?.source === 'TIMEOUT';
  const StatusIcon = correct ? Check : timedOut ? Clock3 : X;
  const solution = round.question.options.find((option) => option.key === round.correctOptionKey)
    ?.body.text;
  return (
    <div className="round-result">
      <h1>
        Cevap Sonucu <Sparkles size={25} aria-hidden="true" />
      </h1>
      <div
        className={'round-result-banner ' + (correct ? 'is-correct' : 'is-review')}
        role="status"
      >
        <span className="round-result-status-icon">
          <StatusIcon size={27} />
        </span>
        <div>
          <h2>
            {correct ? 'Doğru Cevap!' : timedOut ? 'Süre doldu' : 'Birlikte öğrenmeye devam!'}
          </h2>
          <p>
            Doğru cevap: {round.correctOptionKey} · {solution}
          </p>
        </div>
        <Sparkles className="round-result-sparkles" size={45} aria-hidden="true" />
      </div>
      <div className="round-result-players">
        {[...game.players]
          .sort((a, b) => Number(b.playerId === myId) - Number(a.playerId === myId))
          .map((player) => {
            const answer = round.answers.find((item) => item.playerId === player.playerId);
            const name = roster?.find((item) => item.playerId === player.playerId)?.displayName;
            const Icon = answer?.source === 'TIMEOUT' ? Clock3 : answer?.correct ? Check : X;
            return (
              <article key={player.playerId}>
                <UserAvatar
                  identity={player.playerId === myId ? myIdentity : demoAvatarIdentity(name)}
                />
                <div>
                  <strong>{player.playerId === myId ? 'Sen' : (name ?? 'Oyun arkadaşın')}</strong>
                  <span className={answer?.correct ? 'answer-correct' : 'answer-review'}>
                    <Icon size={16} aria-hidden="true" />
                    {answer?.source === 'TIMEOUT'
                      ? 'Süre doldu'
                      : answer
                        ? answer.correct
                          ? 'Doğru'
                          : 'Yanlış'
                        : 'Sonuç bekleniyor'}
                  </span>
                </div>
              </article>
            );
          })}
      </div>
      <div className="round-result-puzzle-area">
        <div
          className="game-puzzle round-result-puzzle"
          aria-label={game.revealedCount + ' parça açıldı'}
        >
          {Array.from({ length: 20 }, (_, i) => (
            <span
              key={i}
              className={
                game.revealedPieces.includes(i + 1)
                  ? 'unlocked' + (newRevealPieces.includes(i + 1) ? ' piece-opening' : '')
                  : ''
              }
              style={
                {
                  '--piece-image': cover ? 'url(/images/discovery/' + cover + '.png)' : 'none',
                  '--piece-position': (i % 5) * 25 + '% ' + (Math.floor(i / 5) * 100) / 3 + '%',
                  '--piece-delay': Math.max(0, newRevealPieces.indexOf(i + 1)) * 350 + 'ms',
                } as CSSProperties
              }
            >
              <span className="puzzle-tile-image" aria-hidden="true" />
              {!game.revealedPieces.includes(i + 1) && (
                <span className="puzzle-tile-shade" aria-hidden="true">
                  <span className="puzzle-curtain left" />
                  <span className="puzzle-curtain right" />
                  <LockKeyhole size={18} />
                </span>
              )}
              {game.revealedPieces.includes(i + 1) && newRevealPieces.includes(i + 1) && (
                <span
                  className="puzzle-piece-lid"
                  aria-hidden="true"
                  style={
                    {
                      '--piece-delay': newRevealPieces.indexOf(i + 1) * 350 + 'ms',
                    } as CSSProperties
                  }
                >
                  <LockKeyhole size={18} />
                </span>
              )}
            </span>
          ))}
        </div>
        <aside className="round-result-progress" aria-label="Puzzle ilerlemesi">
          <span className="round-result-progress-icon">
            <Puzzle size={26} />
          </span>
          <div>
            <h2>Puzzle ilerlemesi</h2>
            <strong>
              {game.revealedCount}
              <span>/20 parça</span>
            </strong>
          </div>
          <progress value={game.revealedCount} max={20} aria-label="Açılan puzzle parçaları" />
          <p>Her doğru cevapla bu dünyanın yeni bir parçasını keşfedin.</p>
        </aside>
      </div>
      <div className="round-result-next">
        <div>
          <h2>
            {game.currentRoundNo === 10
              ? 'Keşfinizin sonucunu görelim!'
              : 'Bir sonraki soruya hazır mısın?'}
          </h2>
          <p>
            {waiting
              ? 'Arkadaşın da hazır olduğunda devam edeceksiniz.'
              : game.currentRoundNo === 10
                ? 'Birlikte açtığınız parçaları ve kazandığınız XP’yi görün.'
                : game.currentRoundNo + 1 + '. soruda keşfe birlikte devam edin.'}
          </p>
        </div>
        <Button endArrow={!waiting} busy={pending} disabled={!!waiting} onClick={onNext}>
          {waiting
            ? 'Arkadaşın bekleniyor…'
            : game.currentRoundNo === 10
              ? 'Sonuçları Gör'
              : 'Sonraki Soru'}
        </Button>
      </div>
      {error && <p role="alert">Devam isteği tamamlanamadı. Tekrar deneyebilirsin.</p>}
    </div>
  );
}
