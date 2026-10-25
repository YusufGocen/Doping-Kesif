// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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
let full = false;
let closed = false;
let guest = false;
let joinFails = false;
let createFails = false;
let createBodies: unknown[] = [];
let joinBodies: unknown[] = [];
const codeRoom = () => ({
  id: id(11),
  ownerPlayerId: guest ? id(2) : id(1),
  status: closed ? 'CANCELLED' : full ? 'FULL' : 'OPEN',
  selection: {
    groupId: 'local-group-8a',
    puzzleId: id(7),
    subjectId: id(3),
    gradeLevel: 5,
    topicId: null,
  },
  expiresAt: new Date(Date.now() + 600000).toISOString(),
  players: [
    { playerId: id(1), displayName: 'Yusuf Göçen', slot: 1, ready: false, active: true },
    ...(full
      ? [{ playerId: id(2), displayName: 'Ayşe Yılmaz', slot: 2, ready: false, active: true }]
      : []),
  ],
  readyToStart: false,
  sequence: 1,
  joinCode: guest ? null : 'ABCD2345',
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
  full = false;
  closed = false;
  guest = false;
  joinFails = false;
  createFails = false;
  createBodies = [];
  joinBodies = [];
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
      if (path === '/rooms' && options?.method === 'POST') {
        createBodies.push(JSON.parse(String(options.body)));
        if (createFails) return json({ code: 'TEMPORARY_FAILURE' }, 503);
        return json(codeRoom(), 201);
      }
      if (path === '/rooms/join') {
        joinBodies.push(JSON.parse(String(options?.body)));
        if (joinFails) return json({ code: 'ROOM_NOT_AVAILABLE' }, 404);
        full = true;
        guest = true;
        return json(codeRoom());
      }
      if (path === '/rooms/' + id(11)) return json(codeRoom());
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

async function prepareMethod() {
  const user = await openPage();
  await user.click(screen.getByRole('button', { name: 'Yusuf Göçen' }));
  await user.click(await screen.findByRole('link', { name: 'Tarihi Şehir oyna' }));
  await user.click(await screen.findByRole('button', { name: '5. Sınıf' }));
  await user.click(await screen.findByRole('button', { name: 'Matematik' }));
  await screen.findByRole('option', { name: 'Doğal sayılar' });
  await user.click(screen.getByRole('button', { name: 'Devam Et' }));
  await screen.findByRole('heading', { name: 'Nasıl Oynamak İstersin?' });
  return user;
}
it('creates a code room with the chosen selection, copies its code and automatically enters the lobby when the guest joins', async () => {
  const user = await prepareMethod();
  await user.click(screen.getByRole('link', { name: 'Kod / Link ile Oyna' }));
  await user.click(await screen.findByRole('button', { name: 'Oda Oluştur' }));
  await screen.findByRole('heading', { name: 'Odan Hazır!' });
  expect(createBodies).toEqual([
    expect.objectContaining({
      clientRequestId: expect.any(String),
      selection: {
        groupId: 'local-group-8a',
        puzzleId: id(7),
        subjectId: id(3),
        gradeLevel: 5,
        topicId: null,
      },
    }),
  ]);
  expect(screen.queryByRole('link', { name: 'Arkadaşım Katıldı, Devam Et' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Oda kodunu kopyala' }));
  expect(await navigator.clipboard.readText()).toBe('ABCD2345');
  full = true;
  await screen.findByRole('heading', { name: 'Oyun Lobisi' });
  expect(screen.getByText('Ayşe Yılmaz')).toBeTruthy();
  await screen.findByText('Tarihi Şehir');
});
it('joins from home with a normalized code, rejects invalid input and hides owner code from the guest', async () => {
  const user = await openPage();
  await user.click(screen.getByRole('button', { name: 'Yusuf Göçen' }));
  await user.click(await screen.findByRole('link', { name: 'Oda Koduyla Katıl' }));
  const input = await screen.findByRole('textbox', { name: 'Oda Kodu veya Davet Linki' });
  await user.type(input, 'xyz');
  expect(screen.getByRole('button', { name: 'Odaya Katıl' }).hasAttribute('disabled')).toBe(true);
  await user.clear(input);
  await user.type(input, 'abcd2345');
  await user.click(screen.getByRole('button', { name: 'Odaya Katıl' }));
  await screen.findByRole('heading', { name: 'Oyun Lobisi' });
  expect(joinBodies).toEqual([{ code: 'ABCD2345' }]);
  expect(screen.queryByText('ABCD2345')).toBeNull();
});
it('retries creation with the same request ID and handles unavailable room links without navigating away', async () => {
  const user = await prepareMethod();
  await user.click(screen.getByRole('link', { name: 'Kod / Link ile Oyna' }));
  createFails = true;
  await user.click(await screen.findByRole('button', { name: 'Oda Oluştur' }));
  await screen.findByRole('alert');
  createFails = false;
  await user.click(screen.getByRole('button', { name: 'Oda Oluştur' }));
  await screen.findByRole('heading', { name: 'Odan Hazır!' });
  expect(createBodies[0]).toEqual(createBodies[1]);
  await user.click(screen.getByRole('link', { name: 'Lobiye Git / Odayı Yönet' }));
  await screen.findByRole('heading', { name: 'Oyun Lobisi' });
  await user.click(screen.getByRole('link', { name: /Doping Keşif/ }));
  await user.click(await screen.findByRole('link', { name: 'Oda Koduyla Katıl' }));
  const input = await screen.findByRole('textbox', { name: 'Oda Kodu veya Davet Linki' });
  await user.type(input, window.location.origin + '/kesif/oda?kod=ABCD2345');
  joinFails = true;
  await user.click(screen.getByRole('button', { name: 'Odaya Katıl' }));
  await screen.findByText('Oda bulunamadı veya kodun süresi doldu.');
  expect(joinBodies[0]).toEqual({ code: 'ABCD2345' });
});

it('opens the lobby immediately when the room is already full', async () => {
  const user = await prepareMethod();
  await user.click(screen.getByRole('link', { name: 'Kod / Link ile Oyna' }));
  full = true;
  await user.click(await screen.findByRole('button', { name: 'Oda Oluştur' }));
  await screen.findByRole('heading', { name: 'Oyun Lobisi' });
  expect(screen.queryByRole('link', { name: 'Arkadaşım Katıldı, Devam Et' })).toBeNull();
});
it('keeps a closed room on its status screen instead of redirecting to the lobby', async () => {
  const user = await prepareMethod();
  await user.click(screen.getByRole('link', { name: 'Kod / Link ile Oyna' }));
  closed = true;
  await user.click(await screen.findByRole('button', { name: 'Oda Oluştur' }));
  await screen.findByText(/Bu oda kapanmış veya süresi dolmuş/);
  expect(screen.queryByRole('heading', { name: 'Oyun Lobisi' })).toBeNull();
});
