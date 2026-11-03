import type { Instrumentation } from 'next';

/** Logs server rendering errors with their root cause (e.g. the database error), so logs are actionable. */
export const onRequestError: Instrumentation.onRequestError = async (error, request) => {
  const messages: string[] = [];
  let current: unknown = error;
  for (let i = 0; i < 4 && current; i++) {
    messages.push(current instanceof Error ? current.message : String(current));
    current = (current as { cause?: unknown }).cause;
  }
  console.error(`[request] ${request.method} ${request.path}: ${messages.join(' <- caused by: ')}`);
};
