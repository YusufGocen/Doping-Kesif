import { z } from 'zod';
export type ConnectionState =
  'connecting' | 'syncing' | 'live' | 'reconnecting' | 'offline' | 'denied';
const eventSchema = z.object({
  type: z.literal('EVENT'),
  eventId: z.uuid(),
  aggregateType: z.enum(['ROOM', 'SESSION']),
  aggregateId: z.uuid(),
  eventType: z.string(),
  sequence: z.number().int().positive(),
  occurredAt: z.string(),
});
export type RealtimeEvent = z.infer<typeof eventSchema>;
const readySchema = z.object({
  type: z.literal('READY'),
  protocolVersion: z.literal(1),
  resyncRequired: z.literal(true),
  expiresAt: z.string(),
});
export interface RealtimeSocket {
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  send: (value: string) => void;
  close: () => void;
}
export function socketUrl(base: string, origin: string) {
  const url = new URL(base + '/ws', origin);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !['http:', 'https:'].includes(url.protocol)
  )
    throw Error('Invalid realtime endpoint');
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}
export function createRealtimeClient(options: {
  url: string;
  token: string;
  createSocket?: (url: string) => RealtimeSocket;
  onState: (state: ConnectionState) => void;
  resync: () => Promise<void>;
  onEvent: (event: RealtimeEvent) => Promise<void>;
  snapshotSequence?: (event: RealtimeEvent) => number;
  random?: () => number;
}) {
  let stopped = true,
    generation = 0,
    socket: RealtimeSocket | null = null,
    retries = 0,
    syncing = false,
    draining = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined,
    authTimer: ReturnType<typeof setTimeout> | undefined,
    heartbeat: ReturnType<typeof setInterval> | undefined,
    pongTimer: ReturnType<typeof setTimeout> | undefined;
  const pending = new Map<string, RealtimeEvent>(),
    sequences = new Map<string, number>(),
    ids = new Set<string>();
  const state = (value: ConnectionState) => {
    if (!stopped) options.onState(value);
  };
  const clearTimers = () => {
    clearTimeout(authTimer);
    clearTimeout(pongTimer);
    clearInterval(heartbeat);
  };
  const key = (event: RealtimeEvent) => event.aggregateType + ':' + event.aggregateId;
  const drain = async (version: number) => {
    if (draining || syncing || stopped) return;
    draining = true;
    try {
      while (pending.size && !stopped && version === generation) {
        const [k, event] = pending.entries().next().value!;
        pending.delete(k);
        const previous = Math.max(sequences.get(k) ?? 0, options.snapshotSequence?.(event) ?? 0);
        if (event.sequence <= previous) continue;
        await options.onEvent(event);
        if (version !== generation) return;
        const observed = options.snapshotSequence?.(event) ?? 0;
        if (observed > 0 && observed < event.sequence) throw Error('Snapshot behind event');
        sequences.set(k, Math.max(event.sequence, options.snapshotSequence?.(event) ?? 0));
        if (sequences.size > 2048) sequences.delete(sequences.keys().next().value!);
      }
    } catch {
      if (version === generation) {
        pending.clear();
        socket?.close();
      }
    } finally {
      draining = false;
      if (pending.size && !syncing && !stopped) void drain(generation);
    }
  };
  const connect = () => {
    if (stopped) return;
    clearTimeout(retryTimer);
    clearTimers();
    const version = ++generation;
    syncing = true;
    pending.clear();
    state(retries ? 'reconnecting' : 'connecting');
    try {
      socket = (options.createSocket ?? ((url) => new WebSocket(url)))(options.url);
    } catch {
      schedule();
      return;
    }
    const current = socket;
    let ready = false;
    authTimer = setTimeout(() => {
      if (version === generation) current.close();
    }, 7000);
    current.onopen = () => {
      if (stopped || version !== generation) return;
      current.send(JSON.stringify({ type: 'AUTH', token: options.token }));
    };
    current.onmessage = (event) => {
      if (stopped || version !== generation) return;
      try {
        if (typeof event.data !== 'string' || event.data.length > 8192) throw Error();
        const frame = JSON.parse(event.data);
        if (frame.type === 'PONG') {
          clearTimeout(pongTimer);
          return;
        }
        if (frame.type === 'READY') {
          if (ready) throw Error();
          readySchema.parse(frame);
          ready = true;
          clearTimeout(authTimer);
          state('syncing');
          void options
            .resync()
            .then(() => {
              if (stopped || version !== generation) return;
              syncing = false;
              retries = 0;
              state('live');
              void drain(version);
            })
            .catch(() => {
              if (version === generation) current.close();
            });
          heartbeat = setInterval(() => {
            if (stopped || version !== generation) return;
            current.send(JSON.stringify({ type: 'PING' }));
            clearTimeout(pongTimer);
            pongTimer = setTimeout(() => current.close(), 10000);
          }, 20000);
          return;
        }
        if (!ready) throw Error();
        const message = eventSchema.parse(frame);
        if (ids.has(message.eventId)) return;
        ids.add(message.eventId);
        if (ids.size > 1024) ids.delete(ids.values().next().value!);
        const k = key(message);
        const old = pending.get(k);
        if (!old || old.sequence < message.sequence) pending.set(k, message);
        void drain(version);
      } catch {
        current.close();
      }
    };
    current.onerror = () => {
      if (version === generation) current.close();
    };
    current.onclose = (event) => {
      if (stopped || version !== generation) return;
      clearTimers();
      syncing = false;
      if (event.code === 1008) {
        state('denied');
        return;
      }
      schedule();
    };
  };
  const schedule = () => {
    if (stopped) return;
    state('reconnecting');
    const delay =
      Math.min(30000, 500 * 2 ** Math.min(retries++, 6)) *
      (0.8 + (options.random ?? Math.random)() * 0.4);
    retryTimer = setTimeout(connect, delay);
  };
  return {
    start() {
      if (!stopped) return;
      stopped = false;
      connect();
    },
    retry() {
      if (stopped) return;
      ++generation;
      clearTimers();
      clearTimeout(retryTimer);
      socket?.close();
      retries = 0;
      connect();
    },
    stop() {
      stopped = true;
      ++generation;
      clearTimers();
      clearTimeout(retryTimer);
      socket?.close();
      socket = null;
      pending.clear();
      sequences.clear();
      ids.clear();
    },
    offline() {
      if (stopped) return;
      ++generation;
      syncing = true;
      pending.clear();
      clearTimers();
      clearTimeout(retryTimer);
      socket?.close();
      state('offline');
    },
  };
}
