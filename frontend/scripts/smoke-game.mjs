import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'vite';
const vite = await createServer({
  cacheDir: 'node_modules/.vite/smoke',
  server: { middlewareMode: true, hmr: false },
  logLevel: 'error',
});
let apiA, created;
try {
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
    return { client, api: createSocialApi(client), me: await client.request('/me', meSchema) };
  }
  const a = await account('mert'),
    b = await account('zeynep');
  apiA = a.api;
  const signal = new AbortController().signal;
  if ((await a.api.active(signal)) || (await b.api.active(signal))) {
    console.log('SKIPPED: demo accounts already have an active room; existing state preserved.');
  } else {
    const groups = await a.api.groups(signal),
      catalog = createCatalogApi(a.client),
      puzzles = await catalog.puzzles(),
      subjects = await catalog.subjects(5);
    const invitation = await a.api.invite({
      clientRequestId: randomUUID(),
      selection: {
        groupId: groups[0].id,
        puzzleId: puzzles[0].id,
        subjectId: subjects.find((s) => s.playable).id,
        gradeLevel: 5,
        topicId: null,
      },
      inviteeExternalUserId: b.me.externalUserId,
    });
    created = invitation;
    assert((await b.api.incoming(signal)).some((i) => i.id === invitation.id));
    const room = await b.api.accept(invitation.id);
    assert.equal(room.status, 'FULL');
    assert.equal((await a.api.room(room.id, signal)).players.length, 2);
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
      current = await gameB.answer(current.id, roundId, {
        clientRequestId: randomUUID(),
        optionKey,
      });
      assert.equal(current.round.status, 'REVEAL');
      assert.equal(current.round.answers.length, 2);
      await gameA.next(current.id, roundNo);
      current = await gameB.next(current.id, roundNo);
    }
    assert.equal(current.status, 'COMPLETED');
    created = null;
    assert.equal(await gameA.active(signal), null);
    assert.equal(await gameB.active(signal), null);
    console.log(
      'PASS: two real identities: invite, accept, ready, start, same 10 rounds, 20 answers, reveal, continue, completion, no remaining active game.',
    );
  }
} finally {
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
