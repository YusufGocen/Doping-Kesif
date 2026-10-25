// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ResultCelebration } from './ResultCelebration';
afterEach(cleanup);
function show(count: number, finalized = true) {
  return render(
    <MemoryRouter>
      <ResultCelebration
        data={{
          sessionId: 'game',
          puzzleId: 'puzzle',
          revealedCount: count,
          endedAt: '2026-10-24T12:00:00Z',
          rewardsFinalized: finalized,
          players: [
            {
              playerId: 'me',
              displayName: 'Mert Demir',
              correctCount: 10,
              earnedXp: 80,
              collectionAddedCount: 3,
            },
            {
              playerId: 'friend',
              displayName: 'Yusuf Göçen',
              correctCount: 8,
              earnedXp: 50,
              collectionAddedCount: 2,
            },
          ],
        }}
        pieces={Array.from({ length: count }, (_, i) => i + 1)}
        cover="/images/discovery/world.png"
        title="Renkli Dünya"
        myId="me"
        myIdentity="local:mert"
      />
    </MemoryRouter>,
  );
}
it('celebrates a fully completed puzzle and resolves the other player avatar', () => {
  const { container } = show(20);
  expect(screen.getByRole('heading', { name: 'Puzzle Tamamlandı!' })).toBeTruthy();
  expect(screen.getByRole('img', { name: 'Bu oyunda 20/20 parça açıldı' })).toBeTruthy();
  expect(container.querySelector('.is-complete')).toBeTruthy();
  expect(container.querySelector('.celebration-ready')).toBeNull();
  fireEvent.load(container.querySelector('.finale-finished-art img')!);
  expect(container.querySelector('.celebration-ready')).toBeTruthy();
  expect(container.querySelector('.finale-art-glints')).toBeTruthy();
  expect(container.querySelector('[data-avatar=yusuf]')).toBeTruthy();
  expect(screen.getByText('+80 XP')).toBeTruthy();
  expect(screen.getByText('+50 XP')).toBeTruthy();
  expect(screen.getByText('Koleksiyona 2 yeni parça')).toBeTruthy();
});
it('does not claim completion or finalized rewards for a partial result', () => {
  const { container } = show(4, false);
  expect(screen.queryByRole('heading', { name: 'Puzzle Tamamlandı!' })).toBeNull();
  expect(container.querySelector('.finale-confetti')).toBeNull();
  expect(container.querySelectorAll('.progress-puzzle .open')).toHaveLength(4);
  expect(screen.getByRole('status').textContent).toContain('ödül kaydı kesinleştirilmemiş');
  expect(screen.getByRole('link', { name: 'Koleksiyonda Gör' }).getAttribute('href')).toBe(
    '/kesif/koleksiyon/puzzle',
  );
});
