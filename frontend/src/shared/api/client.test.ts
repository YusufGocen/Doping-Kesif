import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApiClient } from './client';

const schema = z.object({ name: z.string() });
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
afterEach(() => vi.useRealTimers());

describe('API transport contract', () => {
  it('validates JSON and sends bearer only to the configured API without cookies or redirects', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({ name: 'Keşif' }));
    const client = createApiClient({
      baseUrl: '/api/v1/kesif',
      fetcher,
      getAccessToken: () => 'test-token',
    });
    expect(await client.request('/me', schema)).toEqual({ name: 'Keşif' });
    expect(fetcher).toHaveBeenCalledWith(
      '/api/v1/kesif/me',
      expect.objectContaining({
        credentials: 'omit',
        redirect: 'error',
        headers: { Accept: 'application/json', Authorization: 'Bearer test-token' },
      }),
    );
  });

  it('does not add an Authorization header when no session exists', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({ name: 'Keşif' }));
    await createApiClient({ baseUrl: '/api', fetcher }).request('/test', schema);
    expect(fetcher.mock.calls[0][1]?.headers).not.toHaveProperty('Authorization');
  });

  it('sends a mutation exactly once and preserves a structured business error', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ code: 'ROOM_FULL', detail: 'private internal detail' }, 409));
    const client = createApiClient({ baseUrl: '/api', fetcher });
    await expect(
      client.request('/rooms', schema, { method: 'POST', body: { clientRequestId: 'request' } }),
    ).rejects.toMatchObject({ status: 409, code: 'ROOM_FULL' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.body).toBe('{"clientRequestId":"request"}');
  });

  it('notifies session expiry and does not expose server internals', async () => {
    const onUnauthorized = vi.fn();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ code: 'UNAUTHENTICATED', detail: 'secret' }, 401));
    const client = createApiClient({ baseUrl: '/api', fetcher, onUnauthorized });
    await expect(client.request('/me', schema)).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Oturumun sona erdi. Lütfen tekrar giriş yap.',
    });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('rejects successful HTTP responses that violate the DTO schema', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({ name: 42 }));
    await expect(
      createApiClient({ baseUrl: '/api', fetcher }).request('/me', schema),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('handles non-JSON proxy failures safely', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('<html>secret</html>', { status: 502 }));
    await expect(
      createApiClient({ baseUrl: '/api', fetcher }).request('/me', schema),
    ).rejects.toMatchObject({ status: 502, code: 'HTTP_ERROR' });
  });

  it('supports explicit 204 response contracts', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    expect(
      await createApiClient({ baseUrl: '/api', fetcher }).request(
        '/sessions/active',
        z.undefined(),
      ),
    ).toBeUndefined();
  });

  it('normalizes network failures', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('sensitive network diagnostics'));
    await expect(
      createApiClient({ baseUrl: '/api', fetcher }).request('/me', schema),
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });

  it('distinguishes caller cancellation from timeout', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        }),
    );
    const controller = new AbortController();
    const pending = createApiClient({ baseUrl: '/api', fetcher }).request('/me', schema, {
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'ABORTED' });
  });

  it('cancels timed-out requests and releases its timer', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        }),
    );
    const pending = createApiClient({ baseUrl: '/api', fetcher, timeoutMs: 100 }).request(
      '/me',
      schema,
    );
    const assertion = expect(pending).rejects.toMatchObject({ code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(101);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    'https://other.test/me',
    '//other.test/me',
    '/../outside',
    '/%2e%2e/outside',
    '/%2e%2e%2foutside',
    '/%ZZ',
    '/me#private',
  ])('rejects an unsafe API path: %s', async (path) => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      createApiClient({ baseUrl: '/api', fetcher }).request(path, schema),
    ).rejects.toMatchObject({ code: 'INVALID_PATH' });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
