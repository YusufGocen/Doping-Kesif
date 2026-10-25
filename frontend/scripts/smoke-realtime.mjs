import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'vite';
const vite = await createServer({
  cacheDir: 'node_modules/.vite/smoke',
  server: { middlewareMode: true, hmr: false },
  logLevel: 'error',
});
let apiA, created;
const connections = [];
try {
  const { createRealtimeClient } = await vite.ssrLoadModule('/src/shared/realtime/client.ts');
  const { createProgressApi } = await vite.ssrLoadModule(
    '/src/features/progress/api/progressApi.ts',
  );
  const { createApiClient } = await vite.ssrLoadModule('/src/shared/api/client.ts');
  const { createSocialApi } = await vite.ssrLoadModule('/src/features/social/api/socialApi.ts');
  const { createGameApi } = await vite.ssrLoadModule('/src/features/game/api/gameApi.ts');
  const { createCatalogApi } = await vite.ssrLoadModule('/src/features/catalog/api/catalogApi.ts');
  const { tokenSchema, meSchema } = await vite.ssrLoadModule('/src/features/auth/model/schemas.ts');
  const baseUrl = 'http://127.0.0.1:5173/api/v1/kesif';
  const anonymous = createApiClient({ baseUrl });
  async function account(userKey) {
    const token = await anonymous.request('/dev/auth/token', tokenSchema, {
      method: 'POST',
      body: { userKey },
    });
    const client = createApiClient({ baseUrl, getAccessToken: () => token.accessToken });
    return {
      token: token.accessToken,
      client,
      api: createSocialApi(client),
      me: await client.request('/me', meSchema),
    };
  }
  const a = await account('mert'),
    b = await account('zeynep');
  apiA = a.api;
  const signal = new AbortController().signal;
  async function until(predicate, label, timeout = 20000) {
    const deadline = Date.now() + timeout;
    while (!predicate()) {
      assert(Date.now() < deadline, 'Timed out: ' + label);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  function connect(actor) {
    const game = createGameApi(actor.client),
      progress = createProgressApi(actor.client);
    const track = { events: [], sockets: [], states: [], resyncs: 0, snapshots: new Map() };
    const remember = (type, data) => {
      if (data) track.snapshots.set(type + ':' + data.id, data);
    };
    async function resync() {
      const [room, session] = await Promise.all([
        actor.api.active(signal),
        game.active(signal),
        actor.api.incoming(signal),
        progress.progress(signal),
        progress.history(0, signal),
        progress.collections('ALL', 0, signal),
      ]);
      remember('ROOM', room);
      remember('SESSION', session);
      for (const [key, data] of track.snapshots) {
        if (key.startsWith('SESSION:')) remember('SESSION', await game.snapshot(data.id, signal));
        else remember('ROOM', await actor.api.room(data.id, signal));
      }
      track.resyncs++;
    }
    track.client = createRealtimeClient({
      url: 'ws://127.0.0.1:5173/api/v1/kesif/ws',
      token: actor.token,
      createSocket: (url) => {
        const socket = new WebSocket(url, { headers: { Origin: 'http://127.0.0.1:5173' } });
        track.sockets.push(socket);
        return socket;
      },
      onState: (state) => track.states.push(state),
      resync,
      onEvent: async (event) => {
        track.events.push(event);
        if (event.aggregateType === 'ROOM') {
          track.incoming = await actor.api.incoming(signal);
          try {
            remember('ROOM', await actor.api.room(event.aggregateId, signal));
          } catch (error) {
            if (error.status !== 404 && error.status !== 403) throw error;
          }
        } else remember('SESSION', await game.snapshot(event.aggregateId, signal));
      },
      snapshotSequence: (event) =>
        track.snapshots.get(event.aggregateType + ':' + event.aggregateId)?.sequence ?? 0,
    });
    connections.push(track.client);
    track.client.start();
    return track;
  }
  if ((await a.api.active(signal)) || (await b.api.active(signal))) {
    console.log('SKIPPED: demo accounts already have an active room; existing state preserved.');
  } else {
    const liveA = connect(a),
      liveB = connect(b);
    await until(
      () => liveA.states.at(-1) === 'live' && liveB.states.at(-1) === 'live',
      'two authenticated WebSocket clients',
    );
    const groups = await a.api.groups(signal),
      catalog = createCatalogApi(a.client),
      puzzles = await catalog.puzzles(),
      subjects = await catalog.subjects(5);
    const invitationSelection = {
      groupId: groups[0].id,
      puzzleId: puzzles[0].id,
      subjectId: subjects.find((s) => s.playable).id,
      gradeLevel: 5,
      topicId: null,
    };
    const rejected = await a.api.invite({
      clientRequestId: randomUUID(),
      selection: invitationSelection,
      inviteeExternalUserId: b.me.externalUserId,
    });
    created = rejected;
    await until(
      () => liveB.incoming?.some((item) => item.id === rejected.id),
      'incoming invitation event',
    );
    assert((await b.api.incoming(signal)).some((i) => i.id === rejected.id));
    await b.api.reject(rejected.id);
    assert.equal((await a.api.room(rejected.roomId, signal)).status, 'CANCELLED');
    const cancelled = await a.api.invite({
      clientRequestId: randomUUID(),
      selection: invitationSelection,
      inviteeExternalUserId: b.me.externalUserId,
    });
    created = cancelled;
    await a.api.cancel(cancelled.id);
    assert(!(await b.api.incoming(signal)).some((i) => i.id === cancelled.id));
    const room = await a.api.createRoom({
      clientRequestId: randomUUID(),
      selection: {
        groupId: groups[0].id,
        puzzleId: puzzles[0].id,
        subjectId: subjects.find((s) => s.playable).id,
        gradeLevel: 5,
        topicId: null,
      },
    });
    created = { roomId: room.id, id: room.id };
    assert.match(room.joinCode, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    assert.equal((await a.api.room(room.id, signal)).joinCode, room.joinCode);
    const guest = await b.api.joinRoom(room.joinCode.toLowerCase());
    assert.equal(guest.id, room.id);
    assert.equal(guest.status, 'FULL');
    assert.equal(guest.joinCode, null);
    await a.api.ready(room.id, true);
    assert.equal((await b.api.ready(room.id, true)).readyToStart, true);
    assert.equal((await a.api.active(signal)).id, room.id);
    const gameA = createGameApi(a.client),
      gameB = createGameApi(b.client);
    let current = await gameA.start(room.id);
    assert.equal((await gameB.active(signal)).id, current.id);
    for (let roundNo = 1; roundNo <= 10; roundNo++) {
      assert.equal(current.currentRoundNo, roundNo);
      assert.equal(current.round.correctOptionKey, null);
      assert.equal((await gameB.snapshot(current.id, signal)).round.id, current.round.id);
      const roundId = current.round.id,
        optionKey = current.round.question.options[0].key;
      await gameA.answer(current.id, roundId, { clientRequestId: randomUUID(), optionKey });
      if (roundNo === 1) liveB.sockets.at(-1).close();
      if (roundNo === 2) {
        await until(
          () =>
            liveA.snapshots.get('SESSION:' + current.id)?.currentRoundNo === roundNo &&
            liveA.snapshots.get('SESSION:' + current.id)?.round.status === 'REVEAL',
          'server timeout reveal',
          45000,
        );
        current = await gameB.snapshot(current.id, signal);
        assert(current.round.answers.some((answer) => answer.source === 'TIMEOUT'));
      } else {
        current = await gameB.answer(current.id, roundId, {
          clientRequestId: randomUUID(),
          optionKey,
        });
      }
      assert.equal(current.round.status, 'REVEAL');
      assert.equal(current.round.answers.length, 2);
      if (roundNo === 1) {
        await until(
          () => liveB.resyncs >= 2 && liveB.states.at(-1) === 'live',
          'automatic reconnect',
        );
        await until(
          () => liveB.snapshots.get('SESSION:' + current.id)?.sequence >= current.sequence,
          'REST state recovered after missed reveal',
        );
        assert(liveB.states.includes('reconnecting'));
      }
      await gameA.next(current.id, roundNo);
      current = await gameB.next(current.id, roundNo);
    }
    assert.equal(current.status, 'COMPLETED');
    created = null;
    await until(
      () =>
        liveA.events.some((e) => e.aggregateType === 'SESSION') &&
        liveB.events.some((e) => e.aggregateType === 'SESSION'),
      'session events delivered to both users',
    );
    const resultA = await createProgressApi(a.client).result(current.id, signal),
      resultB = await createProgressApi(b.client).result(current.id, signal);
    assert.deepEqual(resultA, resultB);
    assert.equal(await gameA.active(signal), null);
    assert.equal(await gameB.active(signal), null);
    console.log(
      'PASS: two isolated authenticated WebSockets, code room/join, invitation reject/cancel, 10 shared rounds, 19 submissions + server timeout, forced disconnect, automatic reconnect + REST resync, events on both clients, matching final rewards.',
    );
  }
} finally {
  connections.forEach((client) => client.stop());
  if (created && apiA) {
    try {
      await apiA.leave(created.roomId);
    } catch {
      try {
        await apiA.cancel(created.id);
      } catch {
        console.error('Cleanup failed for smoke room ' + created.roomId);
      }
    }
  }
  await vite.close();
}
