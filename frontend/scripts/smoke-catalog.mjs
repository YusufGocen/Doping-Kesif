import assert from 'node:assert/strict';
import { createServer } from 'vite';

const baseUrl = process.env.KESIF_SMOKE_API ?? 'http://127.0.0.1:5173/api/v1/kesif';
assert(
  ['localhost', '127.0.0.1'].includes(new URL(baseUrl).hostname),
  'Smoke checks must target a local development server',
);
const vite = await createServer({
  cacheDir: 'node_modules/.vite/smoke',
  server: { middlewareMode: true, hmr: false },
  logLevel: 'error',
});
try {
  // Load the application's real transport and DTO schemas, rather than duplicate contracts.
  const { createApiClient } = await vite.ssrLoadModule('/src/shared/api/client.ts');
  const { createCatalogApi } = await vite.ssrLoadModule('/src/features/catalog/api/catalogApi.ts');
  const { demoUsersSchema, tokenSchema, meSchema } = await vite.ssrLoadModule(
    '/src/features/auth/model/schemas.ts',
  );
  const anonymous = createApiClient({ baseUrl });
  const users = await anonymous.request('/dev/auth/users', demoUsersSchema);
  assert(users.length >= 2);
  const counts = [];
  for (const userKey of ['yusuf', 'ayse']) {
    const token = await anonymous.request('/dev/auth/token', tokenSchema, {
      method: 'POST',
      body: { userKey },
    });
    const client = createApiClient({ baseUrl, getAccessToken: () => token.accessToken });
    const me = await client.request('/me', meSchema);
    assert.equal(me.externalUserId, `local:${userKey}`);
    const catalog = createCatalogApi(client);
    const grades = await catalog.grades();
    assert.deepEqual(
      grades.map((item) => item.gradeLevel),
      [5, 6, 7, 8],
    );
    const puzzles = await catalog.puzzles();
    assert.equal(puzzles.length, 4);
    let subjectCount = 0,
      topicCount = 0;
    for (const grade of grades) {
      assert.equal(grade.playable, true);
      const subjects = await catalog.subjects(grade.gradeLevel);
      assert.equal(subjects.length, 8);
      subjectCount += subjects.length;
      for (const subject of subjects) {
        assert.equal(subject.playable, true);
        const topics = await catalog.topics(grade.gradeLevel, subject.id);
        assert(topics.length >= 1);
        assert(topics.every((topic) => topic.playable && topic.availableQuestionCount >= 10));
        topicCount += topics.length;
      }
    }
    counts.push({
      userKey,
      grades: grades.length,
      puzzles: puzzles.length,
      subjectSelections: subjectCount,
      topics: topicCount,
    });
  }
  await assert.rejects(
    anonymous.request('/catalog/grades', { parse: (data) => data }),
    (error) => error.status === 401,
  );
  console.log(
    JSON.stringify(
      { status: 'PASS', transport: 'real HTTP through Vite proxy', accounts: counts },
      null,
      2,
    ),
  );
} finally {
  await vite.close();
}
