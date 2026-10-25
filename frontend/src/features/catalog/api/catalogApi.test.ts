import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from '@/shared/api/client';
import { createCatalogApi } from './catalogApi';
import { catalogQueries } from './queries';

describe('catalogue API boundary', () => {
  it('uses the existing backend route and encodes filters', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('[]', { status: 200 }));
    const client = createApiClient({ baseUrl: '/api/v1/kesif', fetcher });
    await createCatalogApi(client).topics(5, 'subject & other');
    expect(fetcher.mock.calls[0][0]).toBe(
      '/api/v1/kesif/catalog/topics?grade=5&subjectId=subject+%26+other',
    );
  });
  it('rejects invalid catalogue data before it can reach a page', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('[{"gradeLevel":9,"playable":true}]', { status: 200 }));
    await expect(
      createCatalogApi(createApiClient({ baseUrl: '/api', fetcher })).grades(),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
  it('separates cached queries by grade and subject', () => {
    const queries = catalogQueries(createApiClient({ baseUrl: '/api' }));
    expect(queries.subjects(5).queryKey).not.toEqual(queries.subjects(8).queryKey);
    expect(queries.topics(5, 'math').queryKey).not.toEqual(queries.topics(5, 'science').queryKey);
  });
});
