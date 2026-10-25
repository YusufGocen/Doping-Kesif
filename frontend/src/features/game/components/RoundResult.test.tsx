// @vitest-environment jsdom
import { useNewRevealPieces } from './useNewRevealPieces';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoundResult } from './RoundResult';
import type { GameSnapshot } from '../model/schemas';
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function snapshot(correct: boolean, source = 'PLAYER'): GameSnapshot {
  return {
    id: 'game',
    roomId: 'room',
    puzzleId: 'puzzle',
    status: 'IN_PROGRESS',
    currentRoundNo: 1,
    revealedCount: 2,
    revealedPieces: [1, 2],
    sequence: 2,
    players: [
      { playerId: 'me', slot: 1, correctCount: correct ? 1 : 0, answered: true, continuing: false },
      { playerId: 'friend', slot: 2, correctCount: 1, answered: true, continuing: false },
    ],
    round: {
      id: 'round',
      roundNo: 1,
      status: 'REVEAL',
      question: {
        body: { text: '2+2?' },
        options: [
          { key: 'A', body: { text: '4' } },
          { key: 'B', body: { text: '5' } },
        ],
      },
      deadlineAt: null,
      revealDeadlineAt: null,
      correctOptionKey: 'A',
      answers: [
        {
          playerId: 'me',
          optionKey: source === 'TIMEOUT' ? null : correct ? 'A' : 'B',
          correct,
          source,
        },
        { playerId: 'friend', optionKey: 'A', correct: true, source: 'PLAYER' },
      ],
    },
  };
}
function show(game: GameSnapshot) {
  const next = vi.fn();
  const view = render(
    <RoundResult
      game={game}
      myId="me"
      myIdentity="local:yusuf"
      roster={[{ playerId: 'friend', displayName: 'Ayşe Yılmaz' }]}
      cover="history"
      pending={false}
      error={false}
      onNext={next}
    />,
  );
  return { next, ...view };
}
it('shows the actual correct result, both avatars, progress and next action', async () => {
  const { next, container } = show(snapshot(true));
  expect(screen.getByRole('heading', { name: 'Doğru Cevap!' })).toBeTruthy();
  expect(container.querySelector('[data-avatar=ayse]')).toBeTruthy();
  expect(screen.getByLabelText('2 parça açıldı').querySelectorAll('.unlocked')).toHaveLength(2);
  expect(
    screen.getByRole('progressbar', { name: 'Açılan puzzle parçaları' }).getAttribute('value'),
  ).toBe('2');
  await userEvent.setup().click(screen.getByRole('button', { name: 'Sonraki Soru' }));
  expect(next).toHaveBeenCalledOnce();
});
it('does not congratulate an incorrect answer and still explains the correct solution', () => {
  show(snapshot(false));
  expect(screen.queryByRole('heading', { name: 'Doğru Cevap!' })).toBeNull();
  expect(screen.getByText('Doğru cevap: A · 4')).toBeTruthy();
  expect(screen.getByText('Yanlış')).toBeTruthy();
});
it('shows timeout and disables continuing once the local player is ready', () => {
  const game = snapshot(false, 'TIMEOUT');
  game.players[0].continuing = true;
  show(game);
  expect(screen.getByRole('heading', { name: 'Süre doldu' })).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'Arkadaşın bekleniyor…' }).hasAttribute('disabled'),
  ).toBe(true);
});

it('animates only newly earned pieces and keeps the same reveal across polling updates', () => {
  const open = snapshot(true);
  open.round.status = 'QUESTION_OPEN';
  open.revealedPieces = [1];
  open.revealedCount = 1;
  const { result, rerender } = renderHook(({ game }) => useNewRevealPieces(game), {
    initialProps: { game: open },
  });
  expect(result.current).toEqual([]);
  const revealed = snapshot(true);
  rerender({ game: revealed });
  expect(result.current).toEqual([2]);
  rerender({ game: { ...revealed, sequence: 3 } });
  expect(result.current).toEqual([2]);
  const next = { ...open, round: { ...open.round, id: 'next-round' } };
  rerender({ game: next });
  expect(result.current).toEqual([]);
});
it('does not replay a result restored directly or award animations without new pieces', () => {
  const revealed = snapshot(true);
  const { result, unmount } = renderHook(() => useNewRevealPieces(revealed));
  expect(result.current).toEqual([]);
  unmount();
  const open = snapshot(false);
  open.round.status = 'QUESTION_OPEN';
  const other = renderHook(({ game }) => useNewRevealPieces(game), {
    initialProps: { game: open },
  });
  other.rerender({ game: snapshot(false) });
  expect(other.result.current).toEqual([]);
});
it('covers only the new tile with an animated lock lid', () => {
  const game = snapshot(true);
  const { container } = render(
    <RoundResult
      game={game}
      newRevealPieces={[2]}
      pending={false}
      error={false}
      onNext={() => {}}
      cover="history"
    />,
  );
  expect(container.querySelectorAll('.piece-opening')).toHaveLength(1);
  expect(container.querySelectorAll('.puzzle-piece-lid')).toHaveLength(1);
  expect(container.querySelectorAll('.unlocked')).toHaveLength(2);
});
