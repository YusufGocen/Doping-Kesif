import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSessionStore } from './store';
import type { Session } from './store';

const session = (
  token = 'first',
  expiresAt = new Date(Date.now() + 1000).toISOString(),
): Session => ({
  accessToken: token,
  expiresAt,
  user: { id: 'id', externalUserId: 'local:test', displayName: 'Öğrenci', roles: ['STUDENT'] },
});
afterEach(() => vi.useRealTimers());
describe('in-memory session isolation', () => {
  it('starts anonymous and does not share state across application instances', () => {
    const first = createSessionStore(),
      second = createSessionStore();
    first.set(session());
    expect(second.getSnapshot().session).toBeNull();
  });
  it('rejects expired or invalid session deadlines', () => {
    const store = createSessionStore();
    expect(() => store.set(session('old', new Date(0).toISOString()))).toThrow();
    expect(() => store.set(session('old', 'invalid'))).toThrow();
  });
  it('expires exactly at the deadline and stops returning the token', () => {
    vi.useFakeTimers();
    const store = createSessionStore();
    store.set(session());
    vi.advanceTimersByTime(1000);
    expect(store.getAccessToken()).toBeNull();
    expect(store.getSnapshot().reason).toBe('expired');
  });
  it('ignores a stale 401 response from the previously selected account', () => {
    const store = createSessionStore();
    store.set(session('first'));
    store.set(session('second'));
    store.unauthorized('first');
    expect(store.getAccessToken()).toBe('second');
    store.unauthorized(null);
    expect(store.getAccessToken()).toBe('second');
  });
  it('clears the matching account on a 401 response', () => {
    const store = createSessionStore();
    store.set(session());
    store.unauthorized('first');
    expect(store.getSnapshot()).toMatchObject({ session: null, reason: 'expired' });
  });
  it('notifies subscribers on logout and supports unsubscribe', () => {
    const store = createSessionStore();
    const listener = vi.fn();
    const stop = store.subscribe(listener);
    store.set(session());
    store.clear();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot().session).toBeNull();
    stop();
    store.clear();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
