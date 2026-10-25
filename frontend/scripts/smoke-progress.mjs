import assert from 'node:assert/strict';
import { createServer } from 'vite';
const vite = await createServer({
  cacheDir: 'node_modules/.vite/smoke',
  server: { middlewareMode: true, hmr: false },
  logLevel: 'error',
});
try {
  const { createApiClient } = await vite.ssrLoadModule('/src/shared/api/client.ts');
  const { createProgressApi } = await vite.ssrLoadModule(
    '/src/features/progress/api/progressApi.ts',
  );
  const { tokenSchema, meSchema } = await vite.ssrLoadModule('/src/features/auth/model/schemas.ts');
  const baseUrl = 'http://127.0.0.1:5173/api/v1/kesif';
  const anon = createApiClient({ baseUrl });
  const signal = new AbortController().signal;
  for (const userKey of ['mert', 'zeynep']) {
    const token = await anon.request('/dev/auth/token', tokenSchema, {
      method: 'POST',
      body: { userKey },
    });
    const client = createApiClient({ baseUrl, getAccessToken: () => token.accessToken });
    const me = await client.request('/me', meSchema);
    const api = createProgressApi(client);
    const before = await api.progress(signal);
    const collections = await api.collections('ALL', 0, signal);
    await api.collections('IN_PROGRESS', 0, signal);
    await api.collections('COMPLETED', 0, signal);
    const history = await api.history(0, signal);
    assert(history.items.length > 0, 'A completed fixture game is required');
    const game = history.items[0];
    const result = await api.result(game.sessionId, signal);
    const own = result.players.find((p) => p.playerId === me.id);
    assert(own);
    assert.equal(own.earnedXp, game.earnedXp);
    assert.equal(own.correctCount, game.correctCount);
    assert.equal(own.collectionAddedCount, game.collectionAddedCount);
    const detail = await api.detail(game.puzzleId, signal);
    assert.equal(detail.pieces.length, detail.collection.unlockedCount);
    const pieces = await api.pieces(game.sessionId, signal);
    assert.equal(pieces.revealedPieces.length, result.revealedCount);
    await api.result(game.sessionId, signal);
    assert.deepEqual(await api.progress(signal), before);
    console.log(
      'PASS: ' +
        userKey +
        ' result/history XP match; session vs collection pieces; filters; repeat GET does not change progress. ' +
        collections.total +
        ' collection entries.',
    );
  }
} finally {
  await vite.close();
}
