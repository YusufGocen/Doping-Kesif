// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
let started = false;
let answered = false;
let phase = 'QUESTION_OPEN';
let roundNo = 1;
let answerBodies: unknown[] = [];
const gameView = () => ({
  id: id(20),
  roomId: id(11),
  puzzleId: id(7),
  status: 'IN_PROGRESS',
  currentRoundNo: roundNo,
  revealedCount: phase === 'REVEAL' ? 2 : 0,
  revealedPieces: phase === 'REVEAL' ? [1, 2] : [],
  players: [
    {
      playerId: id(1),
      slot: 1,
      correctCount: phase === 'REVEAL' ? 1 : 0,
      answered,
      continuing: false,
    },
    {
      playerId: id(2),
      slot: 2,
      correctCount: phase === 'REVEAL' ? 1 : 0,
      answered: phase === 'REVEAL',
      continuing: false,
    },
  ],
  round: {
    id: id(20 + roundNo),
    roundNo,
    status: phase,
    question: {
      body: { text: '2 + 2 kaçtır?' },
      options: [
        { key: 'A', body: { text: '4' } },
        { key: 'B', body: { text: '5' } },
      ],
    },
    deadlineAt: new Date(Date.now() + 30000).toISOString(),
    revealDeadlineAt: phase === 'REVEAL' ? new Date(Date.now() + 10000).toISOString() : null,
    correctOptionKey: phase === 'REVEAL' ? 'A' : null,
    answers:
      phase === 'REVEAL'
        ? [
            { playerId: id(1), optionKey: 'A', correct: true, source: 'PLAYER' },
            { playerId: id(2), optionKey: 'A', correct: true, source: 'PLAYER' },
          ]
        : [],
  },
  sequence: roundNo * 10 + (phase === 'REVEAL' ? 2 : answered ? 1 : 0),
});
let incoming = true;
let active = false;
let ready = false;
let roomStatus = 'FULL';
const selection = {
  groupId: 'local-group-8a',
  puzzleId: id(7),
  subjectId: id(3),
  gradeLevel: 5,
  topicId: null,
};
const snapshot = () => ({
  id: id(11),
  ownerPlayerId: id(1),
  status: roomStatus,
  selection,
  expiresAt: new Date(Date.now() + 120000).toISOString(),
  players: [
    { playerId: id(1), displayName: 'Yusuf Göçen', slot: 1, ready, active: true },
    { playerId: id(2), displayName: 'Ayşe Yılmaz', slot: 2, ready: true, active: true },
  ],
  readyToStart: ready && roomStatus === 'FULL',
  sequence: 1,
  joinCode: null,
});
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
  started = false;
  answered = false;
  phase = 'QUESTION_OPEN';
  roundNo = 1;
  answerBodies = [];
  incoming = true;
  active = false;
  ready = false;
  roomStatus = 'FULL';
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
      if (path === '/sessions/active')
        return started ? json(gameView()) : new Response(null, { status: 204 });
      if (path === '/rooms/' + id(11) + '/start') {
        started = true;
        roomStatus = 'STARTED';
        return json(gameView());
      }
      if (path === '/sessions/' + id(20)) return json(gameView());
      if (path === '/sessions/' + id(20) + '/rounds/' + id(20 + roundNo) + '/answers') {
        const body = JSON.parse(String(options?.body));
        answerBodies.push(body);
        answered = true;
        return json(gameView());
      }
      if (path === '/sessions/' + id(20) + '/continue') {
        roundNo++;
        phase = 'QUESTION_OPEN';
        answered = false;
        return json(gameView());
      }
      if (path === '/invitations/incoming')
        return json(
          incoming
            ? [
                {
                  id: id(10),
                  roomId: id(11),
                  inviterId: id(2),
                  inviteeId: id(1),
                  status: 'PENDING',
                  selection,
                  expiresAt: new Date(Date.now() + 120000).toISOString(),
                },
              ]
            : [],
        );
      if (path === '/rooms/active')
        return active ? json(snapshot()) : new Response(null, { status: 204 });
      if (path === '/rooms/' + id(11)) return json(snapshot());
      if (path === '/invitations/' + id(10) + '/accept') {
        incoming = false;
        active = true;
        return json(snapshot());
      }
      if (path === '/invitations/' + id(10) + '/reject') {
        incoming = false;
        return json({
          id: id(10),
          roomId: id(11),
          status: 'REJECTED',
          expiresAt: new Date(Date.now() + 120000).toISOString(),
        });
      }
      if (path === '/rooms/' + id(11) + '/ready') {
        ready = JSON.parse(String(options?.body)).ready;
        return json(snapshot());
      }
      if (path === '/rooms/' + id(11) + '/leave' || path === '/rooms/' + id(11) + '/cancel') {
        roomStatus = 'CLOSED';
        active = false;
        return json(snapshot());
      }
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

it('starts a ready owner lobby, submits one answer, hides the solution until reveal and continues', async () => {
  incoming = false;
  active = true;
  ready = true;
  const user = await openPage();
  await user.click(screen.getByRole('button', { name: 'Yusuf Göçen' }));
  await user.click(await screen.findByRole('link', { name: 'Odaya dön →' }));
  await user.click(await screen.findByRole('button', { name: 'Oyunu Başlat' }));
  await screen.findByRole('heading', { name: '2 + 2 kaçtır?' });
  await waitFor(() =>
    expect(
      screen.getByRole('region', { name: 'Ortak keşif oyunu' }).querySelector('[data-avatar=ayse]'),
    ).toBeTruthy(),
  );
  expect(screen.getByRole('progressbar', { name: 'Kalan süre çubuğu' })).toBeTruthy();
  expect(screen.queryByText('Devam eden bir odan var.')).toBeNull();
  expect(screen.queryByRole('link', { name: 'Odaya dön →' })).toBeNull();
  expect(screen.queryByText(/Doğru cevap:/)).toBeNull();
  await user.click(screen.getByRole('radio', { name: 'A 4' }));
  await user.click(screen.getByRole('button', { name: 'Cevabı Gönder' }));
  await screen.findByText('Cevabın gönderildi. Arkadaşının cevabı bekleniyor…');
  expect(answerBodies).toEqual([{ clientRequestId: expect.any(String), optionKey: 'A' }]);
  phase = 'REVEAL';
  await screen.findByRole('heading', { name: 'Cevap Sonucu' });
  expect(screen.getByText('Doğru cevap: A · 4')).toBeTruthy();
  expect(screen.getByLabelText('2 parça açıldı')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Sonraki Soru' }));
  await screen.findByText('Soru 2/10');
  expect(screen.getByRole('radio', { name: 'A 4' }).hasAttribute('disabled')).toBe(false);
});
it('keeps start disabled until both players are ready', async () => {
  incoming = false;
  active = true;
  ready = false;
  const user = await openPage();
  await user.click(screen.getByRole('button', { name: 'Yusuf Göçen' }));
  await user.click(await screen.findByRole('link', { name: 'Odaya dön →' }));
  expect(
    (await screen.findByRole('button', { name: 'Oyunu Başlat' })).hasAttribute('disabled'),
  ).toBe(true);
});
