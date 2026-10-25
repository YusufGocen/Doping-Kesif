import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'vite';
const expectedRoom = process.argv[2];
assert(/^[0-9a-f-]{36}$/.test(expectedRoom ?? ''), 'Explicit smoke room UUID required');
const vite = await createServer({
  cacheDir: 'node_modules/.vite/smoke',
  server: { middlewareMode: true, hmr: false },
  logLevel: 'error',
});
try {
  const { createApiClient } = await vite.ssrLoadModule('/src/shared/api/client.ts');
  const { createGameApi } = await vite.ssrLoadModule('/src/features/game/api/gameApi.ts');
  const { tokenSchema, meSchema } = await vite.ssrLoadModule('/src/features/auth/model/schemas.ts');
  const baseUrl = 'http://127.0.0.1:5173/api/v1/kesif',
    anon = createApiClient({ baseUrl });
  async function login(userKey) {
    const token = await anon.request('/dev/auth/token', tokenSchema, {
      method: 'POST',
      body: { userKey },
    });
    const client = createApiClient({ baseUrl, getAccessToken: () => token.accessToken });
    return { api: createGameApi(client), me: await client.request('/me', meSchema) };
  }
  const a = await login('mert'),
    b = await login('zeynep'),
    signal = new AbortController().signal;
  let game = await a.api.active(signal);
  if (!game) {
    console.log('No active smoke game remains.');
  } else {
    assert.equal(game.roomId, expectedRoom, 'Refusing to change another room');
    for (let step = 0; step < 30 && game.status === 'IN_PROGRESS'; step++) {
      game = await a.api.snapshot(game.id, signal);
      if (game.round.status === 'QUESTION_OPEN') {
        const optionKey = game.round.question.options[0].key;
        if (!game.players.find((p) => p.playerId === a.me.id)?.answered)
          game = await a.api.answer(game.id, game.round.id, {
            clientRequestId: randomUUID(),
            optionKey,
          });
        if (
          game.round.status === 'QUESTION_OPEN' &&
          !game.players.find((p) => p.playerId === b.me.id)?.answered
        )
          game = await b.api.answer(game.id, game.round.id, {
            clientRequestId: randomUUID(),
            optionKey,
          });
      }
      if (game.round.status === 'REVEAL') {
        const n = game.round.roundNo;
        await a.api.next(game.id, n);
        game = await b.api.next(game.id, n);
      }
    }
    assert.equal(game.status, 'COMPLETED');
    console.log('Owned smoke game completed; reservation released.');
  }
} finally {
  await vite.close();
}
