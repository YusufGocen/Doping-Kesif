// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router-dom';
import App from './App';
import { routes } from './router';

const id = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
const routers: ReturnType<typeof createMemoryRouter>[] = [];
const calls: { path: string; authorization: string | null }[] = [];
let completedCollection = false;
let failSubjects = false;
let failLogin = false;
let invitationBodies: unknown[] = [];
let failFriends = false;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  completedCollection = false;
  calls.length = 0;
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
      if (path === '/collections')
        return json({
          items: [
            {
              puzzleId: id(7),
              unlockedCount: completedCollection ? 20 : 6,
              completedAt: completedCollection ? '2026-10-24T12:00:00Z' : null,
            },
          ],
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

it('gates catalogue requests until a trusted profile has been resolved', async () => {
  const user = await openPage();
  expect(screen.queryByRole('heading', { name: 'Keşfini planla' })).toBeNull();
  expect(calls.some((call) => call.path.startsWith('/catalog'))).toBe(false);
  await user.click(screen.getByRole('button', { name: 'Yusuf Göçen' }));
  await user.click(await screen.findByRole('link', { name: 'Tarihi Şehir oyna' }));
  await screen.findByRole('heading', { name: 'Oyun Ayarları' });
  expect(
    calls
      .filter((call) => call.path.startsWith('/catalog') || call.path === '/puzzles')
      .every((call) => call.authorization === 'Bearer token-yusuf'),
  ).toBe(true);
  expect(calls.findIndex((call) => call.path === '/me')).toBeLessThan(
    calls.findIndex((call) => call.path === '/catalog/grades'),
  );
});

it('loads grade and subject filters and resets dependent selections when the grade changes', async () => {
  const user = await openPage();
  await user.click(screen.getByRole('button', { name: 'Yusuf Göçen' }));
  await user.click(await screen.findByRole('link', { name: 'Tarihi Şehir oyna' }));
  await user.click(await screen.findByRole('button', { name: '5. Sınıf' }));
  await user.click(await screen.findByRole('button', { name: 'Matematik' }));
  const topic = await screen.findByRole('combobox', { name: /Konu/ });
  await screen.findByRole('option', { name: 'Doğal sayılar' });
  await user.selectOptions(topic, id(5));
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Doğal sayılar'));
  await user.click(screen.getByRole('button', { name: '6. Sınıf' }));
  expect(screen.queryByRole('combobox', { name: /Konu/ })).toBeNull();
  expect(screen.queryByText('5. Sınıf · Matematik · Doğal sayılar')).toBeNull();
  expect(calls.some((call) => call.path === '/rooms' || call.path === '/invitations')).toBe(false);
});

it('clears account-specific UI and fetches catalogue with the new token on account switch', async () => {
  const user = await openPage();
  await user.click(screen.getByRole('button', { name: 'Yusuf Göçen' }));
  await user.click(await screen.findByRole('link', { name: 'Tarihi Şehir oyna' }));
  await screen.findByRole('heading', { name: 'Oyun Ayarları' });
  await user.click(await screen.findByRole('button', { name: '5. Sınıf' }));
  await screen.findByRole('button', { name: 'Matematik' });
  await user.click(screen.getByRole('button', { name: 'Öğrenci profilini aç' }));
  await user.click(screen.getByRole('button', { name: 'Çıkış yap' }));
  await user.click(await screen.findByRole('button', { name: 'Ayşe Yılmaz' }));
  await screen.findByRole('heading', { name: 'Oyun Ayarları' });
  expect(screen.queryByRole('button', { name: 'Matematik' })).toBeNull();
  await waitFor(() =>
    expect(
      calls.some((call) => call.path === '/puzzles' && call.authorization === 'Bearer token-ayse'),
    ).toBe(true),
  );
  const header = screen.getByRole('banner');
  expect(header.querySelector('[data-avatar=ayse]')).toBeTruthy();
  expect(
    within(header).getByRole('button', { name: 'Öğrenci profilini aç' }).textContent,
  ).toContain('Ayşe Yılmaz');
  await user.click(screen.getByRole('button', { name: 'Öğrenci profilini aç' }));
  await user.click(screen.getByRole('button', { name: /Çıkış yap/ }));
  await screen.findByRole('heading', { name: 'Merhaba' });
  expect(screen.queryByRole('heading', { name: 'Keşfini planla' })).toBeNull();
});

it('shows an actionable login error without exposing a catalogue or token', async () => {
  failLogin = true;
  const user = await openPage();
  await user.click(screen.getByRole('button', { name: 'Yusuf Göçen' }));
  await screen.findByText('Giriş yapılamadı. Backend bağlantısını kontrol edip tekrar dene.');
  expect(screen.queryByRole('heading', { name: 'Keşfini planla' })).toBeNull();
  expect(calls.some((call) => call.path === '/me')).toBe(false);
});

it('recovers a failed subject request with the retry action', async () => {
  failSubjects = true;
  const user = await openPage();
  await user.click(screen.getByRole('button', { name: 'Yusuf Göçen' }));
  await user.click(await screen.findByRole('link', { name: 'Tarihi Şehir oyna' }));
  await user.click(await screen.findByRole('button', { name: '5. Sınıf' }));
  const alert = await screen.findByRole('alert', {}, { timeout: 5000 });
  expect(alert.textContent).toContain('Veriler yüklenemedi');
  failSubjects = false;
  await user.click(within(alert).getByRole('button', { name: 'Tekrar dene' }));
  await screen.findByRole('button', { name: 'Matematik' });
  expect(screen.queryByText('Veriler yüklenemedi.')).toBeNull();
});

it('redirects anonymous discovery to login without requesting protected data', async () => {
  await openPage();
  expect(screen.getByRole('heading', { name: 'Merhaba' })).toBeTruthy();
  expect(screen.queryByRole('navigation', { name: 'Doping Hafıza bölümleri' })).toBeNull();
  expect(calls.some((call) => call.path === '/puzzles' || call.path === '/collections')).toBe(
    false,
  );
});
it('renders actual collection progress and keeps grade selection off the home screen', async () => {
  const user = await openPage();
  await user.click(screen.getByRole('button', { name: 'Yusuf Göçen' }));
  await screen.findByText('6/20 parça');
  expect(screen.queryByRole('button', { name: '5. Sınıf' })).toBeNull();
  await user.click(screen.getByRole('link', { name: 'Tarihi Şehir oyna' }));
  await screen.findByRole('heading', { name: 'Oyun Ayarları' });
  await screen.findByRole('button', { name: '5. Sınıf' });
});

it('shows only four demo users with distinct avatars and reuses the chosen avatar in profile', async () => {
  const user = await openPage();
  const accounts = screen.getByRole('region', { name: 'Kullanıcı seçimi' });
  expect(within(accounts).getAllByRole('button')).toHaveLength(4);
  expect(screen.queryByRole('button', { name: 'Emir Arslan' })).toBeNull();
  for (const key of ['yusuf', 'ayse', 'mert', 'zeynep'])
    expect(accounts.querySelector('[data-avatar=' + key + ']')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Yusuf Göçen' }));
  await screen.findByRole('heading', { name: 'Doping Keşif' });
  expect(screen.getByRole('banner').querySelector('[data-avatar=yusuf]')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Öğrenci profilini aç' }));
  expect(
    screen.getByRole('dialog', { name: 'Profilim' }).querySelector('[data-avatar=yusuf]'),
  ).toBeTruthy();
});

async function prepareSelection() {
  const user = await openPage();
  await user.click(screen.getByRole('button', { name: 'Yusuf Göçen' }));
  await user.click(await screen.findByRole('link', { name: 'Tarihi Şehir oyna' }));
  await user.click(await screen.findByRole('button', { name: '5. Sınıf' }));
  await user.click(await screen.findByRole('button', { name: 'Matematik' }));
  await screen.findByRole('option', { name: 'Doğal sayılar' });
  return user;
}
it('passes the optional topic and selection to friends, sends one invitation and cancels it', async () => {
  const user = await prepareSelection();
  await user.selectOptions(screen.getByRole('combobox', { name: /Konu/ }), id(5));
  await user.click(screen.getByRole('button', { name: 'Devam Et' }));
  await user.click(await screen.findByRole('link', { name: 'Arkadaş Seç' }));
  await screen.findByRole('heading', { name: 'Arkadaşını Seç', level: 1 });
  expect(screen.getByText(/Tarihi Şehir · 5. Sınıf · Matematik · Doğal sayılar/)).toBeTruthy();
  const submit = screen.getByRole('button', { name: 'Oyun Daveti Gönder' });
  expect(submit.hasAttribute('disabled')).toBe(true);
  await user.click(await screen.findByRole('radio', { name: /Ayşe Yılmaz/ }));
  expect(screen.queryByRole('radio', { name: /Yusuf Göçen/ })).toBeNull();
  await user.click(submit);
  await screen.findByRole('heading', { name: 'Davet Bekleniyor' });
  expect(invitationBodies).toEqual([
    expect.objectContaining({
      clientRequestId: expect.any(String),
      inviteeExternalUserId: 'local:ayse',
      selection: {
        groupId: 'local-group-8a',
        puzzleId: id(7),
        subjectId: id(3),
        gradeLevel: 5,
        topicId: id(5),
      },
    }),
  ]);
  await user.click(screen.getByRole('button', { name: 'Daveti İptal Et' }));
  await screen.findByRole('button', { name: 'Oyun Daveti Gönder' });
  expect(calls.some((call) => call.path === '/invitations/' + id(10) + '/cancel')).toBe(true);
});
it('uses all topics when optional topic is omitted and recovers a failed friend request', async () => {
  const user = await prepareSelection();
  failFriends = true;
  await user.click(screen.getByRole('button', { name: 'Devam Et' }));
  await user.click(await screen.findByRole('link', { name: 'Arkadaş Seç' }));
  const alert = await screen.findByRole('alert');
  expect(alert.textContent).toContain('Arkadaşlar yüklenemedi');
  failFriends = false;
  await user.click(within(alert).getByRole('button', { name: 'Tekrar dene' }));
  await user.click(await screen.findByRole('radio', { name: /Ayşe Yılmaz/ }));
  await user.click(screen.getByRole('button', { name: 'Oyun Daveti Gönder' }));
  await screen.findByRole('heading', { name: 'Davet Bekleniyor' });
  expect(invitationBodies[0]).toMatchObject({ selection: { topicId: null } });
});

it('marks only a completed personal collection and allows playing it again', async () => {
  completedCollection = true;
  const user = await openPage();
  await user.click(screen.getByRole('button', { name: 'Yusuf Göçen' }));
  await screen.findByText('Tamamlandı');
  const replay = screen.getByRole('link', { name: 'Tarihi Şehir tekrar oyna' });
  expect(replay.getAttribute('href')).toContain('/kesif/ayarlar?gorev=');
  await user.click(replay);
  await screen.findByRole('heading', { name: 'Oyun Ayarları' });
});
