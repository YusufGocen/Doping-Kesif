import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createRealtimeClient, socketUrl } from './client';
import type { RealtimeSocket, ConnectionState, RealtimeEvent } from './client';
class FakeSocket implements RealtimeSocket {
  onopen: RealtimeSocket['onopen'] = null;
  onmessage: RealtimeSocket['onmessage'] = null;
  onclose: RealtimeSocket['onclose'] = null;
  onerror: RealtimeSocket['onerror'] = null;
  sent: string[] = [];
  closed = false;
  send(value: string) {
    this.sent.push(value);
  }
  close() {
    this.closed = true;
    this.onclose?.({ code: 1000 } as CloseEvent);
  }
  open() {
    this.onopen?.({} as Event);
  }
  frame(value: unknown) {
    this.onmessage?.({ data: JSON.stringify(value) } as MessageEvent);
  }
}
const ready = {
  type: 'READY',
  protocolVersion: 1,
  resyncRequired: true,
  expiresAt: '2099-01-01T00:00:00Z',
};
const event = (
  sequence: number,
  aggregateId = '00000000-0000-4000-8000-000000000001',
): RealtimeEvent => ({
  type: 'EVENT',
  eventId: '00000000-0000-4000-8000-' + String(sequence).padStart(12, '0'),
  aggregateType: 'ROOM',
  aggregateId,
  eventType: 'ROOM_CHANGED',
  sequence,
  occurredAt: '2026-10-23T10:00:00Z',
});
let clients: ReturnType<typeof createRealtimeClient>[] = [];
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  clients.forEach((c) => c.stop());
  clients = [];
  vi.useRealTimers();
});
function setup(extra: Partial<Parameters<typeof createRealtimeClient>[0]> = {}) {
  const sockets: FakeSocket[] = [],
    states: ConnectionState[] = [];
  const resync = vi.fn(async () => {}),
    onEvent = vi.fn(async (_event: RealtimeEvent) => {});
  const client = createRealtimeClient({
    url: 'ws://localhost/ws',
    token: 'private-token',
    createSocket: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
    onState: (s) => states.push(s),
    resync,
    onEvent,
    random: () => 0.5,
    ...extra,
  });
  clients.push(client);
  client.start();
  return { client, sockets, states, resync, onEvent };
}
async function tick() {
  await vi.advanceTimersByTimeAsync(0);
}
it('authenticates only in a frame, resynchronizes before live and builds safe ws URLs', async () => {
  expect(socketUrl('/api/v1/kesif', 'https://school.example')).toBe(
    'wss://school.example/api/v1/kesif/ws',
  );
  expect(() => socketUrl('https://user:pass@host/api', 'http://localhost')).toThrow();
  const x = setup();
  x.sockets[0].open();
  expect(JSON.parse(x.sockets[0].sent[0])).toEqual({ type: 'AUTH', token: 'private-token' });
  x.sockets[0].frame(ready);
  await tick();
  expect(x.resync).toHaveBeenCalledOnce();
  expect(x.states.at(-1)).toBe('live');
});
it('buffers events during resync and refetches a newer sequence after the snapshot', async () => {
  let resolve!: () => void;
  let version = 2;
  const x = setup({
    resync: () => new Promise<void>((r) => (resolve = r)),
    snapshotSequence: () => version,
  });
  x.sockets[0].open();
  x.sockets[0].frame(ready);
  x.sockets[0].frame(event(3));
  x.sockets[0].frame(event(4));
  expect(x.onEvent).not.toHaveBeenCalled();
  x.onEvent.mockImplementation(async () => {
    version = 4;
  });
  resolve();
  await tick();
  expect(x.onEvent).toHaveBeenCalledOnce();
  expect(x.onEvent.mock.calls[0][0].sequence).toBe(4);
  version = 4;
});
it('ignores duplicates and old sequences, but handles gaps and independent aggregates', async () => {
  const x = setup();
  x.sockets[0].frame(ready);
  await tick();
  x.sockets[0].frame(event(2));
  await tick();
  x.sockets[0].frame(event(2));
  x.sockets[0].frame({ ...event(1), eventId: '00000000-0000-4000-8000-000000000099' });
  x.sockets[0].frame(event(7));
  await tick();
  x.sockets[0].frame({
    ...event(1, '00000000-0000-4000-8000-000000000002'),
    eventId: '00000000-0000-4000-8000-000000000098',
  });
  await tick();
  expect(x.onEvent).toHaveBeenCalledTimes(3);
});
it('reconnects after loss with a fresh READY resync and ignores stale socket messages', async () => {
  const x = setup();
  x.sockets[0].frame(ready);
  await tick();
  x.sockets[0].close();
  expect(x.states.at(-1)).toBe('reconnecting');
  await vi.advanceTimersByTimeAsync(500);
  expect(x.sockets).toHaveLength(2);
  x.sockets[0].frame(event(9));
  x.sockets[1].open();
  x.sockets[1].frame(ready);
  await tick();
  expect(x.resync).toHaveBeenCalledTimes(2);
  expect(x.onEvent).not.toHaveBeenCalled();
});
it('cleans up timers and old credentials on stop', async () => {
  const x = setup();
  x.client.stop();
  x.sockets[0].open();
  x.sockets[0].frame(ready);
  await vi.advanceTimersByTimeAsync(60000);
  expect(x.sockets[0].sent).toEqual([]);
  expect(x.resync).not.toHaveBeenCalled();
  expect(x.sockets).toHaveLength(1);
});
it('does not endlessly retry a policy/authentication rejection', async () => {
  const x = setup();
  x.sockets[0].onclose?.({ code: 1008 } as CloseEvent);
  await vi.advanceTimersByTimeAsync(60000);
  expect(x.states.at(-1)).toBe('denied');
  expect(x.sockets).toHaveLength(1);
});
it('detects missing heartbeat responses and resumes only after resync', async () => {
  const x = setup();
  x.sockets[0].frame(ready);
  await tick();
  await vi.advanceTimersByTimeAsync(20000);
  expect(JSON.parse(x.sockets[0].sent.at(-1)!)).toEqual({ type: 'PING' });
  await vi.advanceTimersByTimeAsync(10000);
  expect(x.sockets[0].closed).toBe(true);
});
it('falls back while offline and reconnects after the network returns', async () => {
  const x = setup();
  x.client.offline();
  await vi.advanceTimersByTimeAsync(30000);
  expect(x.states.at(-1)).toBe('offline');
  expect(x.sockets).toHaveLength(1);
  x.client.retry();
  expect(x.sockets).toHaveLength(2);
});

it('forces recovery when a fetched snapshot remains behind an event', async () => {
  const x = setup({ snapshotSequence: () => 1 });
  x.sockets[0].frame(ready);
  await tick();
  x.sockets[0].frame(event(3));
  await tick();
  expect(x.sockets[0].closed).toBe(true);
  expect(x.states.at(-1)).toBe('reconnecting');
});
