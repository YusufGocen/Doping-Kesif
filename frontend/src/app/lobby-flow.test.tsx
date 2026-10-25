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
      if (path === '/sessions/active') return new Response(null, { status: 204 });
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

it('accepts an incoming invitation, updates readiness and leaves the shared lobby', async () => {
  const user = await openPage();
  await user.click(screen.getByRole('button', { name: 'Yusuf Göçen' }));
  await user.click(await screen.findByRole('button', { name: 'Kabul Et' }));
  await screen.findByRole('heading', { name: 'Oyun Lobisi' });
  expect(screen.getByText('Yusuf Göçen (Sen)')).toBeTruthy();
  expect(screen.getByText('Ayşe Yılmaz')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Hazırım' }));
  await screen.findByRole('button', { name: 'Hazır değilim' });
  expect(ready).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Odayı İptal Et' }));
  await screen.findByText('Oda kapandı.');
  expect(active).toBe(false);
});
it('rejects a pending invitation without joining or opening a lobby', async () => {
  const user = await openPage();
  await user.click(screen.getByRole('button', { name: 'Yusuf Göçen' }));
  await user.click(await screen.findByRole('button', { name: 'Reddet' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Kabul Et' })).toBeNull());
  expect(calls.some((call) => call.path.endsWith('/reject'))).toBe(true);
  expect(calls.some((call) => call.path.endsWith('/accept'))).toBe(false);
  expect(screen.getByRole('heading', { name: 'Doping Keşif' })).toBeTruthy();
});
it('recovers an existing room from the backend after a fresh login', async () => {
  incoming = false;
  active = true;
  const user = await openPage();
  await user.click(screen.getByRole('button', { name: 'Yusuf Göçen' }));
  await user.click(await screen.findByRole('link', { name: 'Odaya dön →' }));
  await screen.findByRole('heading', { name: 'Oyun Lobisi' });
  expect(screen.getByRole('button', { name: 'Hazırım' })).toBeTruthy();
});
