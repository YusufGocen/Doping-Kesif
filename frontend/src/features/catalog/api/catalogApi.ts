import type { ApiClient } from '@/shared/api/client';
import {
  gradesSchema,
  subjectsSchema,
  topicsSchema,
  puzzlesSchema,
  puzzleProgressSchema,
} from '../model/schemas';

export const createCatalogApi = (client: ApiClient) => ({
  puzzleProgress: (signal?: AbortSignal) =>
    client.request('/collections?filter=ALL&page=0&size=100', puzzleProgressSchema, { signal }),
  grades: (signal?: AbortSignal) => client.request('/catalog/grades', gradesSchema, { signal }),
  subjects: (grade: number, signal?: AbortSignal) =>
    client.request(`/catalog/subjects?grade=${grade}`, subjectsSchema, { signal }),
  topics: (grade: number, subjectId: string, signal?: AbortSignal) =>
    client.request(
      `/catalog/topics?${new URLSearchParams({ grade: String(grade), subjectId })}`,
      topicsSchema,
      { signal },
    ),
  puzzles: (signal?: AbortSignal) => client.request('/puzzles', puzzlesSchema, { signal }),
});
