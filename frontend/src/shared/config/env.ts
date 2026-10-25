/** Vite variables are public build-time configuration, never secrets or access tokens. */
export function resolveApiBase(value: string | undefined): string {
  const base = (value ?? '/api/v1/kesif').trim().replace(/\/+$/, '');
  if (
    !base ||
    (!base.startsWith('/') && !/^https?:\/\//.test(base)) ||
    base.startsWith('//') ||
    /[?#]/.test(base)
  ) {
    throw new Error('Invalid VITE_API_BASE_URL');
  }
  if (base.startsWith('http')) {
    const url = new URL(base);
    if (url.username || url.password)
      throw new Error('Credentials must not appear in VITE_API_BASE_URL');
  }
  return base;
}
export const env = Object.freeze({
  realtimeEnabled: import.meta.env.VITE_ENABLE_REALTIME !== 'false',
  apiBaseUrl: resolveApiBase(import.meta.env.VITE_API_BASE_URL),
  localAuthEnabled: import.meta.env.DEV && import.meta.env.VITE_ENABLE_LOCAL_AUTH !== 'false',
});
