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
    assert.equal((await a.api.leave(room.id)).status, 'CANCELLED');
    created = null;
    assert.equal(await b.api.active(signal), null);
    console.log(
      'PASS: two real backend identities: invite → incoming → accept → shared room → both ready → active recovery → leave.',
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
