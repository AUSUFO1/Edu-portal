export type ErrorCode = 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION' | 'CONFLICT' | 'RATE_LIMITED';

/**
 * An expected failure with a message that is safe to show the user.
 * Anything that is not an AppError is treated as an internal error and never shown verbatim.
 */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const forbidden = (message = 'You do not have permission to do that.') => new AppError('FORBIDDEN', message);
export const notFound = (what = 'Record') => new AppError('NOT_FOUND', `${what} not found.`);
export const conflict = (message: string) => new AppError('CONFLICT', message);
export const invalid = (message: string, fieldErrors?: Record<string, string>) => new AppError('VALIDATION', message, fieldErrors);
