// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { createSessionStore } from './store';
import { SessionProvider, useSession } from './SessionProvider';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
function State() {
  const { session, reason } = useSession();
  return <div>{session?.user.displayName ?? reason ?? 'anonymous'}</div>;
}
it('removes an expired identity from the UI without waiting for another request', () => {
  vi.useFakeTimers();
  const store = createSessionStore();
  store.set({
    accessToken: 'token',
    expiresAt: new Date(Date.now() + 1000).toISOString(),
    user: { id: 'test', externalUserId: 'local:test', displayName: 'Öğrenci', roles: ['STUDENT'] },
  });
  render(
    <SessionProvider store={store}>
      <State />
    </SessionProvider>,
  );
  expect(screen.getByText('Öğrenci')).toBeTruthy();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText('expired')).toBeTruthy();
});
