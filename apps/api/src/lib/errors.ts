/**
 * Canonical API error codes.
 *
 * All error responses include both a human-readable `error` string and a
 * machine-readable `code` field so clients can branch on the code without
 * parsing strings.
 *
 * Format: { error: string; code: ErrorCode }
 */
export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'INVALID_SESSION'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'INVALID_PARAM'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

export interface ApiError {
  error: string;
  code: ErrorCode;
}

export function apiError(code: ErrorCode, message: string): ApiError {
  return { error: message, code };
}

// Pre-built common responses
export const Errors = {
  authRequired: () => apiError('AUTH_REQUIRED', 'Authentication required.'),
  invalidSession: () =>
    apiError('INVALID_SESSION', 'Invalid or expired session.'),
  forbidden: () => apiError('FORBIDDEN', 'Forbidden.'),
  notFound: (resource = 'Resource') =>
    apiError('NOT_FOUND', `${resource} not found.`),
  conflict: (msg: string) => apiError('CONFLICT', msg),
  validation: (msg: string) => apiError('VALIDATION_ERROR', msg),
  invalidParam: (name: string) => apiError('INVALID_PARAM', `Invalid ${name}.`),
  internal: () => apiError('INTERNAL_ERROR', 'Internal server error.'),
  unavailable: (reason: string) => apiError('SERVICE_UNAVAILABLE', reason),
} as const;
