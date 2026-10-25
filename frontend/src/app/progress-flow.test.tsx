// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router-dom';
import App from './App';
import { routes } from './router';

const id = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
const routers: ReturnType<typeof createMemoryRouter>[] = [];
const calls: { path: string; authorization: string | null }[] = [];
let failSubjects = false;
let failLogin = false;
let invitationBodies: unknown[] = [];
let failFriends = false;
let resultError = false;
let finalized = true;
const collected = {
  puzzleId: id(7),
  title: 'Tarihi Şehir',
  assetKey: 'demo/puzzles/history',
  unlockedCount: 18,
  completedAt: null,
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  calls.length = 0;
  resultError = false;
  finalized = true;
  invitationBodies = [];
  failFriends = false;
  failSubjects = false;
  failLogin = false;
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async (input, options) => {
      const url = new URL(String(input), 'http://localhost');
      const path = url.pathname.replace('/api/v1/kesif', '');
      const authorization = new Headers(options?.headers).get('Authorization');
      calls.push({ path, authorization });
      if (path === '/dev/auth/users')
        return json([
          { userKey: 'yusuf', displayName: 'Yusuf Göçen' },
          { userKey: 'ayse', displayName: 'Ayşe Yılmaz' },
          { userKey: 'mert', displayName: 'Mert Demir' },
          { userKey: 'zeynep', displayName: 'Zeynep Kaya' },
          { userKey: 'emir', displayName: 'Emir Arslan' },
        ]);
      if (path === '/dev/auth/token') {
        if (failLogin) return json({ code: 'UNKNOWN_DEMO_USER' }, 400);
        const body = JSON.parse(String(options?.body));
        return json({
          accessToken: `token-${body.userKey}`,
          tokenType: 'Bearer',
          expiresIn: 900,
          expiresAt: new Date(Date.now() + 900000).toISOString(),
        });
      }
      if (!authorization) return json({ code: 'UNAUTHENTICATED' }, 401);
      if (path === '/me')
        return json({
          id: id(authorization.includes('yusuf') ? 1 : 2),
          externalUserId: authorization.includes('yusuf') ? 'local:yusuf' : 'local:ayse',
          displayName: authorization.includes('yusuf') ? 'Yusuf Göçen' : 'Ayşe Yılmaz',
          roles: ['STUDENT'],
        });
      if (path === '/sessions/active') return new Response(null, { status: 204 });
      if (path === '/invitations/incoming') return json([]);
      if (path === '/rooms/active') return new Response(null, { status: 204 });
      if (path === '/rooms/' + id(11))
        return json({
          id: id(11),
          ownerPlayerId: id(1),
          status: 'OPEN',
          selection: {
            groupId: 'local-group-8a',
            puzzleId: id(7),
            subjectId: id(3),
            gradeLevel: 5,
            topicId: null,
          },
          expiresAt: new Date(Date.now() + 120000).toISOString(),
          players: [
            { playerId: id(1), displayName: 'Yusuf Göçen', slot: 1, ready: false, active: true },
          ],
          readyToStart: false,
          sequence: 1,
          joinCode: null,
        });
      if (path === '/groups')
        return json([{ id: 'local-group-8a', name: '8-A Butik', memberCount: 4 }]);
      if (path === '/groups/local-group-8a/friends')
        return failFriends
          ? json({ code: 'TEMPORARY_FAILURE' }, 503)
          : json([
              { externalUserId: 'local:ayse', displayName: 'Ayşe Yılmaz' },
              { externalUserId: 'local:yusuf', displayName: 'Yusuf Göçen' },
            ]);
      if (path === '/invitations') {
        invitationBodies.push(JSON.parse(String(options?.body)));
        return json(
          {
            id: id(10),
            roomId: id(11),
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 120000).toISOString(),
          },
          201,
        );
      }
      if (path === '/invitations/' + id(10) + '/cancel')
        return json({
          id: id(10),
          roomId: id(11),
          status: 'CANCELLED',
          expiresAt: new Date(Date.now() + 120000).toISOString(),
        });
      if (path === '/catalog/grades')
        return json([
          { gradeLevel: 5, playable: true },
          { gradeLevel: 6, playable: true },
        ]);
      if (path === '/progress')
        return json({ totalXp: 170, completedGames: 6, correctAnswers: 41 });
      if (path === '/collections') {
        const filter = url.searchParams.get('filter');
        return json({
          items: filter === 'COMPLETED' ? [] : [collected],
          page: Number(url.searchParams.get('page') ?? 0),
          size: 8,
          total: filter === 'COMPLETED' ? 0 : 9,
        });
      }
      if (path === '/collections/' + id(7))
        return json({ collection: collected, pieces: Array.from({ length: 18 }, (_, i) => i + 1) });
      if (path === '/history')
        return json({
          items: [
            {
              sessionId: id(20),
              puzzleId: id(7),
              puzzleTitle: 'Tarihi Şehir',
              endedAt: '2026-10-22T12:00:00Z',
              correctCount: 10,
              revealedCount: 4,
              collectionAddedCount: 2,
              earnedXp: 30,
              rewardsFinalized: finalized,
            },
          ],
          page: 0,
          size: 8,
          total: 1,
        });
      if (path === '/sessions/' + id(20) + '/result')
        return resultError
          ? json({ code: 'RESULT_NOT_FOUND' }, 404)
          : json({
              sessionId: id(20),
              puzzleId: id(7),
              revealedCount: 4,
              endedAt: '2026-10-22T12:00:00Z',
              rewardsFinalized: finalized,
              players: [
                {
                  playerId: id(1),
                  displayName: 'Yusuf Göçen',
                  correctCount: 10,
                  collectionAddedCount: 2,
                  earnedXp: 30,
                },
                {
                  playerId: id(2),
                  displayName: 'Ayşe Yılmaz',
                  correctCount: 8,
                  collectionAddedCount: 1,
                  earnedXp: 26,
                },
              ],
            });
      if (path === '/sessions/' + id(20)) return json({ revealedPieces: [1, 3, 6, 9] });
      if (path === '/collections')
        return json({
          items: [{ puzzleId: id(7), unlockedCount: 6, completedAt: null }],
          page: 0,
          size: 100,
          total: 1,
        });
      if (path === '/puzzles')
        return json([
          {
            id: id(7),
            code: 'DEMO_HISTORY',
            title: 'Tarihi Şehir',
            assetKey: 'demo/puzzles/history',
            pieceCount: 20,
          },
        ]);
      if (path === '/catalog/subjects')
        return failSubjects
          ? json({ code: 'TEMPORARY_FAILURE' }, 503)
          : json([
              {
                id: id(3),
                code: 'DEMO_MATH',
                name: 'Matematik',
                availableQuestionCount: 10,
                playable: true,
              },
              {
                id: id(4),
                code: 'LOCAL_SCIENCE',
                name: 'Fen Bilimleri',
                availableQuestionCount: 10,
                playable: true,
              },
            ]);
      if (path === '/catalog/topics')
        return json([
          {
            id: id(5),
            code: 'LOCAL_MATH_5',
            name: 'Doğal sayılar',
            availableQuestionCount: 10,
            playable: true,
          },
        ]);
      throw new Error(`Unexpected request: ${path}`);
    }),
  );
});
afterEach(() => {
  cleanup();
  routers.splice(0).forEach((router) => router.dispose());
  vi.unstubAllGlobals();
});

async function openPage() {
  const router = createMemoryRouter(routes, { initialEntries: ['/kesif'] });
  routers.push(router);
  render(<App router={router} />);
  await screen.findByRole('button', { name: 'Yusuf Göçen' });
  return userEvent.setup();
}

async function openCollection() {
  const user = await openPage();
  await user.click(screen.getByRole('button', { name: 'Yusuf Göçen' }));
  await user.click(await screen.findByRole('link', { name: 'Koleksiyonum' }));
  await screen.findByRole('heading', { name: 'Koleksiyonum' });
  return user;
}
it('shows personal progress, filters collections, paginates and opens actual owned pieces', async () => {
  const user = await openCollection();
  await screen.findByText('170 XP');
  await screen.findByText('18/20 parça');
  await user.click(screen.getByRole('button', { name: 'Sonraki' }));
  await screen.findByText('2. sayfa');
  await user.click(screen.getByRole('button', { name: 'Tamamlananlar' }));
  await screen.findByText('Bu filtreye uygun puzzle bulunmuyor.');
  await user.click(screen.getByRole('button', { name: 'Devam Edenler' }));
  await user.click(await screen.findByRole('link', { name: /Tarihi Şehir/ }));
  await screen.findByRole('img', { name: 'Kişisel koleksiyonunda 18/20 parça' });
  expect(calls.some((call) => call.path === '/collections/' + id(7))).toBe(true);
});
it('opens history result with real per-player XP and keeps session pieces separate from collection', async () => {
  const user = await openCollection();
  await user.click(screen.getByRole('button', { name: 'Oyun Geçmişim' }));
  await user.click(await screen.findByRole('link', { name: /Tarihi Şehir/ }));
  await screen.findByRole('heading', { name: 'Oyun Sonucu' });
  await screen.findByText('+26 XP');
  expect(screen.getByText('+30 XP')).toBeTruthy();
  expect(screen.getByText('Koleksiyona 2 yeni parça')).toBeTruthy();
  await screen.findByRole('img', { name: 'Bu oyunda 4/20 parça açıldı' });
  expect(screen.getByRole('link', { name: 'Yeni Oyun Başlat' }).getAttribute('href')).toContain(
    id(7),
  );
  await user.click(screen.getByRole('link', { name: 'Koleksiyonda Gör' }));
  await screen.findByRole('img', { name: 'Kişisel koleksiyonunda 18/20 parça' });
});
it('shows result errors and recovers without inventing XP or finalized rewards', async () => {
  const user = await openCollection();
  resultError = true;
  finalized = false;
  await user.click(screen.getByRole('button', { name: 'Oyun Geçmişim' }));
  await user.click(await screen.findByRole('link', { name: /Tarihi Şehir/ }));
  const alert = await screen.findByRole('alert');
  expect(screen.queryByText('+26 XP')).toBeNull();
  resultError = false;
  await user.click(within(alert).getByRole('button', { name: 'Tekrar dene' }));
  await screen.findByText(/Bu oyun için ödül kaydı kesinleştirilmemiş/);
});
