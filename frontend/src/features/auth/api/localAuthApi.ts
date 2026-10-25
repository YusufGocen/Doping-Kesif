import { createApiClient } from '@/shared/api/client';
import type { ApiClient } from '@/shared/api/client';
import { env } from '@/shared/config/env';
import { demoUsersSchema, meSchema, tokenSchema } from '../model/schemas';

export const createLocalAuthApi = (client: ApiClient) => ({
  users: (signal?: AbortSignal) => client.request('/dev/auth/users', demoUsersSchema, { signal }),
  login: async (userKey: string, signal: AbortSignal) => {
    const token = await client.request('/dev/auth/token', tokenSchema, {
      method: 'POST',
      body: { userKey },
      signal,
    });
    // Verify the trusted backend profile before publishing the new session to the application.
    const authenticated = createApiClient({
      baseUrl: env.apiBaseUrl,
      getAccessToken: () => token.accessToken,
    });
    const user = await authenticated.request('/me', meSchema, { signal });
    return { accessToken: token.accessToken, expiresAt: token.expiresAt, user };
  },
});
