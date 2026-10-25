import { ApiError } from './ApiError';

export interface ResponseSchema<T> {
  parse(value: unknown): T;
}
export interface RequestOptions extends Omit<RequestInit, 'body' | 'credentials' | 'headers'> {
  body?: unknown;
  signal?: AbortSignal;
}
export interface ApiClient {
  request<T>(path: string, schema: ResponseSchema<T>, options?: RequestOptions): Promise<T>;
}
export interface ApiClientOptions {
  baseUrl: string;
  fetcher?: typeof fetch;
  getAccessToken?: () => string | null;
  onUnauthorized?: (accessToken: string | null) => void;
  timeoutMs?: number;
}

export function createApiClient({
  baseUrl,
  fetcher = fetch,
  getAccessToken = () => null,
  onUnauthorized,
  timeoutMs = 15000,
}: ApiClientOptions): ApiClient {
  return {
    async request<T>(
      path: string,
      schema: ResponseSchema<T>,
      options: RequestOptions = {},
    ): Promise<T> {
      // Feature services can only call paths within the configured API. Prevent token forwarding to other origins.
      let decodedPath: string;
      try {
        decodedPath = decodeURIComponent(path.split('?')[0]);
      } catch {
        throw new ApiError(0, 'INVALID_PATH');
      }
      if (
        !path.startsWith('/') ||
        decodedPath.startsWith('//') ||
        /[\\#\r\n]/.test(decodedPath) ||
        decodedPath.split('/').includes('..') ||
        path.includes('#')
      ) {
        throw new ApiError(0, 'INVALID_PATH');
      }
      const controller = new AbortController();
      const abort = () => controller.abort();
      options.signal?.addEventListener('abort', abort, { once: true });
      if (options.signal?.aborted) controller.abort();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (options.body !== undefined) headers['Content-Type'] = 'application/json';
      try {
        const token = getAccessToken();
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetcher(baseUrl + path, {
          ...options,
          headers,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          credentials: 'omit',
          redirect: 'error',
          signal: controller.signal,
        });
        if (!response.ok) {
          let code = 'HTTP_ERROR';
          try {
            const problem: unknown = await response.json();
            if (
              problem &&
              typeof problem === 'object' &&
              'code' in problem &&
              typeof problem.code === 'string' &&
              /^[A-Z0-9_]{1,80}$/.test(problem.code)
            )
              code = problem.code;
          } catch {
            /* HTML/proxy errors use a safe generic message. */
          }
          if (response.status === 401) onUnauthorized?.(token);
          throw new ApiError(
            response.status,
            code,
            response.status === 401 ? 'Oturumun sona erdi. Lütfen tekrar giriş yap.' : undefined,
          );
        }
        let data: unknown;
        try {
          data = response.status === 204 ? undefined : await response.json();
        } catch (error) {
          if (controller.signal.aborted) throw error;
          throw new ApiError(response.status, 'INVALID_RESPONSE');
        }
        try {
          return schema.parse(data);
        } catch {
          throw new ApiError(response.status, 'INVALID_RESPONSE');
        }
      } catch (error) {
        if (error instanceof ApiError) throw error;
        if (controller.signal.aborted) throw new ApiError(0, timedOut ? 'TIMEOUT' : 'ABORTED');
        throw new ApiError(0, 'NETWORK_ERROR');
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', abort);
      }
    },
  };
}
