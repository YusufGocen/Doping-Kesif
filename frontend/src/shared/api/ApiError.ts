export type ApiErrorCode =
  'HTTP_ERROR' | 'NETWORK_ERROR' | 'TIMEOUT' | 'ABORTED' | 'INVALID_RESPONSE' | string;

/** Deliberately excludes raw response bodies, URLs containing parameters, and credentials. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  constructor(
    status: number,
    code: ApiErrorCode,
    message = 'İşlem tamamlanamadı. Lütfen tekrar dene.',
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}
