import { Play } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import type { z } from 'zod';
import { ArrowRight, Check, Crown, Home, Library, Puzzle, Sparkles, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserAvatar, demoAvatarIdentity } from '@/shared/ui/avatar/UserAvatar';
import { PuzzleGrid } from './ProgressUi';
import type { resultSchema } from '../model/schemas';
import '../styles/result-celebration.css';
type Props = {
  data: z.infer<typeof resultSchema>;
  title?: string;
  cover?: string;
  pieces?: number[];
  myId?: string;
  myIdentity?: string;
  notice?: ReactNode;
};
export function ResultCelebration({ data, title, cover, pieces, myId, myIdentity, notice }: Props) {
  const theme = cover?.includes('/nature.')
    ? 'nature'
    : cover?.includes('/city.')
      ? 'city'
      : cover?.includes('/history.')
        ? 'history'
        : cover?.includes('/world.')
          ? 'world'
          : 'default';
  const complete = data.revealedCount === 20;
  const [readyCover, setReadyCover] = useState<string | undefined>(undefined);
  const celebrationReady = complete && !!cover && readyCover === cover;
  return (
    <div
      className={'discovery-finale ' + (complete ? 'is-complete' : 'is-progress')}
      data-theme={theme}
    >
      <header className="finale-header">
        <span className="finale-trophy">
          <Trophy size={29} />
        </span>
        <span className="finale-eyebrow">
          {complete ? 'BİRLİKTE BAŞARDINIZ' : 'HER SORUDA YENİ BİR KEŞİF'}
        </span>
        <h2>{complete ? 'Puzzle Tamamlandı!' : 'Harika bir keşifti!'}</h2>
        <p>
          {complete
            ? '20 parçanın tamamını açtınız. Bu dünya artık sizin eseriniz.'
            : '10 soruyu birlikte tamamladınız. Açtığınız her parça yeni bir adım.'}
        </p>
      </header>
      <div className="finale-content">
        <div className="finale-showcase">
          {complete && (
            <div className="finale-confetti" aria-hidden="true">
              {Array.from({ length: 16 }, (_, i) => (
                <i
                  key={i}
                  style={
                    {
                      '--confetti-x': ((i * 37) % 100) + '%',
                      '--confetti-delay': i * 80 + 'ms',
                      '--confetti-rotation': i * 43 + 'deg',
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}
          <div className="finale-art-title">
            <span>
              <Sparkles size={15} />
              {complete ? 'KEŞİF TAMAMLANDI' : 'BİRLİKTE AÇTIĞINIZ DÜNYA'}
            </span>
            <h3>{title ?? 'Keşif sonucu'}</h3>
          </div>
          {notice}
          {pieces && (
            <div className={'finale-puzzle-frame' + (celebrationReady ? ' celebration-ready' : '')}>
              {complete && pieces.length === 20 && cover ? (
                <div
                  className="finale-finished-art"
                  role="img"
                  aria-label={'Bu oyunda 20/20 parça açıldı'}
                >
                  <img src={cover} alt="" onLoad={() => setReadyCover(cover)} />
                </div>
              ) : (
                <PuzzleGrid
                  pieces={pieces}
                  cover={cover}
                  label={'Bu oyunda ' + data.revealedCount + '/20 parça açıldı'}
                />
              )}{' '}
              {celebrationReady && (
                <span className="finale-art-glints" aria-hidden="true">
                  <Sparkles />
                  <Sparkles />
                  <Sparkles />
                  <Sparkles />
                </span>
              )}
              {complete && (
                <span className="finale-complete-seal">
                  <Check size={17} />
                  20/20 TAMAMLANDI
                </span>
              )}
            </div>
          )}
          <div className="finale-completion-track">
            <span>
              <Puzzle size={16} />
              {data.revealedCount}/20 parça
            </span>
            <strong>%{Math.round((data.revealedCount / 20) * 100)}</strong>
            <progress max={20} value={data.revealedCount} aria-label="Oyun puzzle tamamlanması" />
          </div>
        </div>
        <div className="finale-team">
          <div className="finale-team-heading">
            <Crown size={21} />
            <div>
              <h3>Keşfin kahramanları</h3>
              <p>Birlikte çözdünüz, birlikte kazandınız.</p>
            </div>
          </div>
          {[...data.players]
            .sort((a, b) => Number(b.playerId === myId) - Number(a.playerId === myId))
            .map((player) => (
              <article className="finale-player" key={player.playerId}>
                <div className="finale-player-heading">
                  <UserAvatar
                    identity={
                      player.playerId === myId ? myIdentity : demoAvatarIdentity(player.displayName)
                    }
                  />
                  <div>
                    <strong>{player.displayName}</strong>
                    <span>{player.playerId === myId ? 'Sen' : 'Oyun arkadaşın'}</span>
                  </div>
                  <span className="finale-xp">+{player.earnedXp} XP</span>
                </div>
                <div className="finale-player-stats">
                  <span>
                    <Check size={14} />
                    {player.correctCount}/10 doğru
                  </span>
                  <span>
                    <Puzzle size={14} />
                    Koleksiyona {player.collectionAddedCount} yeni parça
                  </span>
                </div>
              </article>
            ))}
          <div className="finale-team-note">
            <Sparkles size={18} />
            <p>
              {complete
                ? 'Birlikte harika bir dünya ortaya çıkardınız. Sıradaki keşif sizi bekliyor.'
                : 'Keşif burada bitmiyor. Yeni sorularla daha fazla parçayı açabilirsiniz.'}
            </p>
          </div>
        </div>
      </div>
      {!data.rewardsFinalized && (
        <p className="progress-notice" role="status">
          Bu oyun için ödül kaydı kesinleştirilmemiş. Gösterilen kazanımlar henüz son hali
          olmayabilir.
        </p>
      )}
      <footer className="finale-compact-actions" aria-label="Keşfe devam et">
        <Link className="finale-compact-home" to="/kesif">
          <Home size={17} aria-hidden="true" />
          Ana Sayfaya Dön
        </Link>
        <Link className="finale-compact-play" to={'/kesif/ayarlar?gorev=' + data.puzzleId}>
          <Play size={17} aria-hidden="true" />
          Yeni Oyun Başlat
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <Link className="finale-compact-collection" to={'/kesif/koleksiyon/' + data.puzzleId}>
          <Library size={17} aria-hidden="true" />
          Koleksiyonda Gör
        </Link>
      </footer>
      <p className="finale-footnote">
        Bu oyunda açılan parçalar gösterilir. Tüm keşiflerde biriktirdiğin parçalar koleksiyonunda.
      </p>
    </div>
  );
}
