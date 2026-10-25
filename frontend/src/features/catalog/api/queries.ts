import { queryOptions } from '@tanstack/react-query';
import type { ApiClient } from '@/shared/api/client';
import { createCatalogApi } from './catalogApi';

/** Query keys include every selection parameter to prevent cross-grade cache contamination. */
export const catalogQueries = (client: ApiClient) => {
  const api = createCatalogApi(client);
  return {
    puzzleProgress: () =>
      queryOptions({
        queryKey: ['catalog', 'puzzle-progress'] as const,
        queryFn: ({ signal }) => api.puzzleProgress(signal),
      }),
    grades: () =>
      queryOptions({
        queryKey: ['catalog', 'grades'] as const,
        queryFn: ({ signal }) => api.grades(signal),
      }),
    subjects: (grade: number) =>
      queryOptions({
        queryKey: ['catalog', 'subjects', grade] as const,
        queryFn: ({ signal }) => api.subjects(grade, signal),
      }),
    topics: (grade: number, subjectId: string) =>
      queryOptions({
        queryKey: ['catalog', 'topics', grade, subjectId] as const,
        queryFn: ({ signal }) => api.topics(grade, subjectId, signal),
      }),
    puzzles: () =>
      queryOptions({
        queryKey: ['catalog', 'puzzles'] as const,
        queryFn: ({ signal }) => api.puzzles(signal),
      }),
  };
};
